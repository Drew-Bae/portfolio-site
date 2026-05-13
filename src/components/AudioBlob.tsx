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
      const points = 32;
      const centerX = 100;
      const centerY = 100;
      const baseRadius = 56;

      // Small movement when active, stronger movement when the music level rises.
      const baseWobble = isActive ? 2 : 0.5;
      const reactiveWobble = baseWobble + power * 18;

      // How much the whole blob expands from the audio.
      const audioIntensity = 34;

      const coordinates = [];

      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;

        const organicMovement =
          Math.sin(time * 0.002 + i * 0.7) * reactiveWobble +
          Math.cos(time * 0.0015 + i * 1.3) * (reactiveWobble * 0.6);

        const audioMovement = power * audioIntensity;

        const radius = baseRadius + organicMovement + audioMovement;

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

      // Real audio only. No fakeLevel anymore.
      const targetLevel = isCurrentlyPlaying ? levelRef.current : 0;

      // Fast attack, slow release.
      // This makes the blob jump with beats but calm down smoothly.
      const smoothingAmount =
        targetLevel > smoothedLevelRef.current ? 0.35 : 0.08;

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