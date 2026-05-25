import { useRef, useCallback, useState, useEffect } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import type { LandmarkPoint, PostureMode, PostureResult, AppPhase } from '../types';
import { analyzePosture } from '../utils/postureCalculator';

interface UsePoseDetectionProps {
  mode: PostureMode;
  phase: AppPhase;
  showSkeleton: boolean;
  showGrid: boolean;
  cameraFacing: 'user' | 'environment';
  onResult: (result: PostureResult) => void;
}

export function usePoseDetection({
  mode,
  phase,
  showSkeleton,
  showGrid,
  cameraFacing,
  onResult,
}: UsePoseDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestResultRef = useRef<PostureResult | null>(null);

  // Initialize PoseLandmarker model
  const initModel = useCallback(async () => {
    try {
      setIsModelLoading(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      poseLandmarkerRef.current = poseLandmarker;
      setIsModelReady(true);
      setIsModelLoading(false);
    } catch (err) {
      console.error('Failed to load pose model:', err);
      setError('ไม่สามารถโหลดโมเดล AI ได้ กรุณารีเฟรชหน้าเว็บ');
      setIsModelLoading(false);
    }
  }, []);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
      setError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้อง');
    }
  }, [cameraFacing]);

  // Render loop
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !poseLandmarker || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    // Size canvas to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d')!;
    const drawingUtils = new DrawingUtils(ctx);

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw mirrored video
    ctx.save();
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Detect pose
    const startTime = performance.now();
    const result = poseLandmarker.detectForVideo(video, startTime);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // Convert to our format
      const points: LandmarkPoint[] = landmarks.map(lm => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility ?? 0,
      }));

      // Analyze posture
      const postureResult = analyzePosture(points, mode);
      latestResultRef.current = postureResult;

      if (phase === 'analyzing') {
        onResult(postureResult);
      }

      // Draw skeleton
      if (showSkeleton) {
        ctx.save();
        if (cameraFacing === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }

        const statusColor = postureResult.status === 'good'
          ? '#52c41a'
          : postureResult.status === 'warning'
            ? '#faad14'
            : '#ff4d4f';

        // Draw connections
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
          color: statusColor,
          lineWidth: 3,
        });

        // Draw landmarks
        drawingUtils.drawLandmarks(landmarks, {
          color: '#ffffff',
          lineWidth: 1,
          radius: 4,
        });

        ctx.restore();
      }
    }

    // Draw grid guidelines
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);

      // Center vertical line
      const centerX = canvas.width / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, canvas.height);
      ctx.stroke();

      // Horizontal thirds
      for (let i = 1; i <= 2; i++) {
        const y = (canvas.height / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.restore();
    }

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [mode, phase, showSkeleton, showGrid, cameraFacing, onResult]);

  // Initialize model on mount
  useEffect(() => {
    initModel();

    return () => {
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, [initModel]);

  // Initialize camera on mount or when facing changes
  useEffect(() => {
    if (isModelReady) {
      initCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isModelReady, initCamera]);

  // Start render loop when camera is ready
  useEffect(() => {
    if (isCameraReady && isModelReady) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraReady, isModelReady, renderFrame]);

  // Capture current frame as data URL
  const captureFrame = useCallback((): string | null => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  }, []);

  return {
    videoRef,
    canvasRef,
    isModelLoading,
    isModelReady,
    isCameraReady,
    error,
    latestResultRef,
    captureFrame,
  };
}
