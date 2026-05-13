import React, { useEffect, useRef, useState } from "react";
import "./MusicPlayer.css";
import bunnyGirl from "../assets/audio/BunnyGirl.mp4";
import bunnyGirlCover from "../assets/images/BunnyGirlCover.jpg";
import bunnySprite from "../assets/images/BunnyGirl_Animation.png";
import { SILENT_AUDIO_METRICS } from "./audioTypes";
import type { AudioMetrics } from "./audioTypes";

type MusicPlayerProps = {
  onAudioMetricsChange?: (metrics: AudioMetrics) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
};

const formatTime = (time: number) =>
  new Date((time || 0) * 1000).toISOString().substr(14, 5);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function smoothMetric(current: number, target: number, attack: number, release: number) {
  const amount = target > current ? attack : release;
  return current + (target - current) * amount;
}

function averageFrequencyRange(
  frequencyData: Uint8Array<ArrayBuffer>,
  analyser: AnalyserNode,
  sampleRate: number,
  startFrequency: number,
  endFrequency: number
) {
  const hzPerBin = sampleRate / analyser.fftSize;
  const startBin = Math.max(0, Math.floor(startFrequency / hzPerBin));
  const endBin = Math.min(
    frequencyData.length - 1,
    Math.max(startBin + 1, Math.ceil(endFrequency / hzPerBin))
  );

  let total = 0;
  let bins = 0;

  for (let i = startBin; i <= endBin; i++) {
    total += frequencyData[i];
    bins++;
  }

  return bins ? total / bins : 0;
}

function normalizeFrequencyValue(value: number, noiseFloor: number, ceiling: number) {
  return clamp01((value - noiseFloor) / (ceiling - noiseFloor));
}

function getRmsVolume(timeData: Uint8Array<ArrayBuffer>) {
  let sum = 0;

  for (let i = 0; i < timeData.length; i++) {
    const centeredSample = (timeData[i] - 128) / 128;
    sum += centeredSample * centeredSample;
  }

  return clamp01(Math.sqrt(sum / timeData.length) * 3.1);
}

