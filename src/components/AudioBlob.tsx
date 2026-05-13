import { useEffect, useRef } from "react";
import "./Menu.css";
import type { AudioMetrics } from "./audioTypes";

type AudioBlobProps = {
  metrics: AudioMetrics;
  isPlaying: boolean;
};

type BlobPoint = {
  x: number;
  y: number;
};

const POINT_COUNT = 64;
const CENTER = 100;
const BASE_RADIUS = 50;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothValue(current: number, target: number, attack: number, release: number) {
  const amount = target > current ? attack : release;
  return current + (target - current) * amount;
}

function createSmoothClosedPath(points: BlobPoint[]) {
  const tension = 0.72;
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length; i++) {
    const previous = points[(i - 1 + points.length) % points.length];
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const nextNext = points[(i + 2) % points.length];

    const controlPointA = {
      x: current.x + ((next.x - previous.x) / 6) * tension,
      y: current.y + ((next.y - previous.y) / 6) * tension,
    };

    const controlPointB = {
      x: next.x - ((nextNext.x - current.x) / 6) * tension,
      y: next.y - ((nextNext.y - current.y) / 6) * tension,
    };

    path += ` C ${controlPointA.x.toFixed(2)} ${controlPointA.y.toFixed(
      2
    )}, ${controlPointB.x.toFixed(2)} ${controlPointB.y.toFixed(2)}, ${next.x.toFixed(
      2
    )} ${next.y.toFixed(2)}`;
  }

  return `${path} Z`;
}

function createBlobPath(metrics: AudioMetrics, time: number, isPlaying: boolean) {
  const points: BlobPoint[] = [];
  const activeAmount = isPlaying ? 1 : 0.35;
  const pulse = metrics.bass * 14 + metrics.volume * 7 + metrics.beat * 12;
  const broadWobble = 1.8 + metrics.mid * 7 + metrics.bass * 2;
  const detailWobble = 0.7 + metrics.treble * 4.5 + metrics.beat * 2;
  const speed = 0.00075 + metrics.volume * 0.0012 + metrics.beat * 0.0018;

  for (let i = 0; i < POINT_COUNT; i++) {
    const angle = (i / POINT_COUNT) * Math.PI * 2;

    const slowDrift = Math.sin(angle * 2 + time * speed) * broadWobble;
    const bodyDrift =
      Math.sin(angle * 3 - time * (speed * 0.78) + 1.4) *
      (2.2 + metrics.bass * 4.5);
    const edgeDetail =
      Math.sin(angle * 7 + time * (speed * 2.3) + i * 0.08) * detailWobble;
    const beatRipple = Math.sin(angle * 4 - time * 0.006) * metrics.beat * 3.5;
    const idleBreath = Math.sin(angle * 2.4 + time * 0.00065) * (1 - activeAmount) * 2;

    const radius =
      BASE_RADIUS +
      pulse +
      slowDrift * activeAmount +
      bodyDrift * activeAmount +
      edgeDetail * activeAmount +
      beatRipple +
      idleBreath;

    points.push({
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
    });
  }

  return createSmoothClosedPath(points);
}

function AudioBlob({ metrics, isPlaying }: AudioBlobProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const glowPathRef = useRef<SVGPathElement | null>(null);
  const fillPathRef = useRef<SVGPathElement | null>(null);
  const edgePathRef = useRef<SVGPathElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const targetMetricsRef = useRef<AudioMetrics>(metrics);
  const isPlayingRef = useRef(isPlaying);
  const currentMetricsRef = useRef<AudioMetrics>({
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: 0,
  });

  useEffect(() => {
    targetMetricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    function animate(time: number) {
      const isCurrentlyPlaying = isPlayingRef.current;
      const target = isCurrentlyPlaying
        ? targetMetricsRef.current
        : { volume: 0, bass: 0, mid: 0, treble: 0, beat: 0 };
      const current = currentMetricsRef.current;

      const nextMetrics: AudioMetrics = {
        volume: smoothValue(current.volume, target.volume, 0.42, 0.12),
        bass: smoothValue(current.bass, target.bass, 0.55, 0.14),
        mid: smoothValue(current.mid, target.mid, 0.34, 0.1),
        treble: smoothValue(current.treble, target.treble, 0.38, 0.12),
        beat: Math.max(target.beat, current.beat * 0.78),
      };

      nextMetrics.volume = clamp01(nextMetrics.volume);
      nextMetrics.bass = clamp01(nextMetrics.bass);
      nextMetrics.mid = clamp01(nextMetrics.mid);
      nextMetrics.treble = clamp01(nextMetrics.treble);
      nextMetrics.beat = clamp01(nextMetrics.beat);
      currentMetricsRef.current = nextMetrics;

      const newPath = createBlobPath(nextMetrics, time, isCurrentlyPlaying);

      glowPathRef.current?.setAttribute("d", newPath);
      fillPathRef.current?.setAttribute("d", newPath);
      edgePathRef.current?.setAttribute("d", newPath);

      if (svgRef.current) {
        const scale = 1 + nextMetrics.bass * 0.035 + nextMetrics.beat * 0.055;
        const glowOpacity = 0.22 + nextMetrics.volume * 0.28 + nextMetrics.beat * 0.22;
        const edgeOpacity = 0.22 + nextMetrics.treble * 0.32 + nextMetrics.beat * 0.26;

        svgRef.current.style.setProperty("--blob-scale", scale.toFixed(3));
        svgRef.current.style.setProperty(
          "--blob-glow-opacity",
          glowOpacity.toFixed(3)
        );
        svgRef.current.style.setProperty(
          "--blob-edge-opacity",
          edgeOpacity.toFixed(3)
        );
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
    <svg ref={svgRef} className="audio-blob-svg" viewBox="0 0 200 200" aria-hidden="true">
      <path ref={glowPathRef} className="audio-blob-glow" />
      <path ref={fillPathRef} className="audio-blob-fill" />
      <path ref={edgePathRef} className="audio-blob-edge" />
    </svg>
  );
}

export default AudioBlob;
