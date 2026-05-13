import { useEffect, useMemo, useRef } from "react";
import "./Menu.css";
import type { AudioMetrics } from "./audioTypes";

// The visual goal here is a soft aura, not a large moving puddle.
// Bass/beat drive the overall pulse. Mids/treble add only subtle edge motion.

type AudioBlobProps = {
  metrics: AudioMetrics;
  isPlaying: boolean;
};

type BlobPoint = {
  x: number;
  y: number;
};

type MotionSeed = {
  phase: number;
  drift: number;
  weight: number;
};

const POINT_COUNT = 72;
const CENTER = 100;
const BASE_RADIUS = 45;
const OUTER_RADIUS = 52;

const SILENCE: AudioMetrics = {
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothValue(current: number, target: number, attack: number, release: number) {
  const amount = target > current ? attack : release;
  return current + (target - current) * amount;
}

function createSeeds() {
  return Array.from({ length: POINT_COUNT }, (_, index) => {
    const stableRandom = Math.sin(index * 91.73 + 17.31) * 10000;
    const random01 = stableRandom - Math.floor(stableRandom);

    return {
      phase: random01 * Math.PI * 2,
      drift: 0.72 + random01 * 0.44,
      weight: 0.72 + random01 * 0.5,
    };
  });
}

function createSmoothClosedPath(points: BlobPoint[]) {
  const tension = 0.68;
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

function createAuraPath(
  metrics: AudioMetrics,
  time: number,
  seeds: MotionSeed[],
  isPlaying: boolean,
  radiusOffset = 0
) {
  const points: BlobPoint[] = [];
  const activeAmount = isPlaying ? 1 : 0.22;
  const seconds = time / 1000;

  const globalPulse = metrics.bass * 8.5 + metrics.volume * 3.5 + metrics.beat * 5.5;
  const liquidAmount = (1.2 + metrics.mid * 3.2 + metrics.bass * 1.4) * activeAmount;
  const detailAmount = (0.35 + metrics.treble * 1.8 + metrics.beat * 0.8) * activeAmount;
  const breath = Math.sin(seconds * 1.35) * (isPlaying ? 0.75 : 1.35);

  // Keep the outline balanced by cancelling out the average radius offset.
  const rawOffsets = seeds.map((seed, index) => {
    const angle = (index / POINT_COUNT) * Math.PI * 2;

    const slowLiquid =
      Math.sin(angle * 2 + seconds * 0.9 + seed.phase) * liquidAmount * 0.45 +
      Math.sin(angle * 3 - seconds * 0.72 + seed.phase * 0.7) * liquidAmount * 0.38 +
      Math.sin(angle * 5 + seconds * seed.drift + seed.phase * 1.3) * liquidAmount * 0.22;

    const edgeTexture =
      Math.sin(angle * 8 - seconds * 1.8 + seed.phase * 1.7) * detailAmount * 0.35 +
      Math.sin(angle * 13 + seconds * 2.2 + seed.phase) * detailAmount * 0.16;

    return (slowLiquid + edgeTexture) * seed.weight;
  });

  const averageOffset =
    rawOffsets.reduce((total, offset) => total + offset, 0) / rawOffsets.length;

  for (let i = 0; i < POINT_COUNT; i++) {
    const angle = (i / POINT_COUNT) * Math.PI * 2;
    const controlledOffset = rawOffsets[i] - averageOffset;
    const radius = BASE_RADIUS + radiusOffset + globalPulse + breath + controlledOffset;

    points.push({
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
    });
  }

  return createSmoothClosedPath(points);
}

function AudioBlob({ metrics, isPlaying }: AudioBlobProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const haloRef = useRef<SVGCircleElement | null>(null);
  const glowPathRef = useRef<SVGPathElement | null>(null);
  const fillPathRef = useRef<SVGPathElement | null>(null);
  const edgePathRef = useRef<SVGPathElement | null>(null);
  const pulseRingRef = useRef<SVGCircleElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const seeds = useMemo(() => createSeeds(), []);
  const targetMetricsRef = useRef<AudioMetrics>(metrics);
  const isPlayingRef = useRef(isPlaying);
  const currentMetricsRef = useRef<AudioMetrics>({ ...SILENCE });
  const beatFlashRef = useRef(0);
  const previousBeatRef = useRef(0);

  useEffect(() => {
    targetMetricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    function animate(time: number) {
      const isCurrentlyPlaying = isPlayingRef.current;
      const target = isCurrentlyPlaying ? targetMetricsRef.current : SILENCE;
      const current = currentMetricsRef.current;

      const nextMetrics: AudioMetrics = {
        volume: smoothValue(current.volume, target.volume, 0.36, 0.1),
        bass: smoothValue(current.bass, target.bass, 0.46, 0.12),
        mid: smoothValue(current.mid, target.mid, 0.28, 0.09),
        treble: smoothValue(current.treble, target.treble, 0.32, 0.11),
        beat: Math.max(target.beat, current.beat * 0.66),
      };

      nextMetrics.volume = clamp01(nextMetrics.volume);
      nextMetrics.bass = clamp01(nextMetrics.bass);
      nextMetrics.mid = clamp01(nextMetrics.mid);
      nextMetrics.treble = clamp01(nextMetrics.treble);
      nextMetrics.beat = clamp01(nextMetrics.beat);
      currentMetricsRef.current = nextMetrics;

      const risingBeat = Math.max(0, nextMetrics.beat - previousBeatRef.current);
      previousBeatRef.current = nextMetrics.beat;
      beatFlashRef.current = Math.max(
        beatFlashRef.current * 0.82,
        nextMetrics.beat * 0.48 + risingBeat * 1.4
      );
      beatFlashRef.current = clamp01(beatFlashRef.current);

      const blobPath = createAuraPath(nextMetrics, time, seeds, isCurrentlyPlaying, 0);
      const glowPath = createAuraPath(nextMetrics, time + 180, seeds, isCurrentlyPlaying, 5);

      glowPathRef.current?.setAttribute("d", glowPath);
      fillPathRef.current?.setAttribute("d", blobPath);
      edgePathRef.current?.setAttribute("d", blobPath);

      if (svgRef.current) {
        const beatFlash = beatFlashRef.current;
        const rootScale = 1 + nextMetrics.bass * 0.025 + beatFlash * 0.035;
        const haloScale = 1 + nextMetrics.volume * 0.08 + nextMetrics.bass * 0.11 + beatFlash * 0.14;
        const ringScale = 1.08 + beatFlash * 0.34 + nextMetrics.bass * 0.08;

        svgRef.current.style.setProperty("--blob-scale", rootScale.toFixed(3));
        svgRef.current.style.setProperty("--blob-halo-scale", haloScale.toFixed(3));
        svgRef.current.style.setProperty("--blob-ring-scale", ringScale.toFixed(3));
        svgRef.current.style.setProperty(
          "--blob-glow-opacity",
          (0.18 + nextMetrics.volume * 0.18 + nextMetrics.bass * 0.18 + beatFlash * 0.22).toFixed(3)
        );
        svgRef.current.style.setProperty(
          "--blob-fill-opacity",
          (0.1 + nextMetrics.volume * 0.08 + nextMetrics.mid * 0.06).toFixed(3)
        );
        svgRef.current.style.setProperty(
          "--blob-edge-opacity",
          (0.2 + nextMetrics.treble * 0.2 + beatFlash * 0.28).toFixed(3)
        );
        svgRef.current.style.setProperty(
          "--blob-ring-opacity",
          (beatFlash * 0.34 + nextMetrics.beat * 0.12).toFixed(3)
        );
      }

      if (haloRef.current) {
        haloRef.current.setAttribute("r", String(OUTER_RADIUS));
      }

      if (pulseRingRef.current) {
        pulseRingRef.current.setAttribute("r", String(OUTER_RADIUS + 5));
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [seeds]);

  return (
    <svg ref={svgRef} className="audio-blob-svg" viewBox="0 0 200 200" aria-hidden="true">
      <circle ref={haloRef} className="audio-blob-halo" cx="100" cy="100" r={OUTER_RADIUS} />
      <path ref={glowPathRef} className="audio-blob-glow" />
      <path ref={fillPathRef} className="audio-blob-fill" />
      <path ref={edgePathRef} className="audio-blob-edge" />
      <circle ref={pulseRingRef} className="audio-blob-pulse-ring" cx="100" cy="100" r={OUTER_RADIUS + 5} />
    </svg>
  );
}

export default AudioBlob;