function MusicPlayer({ onAudioMetricsChange, onPlayStateChange }: MusicPlayerProps) {
  type BunnyState = "idle" | "transition" | "running";
  const [bunnyState, setBunnyState] = useState<BunnyState>("idle");
  const bunnyTimerRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const smoothedMetricsRef = useRef<AudioMetrics>({ ...SILENT_AUDIO_METRICS });
  const bassFastRef = useRef(0);
  const bassSlowRef = useRef(0);
  const previousBassLevelRef = useRef(0);
  const beatHoldRef = useRef(0);

  const clearBunnyTimer = () => {
    if (bunnyTimerRef.current) {
      window.clearTimeout(bunnyTimerRef.current);
      bunnyTimerRef.current = null;
    }
  };

  const startBunnyRun = () => {
    clearBunnyTimer();
    setBunnyState("transition");

    bunnyTimerRef.current = window.setTimeout(() => {
      setBunnyState("running");
    }, 180);
  };

  const stopBunnyRun = () => {
    clearBunnyTimer();
    setBunnyState("transition");

    bunnyTimerRef.current = window.setTimeout(() => {
      setBunnyState("idle");
    }, 180);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;

    const trackDuration = audioRef.current.duration;

    if (Number.isFinite(trackDuration)) {
      setDuration(trackDuration);
    }
  };
  
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;

    const newTime = Number(event.target.value);

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const setupAudioAnalyzer = () => {
    const audio = audioRef.current;
    if (!audio) return false;

    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextClass) {
        console.error("Web Audio API is not supported in this browser.");
        return false;
      }

      audioContextRef.current = new AudioContextClass();
    }

    const audioContext = audioContextRef.current;

    if (!sourceRef.current) {
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.58;

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      sourceRef.current = source;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDataRef.current = new Uint8Array(analyser.fftSize);
    }

    return true;
  };

  const resetAudioAnalysisState = () => {
    smoothedMetricsRef.current = { ...SILENT_AUDIO_METRICS };
    bassFastRef.current = 0;
    bassSlowRef.current = 0;
    previousBassLevelRef.current = 0;
    beatHoldRef.current = 0;
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    resetAudioAnalysisState();
    onAudioMetricsChange?.(SILENT_AUDIO_METRICS);
  };

  const startAudioAnalysis = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const analyze = () => {
      const analyser = analyserRef.current;
      const frequencyData = frequencyDataRef.current;
      const timeData = timeDataRef.current;
      const audioContext = audioContextRef.current;

      if (!analyser || !frequencyData || !timeData || !audioContext) return;

      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeData);

      const bassAverage = averageFrequencyRange(
        frequencyData,
        analyser,
        audioContext.sampleRate,
        35,
        180
      );
      const midAverage = averageFrequencyRange(
        frequencyData,
        analyser,
        audioContext.sampleRate,
        180,
        2400
      );
      const trebleAverage = averageFrequencyRange(
        frequencyData,
        analyser,
        audioContext.sampleRate,
        2400,
        10000
      );

      const bassLevel = normalizeFrequencyValue(bassAverage, 18, 220);
      const midLevel = normalizeFrequencyValue(midAverage, 16, 205);
      const trebleLevel = normalizeFrequencyValue(trebleAverage, 14, 185);
      const volumeLevel = getRmsVolume(timeData);

      bassFastRef.current += (bassLevel - bassFastRef.current) * 0.5;
      bassSlowRef.current += (bassLevel - bassSlowRef.current) * 0.055;

      const bassLift = Math.max(0, bassFastRef.current - bassSlowRef.current);
      const bassJump = Math.max(0, bassLevel - previousBassLevelRef.current);
      previousBassLevelRef.current =
        previousBassLevelRef.current * 0.35 + bassLevel * 0.65;

      const beatImpulse = clamp01(bassLift * 4.2 + bassJump * 2.6 - 0.08);
      beatHoldRef.current = Math.max(beatImpulse, beatHoldRef.current * 0.76);

      const current = smoothedMetricsRef.current;
      const nextMetrics: AudioMetrics = {
        volume: smoothMetric(current.volume, volumeLevel, 0.44, 0.18),
        bass: smoothMetric(current.bass, bassLevel, 0.58, 0.2),
        mid: smoothMetric(current.mid, midLevel, 0.32, 0.16),
        treble: smoothMetric(current.treble, trebleLevel, 0.38, 0.18),
        beat: Math.max(beatHoldRef.current, current.beat * 0.72),
      };

      smoothedMetricsRef.current = nextMetrics;
      onAudioMetricsChange?.(nextMetrics);

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
      stopAudioAnalysis();
      stopBunnyRun();
      return;
    }

    const analyzerReady = setupAudioAnalyzer();
    if (!analyzerReady) return;

    try {
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      await audio.play();

      setIsPlaying(true);
      onPlayStateChange?.(true);
      startAudioAnalysis();
      startBunnyRun();
    } catch (error) {
      console.error("Audio could not play:", error);
      setIsPlaying(false);
      onPlayStateChange?.(false);
      stopAudioAnalysis();
      stopBunnyRun();
    }
  };

  useEffect(() => {
    return () => {
      if (bunnyTimerRef.current) {
        window.clearTimeout(bunnyTimerRef.current);
      }

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src={bunnyGirl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          clearBunnyTimer();
          setIsPlaying(false);
          setBunnyState("idle");
          onPlayStateChange?.(false);
          stopAudioAnalysis();
        }}
      />

      <div className="music-details">
        <img
          src={bunnyGirlCover}
          alt="Bunny Girl"
          className="image-cover"
        />
        <h1 className="cover-title">BunnyGirl</h1>
        <p className="cover-artist">AKASAKI</p>
      </div>

      <div className="slider-wrapper">
        <input 
          type="range" 
          className="seek-slider slider" 
          min="0"
          max={duration || 0} 
          value={currentTime} 
          onChange={handleSeek}
          style={
            {
              "--progress": `${duration ? (currentTime / duration) * 100 : 0}%`,
            } as React.CSSProperties
          }
        />
        <span
          className={`bunny-thumb bunny-thumb--${bunnyState}`}
          style={
            {
              "--progress": `${duration ? (currentTime / duration) * 100 : 0}%`,
              "--bunny-sprite": `url(${bunnySprite})`,
            } as React.CSSProperties
          }
        />
        <span className="duration time">
          {formatTime(duration)}
        </span>
      </div>

      <div className="controls-wrapper">
        <button className="player-button" onClick={togglePlay}>
          <span className={isPlaying ? "pause-icon" : "play-icon"}></span>
        </button>
      </div>
    </div>
  );
}

export default MusicPlayer;
