// ===== Posture Modes =====
export type PostureMode = 'front' | 'side';

// ===== Posture Status =====
export type PostureStatus = 'good' | 'warning' | 'poor';

// ===== Individual Metric =====
export interface PostureMetric {
  name: string;
  nameTH: string;
  angle: number;
  status: PostureStatus;
  message: string;
  messageTH: string;
}

// ===== Overall Posture Result =====
export interface PostureResult {
  score: number; // 0-100
  status: PostureStatus;
  metrics: PostureMetric[];
  mode: PostureMode;
  timestamp: number;
}

// ===== Session History =====
export interface SessionRecord {
  id: string;
  date: string;
  time: string;
  mode: PostureMode;
  durationSeconds: number;
  score: number;
  status: PostureStatus;
  metrics: PostureMetric[];
}

// ===== App State =====
export type AppPhase = 'idle' | 'countdown' | 'analyzing' | 'result';

export interface AppConfig {
  mode: PostureMode;
  countdownSeconds: number;
  showGrid: boolean;
  showSkeleton: boolean;
  voiceEnabled: boolean;
  cameraFacing: 'user' | 'environment';
}

// ===== Landmark Point =====
export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}
