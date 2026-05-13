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

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;

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

      const bassRange = frequencyData.slice(0, 16);
      const bassAverage =
        bassRange.reduce((total, value) => total + value, 0) / bassRange.length;

      const targetLevel = bassAverage / 255;

      smoothedLevelRef.current +=
        (targetLevel - smoothedLevelRef.current) * 0.12;

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
