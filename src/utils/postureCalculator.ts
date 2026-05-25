import type { LandmarkPoint, PostureMetric, PostureMode, PostureResult, PostureStatus } from '../types';

// MediaPipe Pose Landmark indices
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
const LANDMARKS = {
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
};

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function getAngleFromVertical(top: LandmarkPoint, bottom: LandmarkPoint): number {
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  // Angle from vertical (straight up = 0 degrees)
  return radToDeg(Math.atan2(dx, -dy));
}

function getHorizontalTiltAngle(left: LandmarkPoint, right: LandmarkPoint): number {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  // Use Math.atan with absolute dx to get angle from horizontal (-90 to +90 degrees)
  // This prevents 180-degree errors when left.x > right.x (e.g., facing camera)
  // Positive angle means right point is lower than left point
  return radToDeg(Math.atan(dy / (Math.abs(dx) || 0.0001)));
}

function classifyAngle(angle: number, goodThreshold: number, warningThreshold: number): PostureStatus {
  const absAngle = Math.abs(angle);
  if (absAngle <= goodThreshold) return 'good';
  if (absAngle <= warningThreshold) return 'warning';
  return 'poor';
}

function scoreFromAngle(angle: number, maxBadAngle: number): number {
  const absAngle = Math.abs(angle);
  const score = Math.max(0, 100 - (absAngle / maxBadAngle) * 100);
  return Math.round(score);
}

