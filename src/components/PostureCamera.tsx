import React from 'react';
import type { AppPhase } from '../types';

interface PostureCameraProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isModelLoading: boolean;
  isCameraReady: boolean;
  error: string | null;
  phase: AppPhase;
  countdown: number;
}

const PostureCamera: React.FC<PostureCameraProps> = ({
  videoRef,
  canvasRef,
  isModelLoading,
  isCameraReady,
  error,
  phase,
  countdown,
}) => {
  return (
    <div className="camera-container">
      {/* Hidden video element for camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Canvas overlay for rendering */}
      <canvas
        ref={canvasRef}
        className="camera-canvas"
      />

      {/* Loading overlay */}
      {(isModelLoading || !isCameraReady) && !error && (
        <div className="camera-overlay loading-overlay">
          <div className="loading-spinner" />
          <p className="loading-text">
            {isModelLoading ? 'กำลังโหลดโมเดล AI...' : 'กำลังเปิดกล้อง...'}
          </p>
          <p className="loading-subtext">
            {isModelLoading
              ? 'อาจใช้เวลาสักครู่ในครั้งแรก'
              : 'กรุณาอนุญาตการเข้าถึงกล้อง'}
          </p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="camera-overlay error-overlay">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <button
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* Countdown overlay */}
      {phase === 'countdown' && (
        <div className="camera-overlay countdown-overlay">
          <div className="countdown-number">{countdown}</div>
          <p className="countdown-text">เตรียมตัว...</p>
        </div>
      )}

      {/* Analyzing indicator */}
      {phase === 'analyzing' && (
        <div className="analyzing-badge">
          <span className="analyzing-dot" />
          กำลังวิเคราะห์...
        </div>
      )}
    </div>
  );
};

export default PostureCamera;
