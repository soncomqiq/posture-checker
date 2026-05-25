import React, { useState, useEffect } from 'react';
import { DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import type { SessionRecord } from '../types';
import { getStatusColor } from '../utils/postureCalculator';

const STORAGE_KEY = 'posture_history';

export function saveSession(session: SessionRecord): void {
  const existing = getSessions();
  existing.unshift(session);
  // Keep only the last 100 sessions
  const trimmed = existing.slice(0, 100);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getSessions(): SessionRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function clearSessions(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface HistoryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSessions(getSessions());
    }
  }, [isOpen]);

  const handleClear = () => {
    if (window.confirm('ต้องการลบประวัติทั้งหมดหรือไม่?')) {
      clearSessions();
      setSessions([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-panel" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h2><HistoryOutlined /> ประวัติการฝึก</h2>
          <div className="history-actions">
            {sessions.length > 0 && (
              <button className="clear-btn" onClick={handleClear}>
                <DeleteOutlined /> ลบทั้งหมด
              </button>
            )}
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="history-empty">
            <p>📋 ยังไม่มีประวัติการฝึก</p>
            <p className="history-empty-sub">เริ่มฝึกท่าทางเพื่อบันทึกผลลัพธ์</p>
          </div>
        ) : (
          <div className="history-list">
            {sessions.map((session) => (
              <div key={session.id} className="history-card">
                <div className="history-card-top">
                  <div className="history-date">
                    <span className="history-date-val">{session.date}</span>
                    <span className="history-time-val">{session.time}</span>
                  </div>
                  <div
                    className="history-score"
                    style={{ color: getStatusColor(session.status) }}
                  >
                    {session.score}%
                  </div>
                </div>
                <div className="history-card-bottom">
                  <span className="history-mode">
                    {session.mode === 'front' ? '🧍 ด้านหน้า' : '🧍‍♂️ ด้านข้าง'}
                  </span>
                  <span
                    className="history-status-badge"
                    style={{
                      backgroundColor: `${getStatusColor(session.status)}20`,
                      color: getStatusColor(session.status),
                    }}
                  >
                    {session.status === 'good' && 'ดีมาก'}
                    {session.status === 'warning' && 'พอใช้'}
                    {session.status === 'poor' && 'ต้องปรับปรุง'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryDashboard;
