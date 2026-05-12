import React, { useRef, useState } from "react";
import "./MusicPlayer.css";
import bunnyGirl from "../assets/audio/BunnyGirl.mp4";
import bunnyGirlCover from "../assets/images/BunnyGirlCover.jpg";
import bunnySprite from "../assets/images/BunnyGirl_Animation.png";

const formatTime = (time: number) =>
  new Date((time || 0) * 1000).toISOString().substr(14, 5);

function MusicPlayer() {
  type BunnyState = "idle" | "transition" | "running";
  const [bunnyState, setBunnyState] = useState<BunnyState>("idle");
  const bunnyTimerRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      stopBunnyRun();
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      startBunnyRun();
    }
  };

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
