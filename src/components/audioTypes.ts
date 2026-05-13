export type AudioMetrics = {
  volume: number;
  bass: number;
  mid: number;
  treble: number;
  beat: number;
};

export const SILENT_AUDIO_METRICS: AudioMetrics = {
  volume: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
};
