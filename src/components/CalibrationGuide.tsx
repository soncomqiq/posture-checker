import React from 'react';
import type { PostureResult } from '../types';
import { getStatusColor, getScoreColor } from '../utils/postureCalculator';

interface CalibrationGuideProps {
  result: PostureResult | null;
  isVisible: boolean;
  onClose: () => void;
}

const CalibrationGuide: React.FC<CalibrationGuideProps> = ({ result, isVisible, onClose }) => {
  if (!isVisible || !result) return null;

  const scoreColor = getScoreColor(result.score);
  const circumference = 2 * Math.PI * 54; // radius = 54
  const offset = circumference - (result.score / 100) * circumference;

  return (
    <div className="result-panel">
      <div className="result-header">
        <h2>ผลการวิเคราะห์</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Score Ring */}
      <div className="score-ring-container">
        <svg className="score-ring" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={scoreColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="score-value" style={{ color: scoreColor }}>
          {result.score}
        </div>
        <div className="score-label">คะแนน</div>
      </div>

      {/* Status Badge */}
      <div className="status-badge" style={{
        backgroundColor: `${getStatusColor(result.status)}20`,
        color: getStatusColor(result.status),
        borderColor: getStatusColor(result.status),
      }}>
        {result.status === 'good' && '✓ ยืนตรงดีมาก!'}
        {result.status === 'warning' && '⚡ ใกล้จะดีแล้ว ปรับอีกนิด'}
        {result.status === 'poor' && '⚠ ต้องปรับปรุง'}
      </div>

      {/* Metrics Detail */}
      <div className="metrics-list">
        {result.metrics.map((metric, idx) => (
          <div key={idx} className="metric-card">
            <div className="metric-header">
              <span className="metric-name">{metric.nameTH}</span>
              <span
                className="metric-status-dot"
                style={{ backgroundColor: getStatusColor(metric.status) }}
              />
            </div>
            <div className="metric-angle" style={{ color: getStatusColor(metric.status) }}>
              {Math.abs(metric.angle).toFixed(1)}°
            </div>
            <div className="metric-message">{metric.messageTH}</div>
          </div>
        ))}
      </div>

      {/* Mode Info */}
      <div className="result-mode-info">
        โหมด: {result.mode === 'front' ? '🧍 ด้านหน้า' : '🧍‍♂️ ด้านข้าง'}
      </div>
    </div>
  );
};

export default CalibrationGuide;
