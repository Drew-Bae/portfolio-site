import React, { useEffect, useRef, useState } from "react";
import "./MusicPlayer.css";
import bunnyGirl from "../assets/audio/BunnyGirl.mp4";
import bunnyGirlCover from "../assets/images/BunnyGirlCover.jpg";
import bunnySprite from "../assets/images/BunnyGirl_Animation.png";

type MusicPlayerProps = {
  onAudioLevelChange?: (level: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
};

const formatTime = (time: number) =>
  new Date((time || 0) * 1000).toISOString().substr(14, 5);

function MusicPlayer({ onAudioLevelChange, onPlayStateChange }: MusicPlayerProps) {
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
  const smoothedLevelRef = useRef(0);
  const previousBassLevelRef = useRef(0);

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

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.12;

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      sourceRef.current = source;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    return true;
  };

  const stopAudioAnalysis = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    smoothedLevelRef.current = 0;
    onAudioLevelChange?.(0);
  };

  const startAudioAnalysis = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const analyze = () => {
      const analyser = analyserRef.current;
      const frequencyData = frequencyDataRef.current;

      if (!analyser || !frequencyData) return;

      analyser.getByteFrequencyData(frequencyData);

      // Bass range: main pulse/body of the song
      const bassStart = 2;
      const bassEnd = 28;

      let bassTotal = 0;

      for (let i = bassStart; i < bassEnd; i++) {
        bassTotal += frequencyData[i];
      }

      const bassAverage = bassTotal / (bassEnd - bassStart);

      // Mid range: adds extra movement so it does not only react to bass
      const midStart = 28;
      const midEnd = 90;

      let midTotal = 0;

      for (let i = midStart; i < midEnd; i++) {
        midTotal += frequencyData[i];
      }

      const midAverage = midTotal / (midEnd - midStart);

      // Normalize values to 0–1
      const noiseFloor = 18;

      const bassLevel = Math.max(
        0,
        (bassAverage - noiseFloor) / (255 - noiseFloor)
      );

      const midLevel = Math.max(
        0,
        (midAverage - noiseFloor) / (255 - noiseFloor)
      );

      // Detect sudden bass increases.
      // This creates the "bursty" feeling.
      const bassJump = Math.max(0, bassLevel - previousBassLevelRef.current);
      previousBassLevelRef.current = bassLevel;

      const burst = Math.min(1, bassJump * 7);

      // Shape the response:
      // bass = pulse
      // mids = fluid detail
      // burst = quick punch
      const targetLevel = Math.min(
        1,
        bassLevel * 1.4 + midLevel * 0.35 + burst * 1.2
      );

      // Fast attack, smoother release.
      // Higher attack = reacts faster to beats.
      // Lower release = relaxes more fluidly.
      const smoothingAmount =
        targetLevel > smoothedLevelRef.current ? 0.75 : 0.16;

      smoothedLevelRef.current +=
        (targetLevel - smoothedLevelRef.current) * smoothingAmount;

      onAudioLevelChange?.(smoothedLevelRef.current);

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