// ===== FRONT VIEW ANALYSIS =====
function analyzeFrontView(landmarks: LandmarkPoint[]): PostureMetric[] {
  const metrics: PostureMetric[] = [];

  // 1. Shoulder Tilt
  const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const shoulderTilt = getHorizontalTiltAngle(leftShoulder, rightShoulder);
  const shoulderStatus = classifyAngle(shoulderTilt, 3, 8);
  const shoulderDir = shoulderTilt > 0 ? 'ขวาต่ำกว่าซ้าย' : 'ซ้ายต่ำกว่าขวา';
  metrics.push({
    name: 'Shoulder Tilt',
    nameTH: 'ความเอียงไหล่',
    angle: Math.round(shoulderTilt * 10) / 10,
    status: shoulderStatus,
    message: shoulderStatus === 'good'
      ? 'Shoulders are level'
      : `Shoulders tilted ${Math.abs(shoulderTilt).toFixed(1)}°`,
    messageTH: shoulderStatus === 'good'
      ? 'ไหล่อยู่ในระดับเดียวกัน ✓'
      : `ไหล่เอียง ${Math.abs(shoulderTilt).toFixed(1)}° (${shoulderDir})`,
  });

  // 2. Head Tilt
  const leftEar = landmarks[LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
  const headTilt = getHorizontalTiltAngle(leftEar, rightEar);
  const headStatus = classifyAngle(headTilt, 3, 8);
  const headDir = headTilt > 0 ? 'เอียงขวา' : 'เอียงซ้าย';
  metrics.push({
    name: 'Head Tilt',
    nameTH: 'ความเอียงศีรษะ',
    angle: Math.round(headTilt * 10) / 10,
    status: headStatus,
    message: headStatus === 'good'
      ? 'Head is level'
      : `Head tilted ${Math.abs(headTilt).toFixed(1)}°`,
    messageTH: headStatus === 'good'
      ? 'ศีรษะตรง ✓'
      : `ศีรษะ${headDir} ${Math.abs(headTilt).toFixed(1)}°`,
  });

  // 3. Torso / Spine Alignment
  const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
  const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const leftHip = landmarks[LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
  const midHipX = (leftHip.x + rightHip.x) / 2;
  const midHipY = (leftHip.y + rightHip.y) / 2;
  const spineAngle = getAngleFromVertical(
    { x: midShoulderX, y: midShoulderY, z: 0, visibility: 1 },
    { x: midHipX, y: midHipY, z: 0, visibility: 1 }
  );
  const spineStatus = classifyAngle(spineAngle, 3, 8);
  metrics.push({
    name: 'Spine Alignment',
    nameTH: 'แนวกระดูกสันหลัง',
    angle: Math.round(spineAngle * 10) / 10,
    status: spineStatus,
    message: spineStatus === 'good'
      ? 'Spine is aligned'
      : `Spine offset ${Math.abs(spineAngle).toFixed(1)}°`,
    messageTH: spineStatus === 'good'
      ? 'กระดูกสันหลังตรง ✓'
      : `ลำตัวเอียง ${Math.abs(spineAngle).toFixed(1)}°`,
  });

  return metrics;
}

// ===== SIDE VIEW ANALYSIS =====
function analyzeSideView(landmarks: LandmarkPoint[]): PostureMetric[] {
  const metrics: PostureMetric[] = [];

  // Determine which side is visible (left or right)
  const leftEar = landmarks[LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
  const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARKS.LEFT_HIP];
  const rightHip = landmarks[LANDMARKS.RIGHT_HIP];

  // Pick the side with better visibility
  const useLeft = (leftEar.visibility + leftShoulder.visibility) > (rightEar.visibility + rightShoulder.visibility);
  const ear = useLeft ? leftEar : rightEar;
  const shoulder = useLeft ? leftShoulder : rightShoulder;
  const hip = useLeft ? leftHip : rightHip;

  // 1. Forward Head Angle (Text Neck)
  // Angle between ear-shoulder line and vertical
  const forwardHeadAngle = getAngleFromVertical(ear, shoulder);
  const fhStatus = classifyAngle(forwardHeadAngle, 10, 20);
  metrics.push({
    name: 'Forward Head',
    nameTH: 'คอยื่นไปด้านหน้า',
    angle: Math.round(forwardHeadAngle * 10) / 10,
    status: fhStatus,
    message: fhStatus === 'good'
      ? 'Head position is good'
      : `Forward head angle: ${Math.abs(forwardHeadAngle).toFixed(1)}°`,
    messageTH: fhStatus === 'good'
      ? 'ตำแหน่งศีรษะดี ✓'
      : `คอยื่นไปด้านหน้า ${Math.abs(forwardHeadAngle).toFixed(1)}°`,
  });

  // 2. Rounded Shoulders / Torso Slouch
  const torsoAngle = getAngleFromVertical(shoulder, hip);
  const torsoStatus = classifyAngle(torsoAngle, 5, 12);
  metrics.push({
    name: 'Torso Slouch',
    nameTH: 'ตัวค่อม / หลังค่อม',
    angle: Math.round(torsoAngle * 10) / 10,
    status: torsoStatus,
    message: torsoStatus === 'good'
      ? 'Torso is upright'
      : `Torso leaning ${Math.abs(torsoAngle).toFixed(1)}°`,
    messageTH: torsoStatus === 'good'
      ? 'ลำตัวตั้งตรง ✓'
      : `ลำตัวเอียงไปด้านหน้า ${Math.abs(torsoAngle).toFixed(1)}°`,
  });

  return metrics;
}

// ===== OVERALL POSTURE ANALYSIS =====
export function analyzePosture(landmarks: LandmarkPoint[], mode: PostureMode): PostureResult {
  const metrics = mode === 'front'
    ? analyzeFrontView(landmarks)
    : analyzeSideView(landmarks);

  // Calculate overall score
  const maxAngleForScoring = mode === 'front' ? 15 : 30;
  const scores = metrics.map(m => scoreFromAngle(m.angle, maxAngleForScoring));
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Determine overall status
  let status: PostureStatus = 'good';
  if (metrics.some(m => m.status === 'poor')) status = 'poor';
  else if (metrics.some(m => m.status === 'warning')) status = 'warning';

  return {
    score: avgScore,
    status,
    metrics,
    mode,
    timestamp: Date.now(),
  };
}

// ===== VOICE FEEDBACK =====
export function generateVoiceFeedback(result: PostureResult): string {
  if (result.status === 'good') {
    return 'ท่าทางของคุณดีมากค่ะ ยืนตรงได้ดี';
  }

  const issues = result.metrics
    .filter(m => m.status !== 'good')
    .map(m => m.messageTH)
    .join(' และ ');

  const prefix = result.status === 'poor'
    ? 'ต้องปรับปรุงค่ะ'
    : 'ใกล้จะดีแล้วค่ะ';

  return `${prefix} ${issues}`;
}

// ===== STATUS COLOR HELPERS =====
export function getStatusColor(status: PostureStatus): string {
  switch (status) {
    case 'good': return '#52c41a';
    case 'warning': return '#faad14';
    case 'poor': return '#ff4d4f';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#52c41a';
  if (score >= 50) return '#faad14';
  return '#ff4d4f';
}
