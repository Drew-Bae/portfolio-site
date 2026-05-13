import { useEffect, useRef } from "react";
import "./Menu.css";

type AudioBlobProps = {
  level: number;
  isPlaying: boolean;
};

function AudioBlob({ level, isPlaying }: AudioBlobProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const levelRef = useRef(level);
  const isPlayingRef = useRef(isPlaying);
  const smoothedLevelRef = useRef(0);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    function getMidPoint(
      pointA: { x: number; y: number },
      pointB: { x: number; y: number }
    ) {
      return {
        x: (pointA.x + pointB.x) / 2,
        y: (pointA.y + pointB.y) / 2,
      };
    }

    function createBlobPath(power: number, time: number, isActive: boolean) {
      const points = 36;
      const centerX = 100;
      const centerY = 100;
      const baseRadius = 54;

      // The blob still has a little life while active,
      // but most of the movement now comes from the audio power.
      const idleWobble = isActive ? 1.5 : 0.4;
      const reactiveWobble = idleWobble + power * 26;

      // Bigger number = more burst outward
      const audioExpansion = power * 28;

      // Power also affects speed so the blob feels more energetic on loud parts
      const speed = 0.0015 + power * 0.005;

      const coordinates = [];

      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;

        const fluidMovement =
          Math.sin(time * speed + i * 0.85) * reactiveWobble +
          Math.cos(time * speed * 0.7 + i * 1.7) * (reactiveWobble * 0.55);

        // Adds smoother local bursts around different parts of the blob
        const burstMovement =
          Math.max(0, Math.sin(time * 0.012 + i * 1.9)) * power * 10;

        const radius =
          baseRadius + audioExpansion + fluidMovement + burstMovement;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        coordinates.push({ x, y });
      }

      const firstPoint = coordinates[0];
      const lastPoint = coordinates[coordinates.length - 1];
      const startPoint = getMidPoint(lastPoint, firstPoint);

      let path = `M ${startPoint.x} ${startPoint.y}`;

      for (let i = 0; i < coordinates.length; i++) {
        const currentPoint = coordinates[i];
        const nextPoint = coordinates[(i + 1) % coordinates.length];
        const midPoint = getMidPoint(currentPoint, nextPoint);

        path += ` Q ${currentPoint.x} ${currentPoint.y} ${midPoint.x} ${midPoint.y}`;
      }

      path += " Z";

      return path;
    }

    function animate(time: number) {
      const isCurrentlyPlaying = isPlayingRef.current;

      const targetLevel = isCurrentlyPlaying ? levelRef.current : 0;

      // Less smoothing here because MusicPlayer is already smoothing.
      // This keeps the blob from feeling delayed.
      const smoothingAmount =
        targetLevel > smoothedLevelRef.current ? 0.85 : 0.12;

      smoothedLevelRef.current +=
        (targetLevel - smoothedLevelRef.current) * smoothingAmount;

      const newPath = createBlobPath(
        smoothedLevelRef.current,
        time,
        isCurrentlyPlaying
      );

      if (pathRef.current) {
        pathRef.current.setAttribute("d", newPath);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <svg className="audio-blob-svg" viewBox="0 0 200 200">
      <path ref={pathRef} className="audio-blob-path" />
    </svg>
  );
}

export default AudioBlob;