import React from 'react';
import {
  EyeOutlined,
  ColumnWidthOutlined,
  SoundOutlined,
  SoundFilled,
  AppstoreOutlined,
  CameraOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { AppConfig, PostureMode } from '../types';

interface ControlPanelProps {
  config: AppConfig;
  onConfigChange: (key: keyof AppConfig, value: unknown) => void;
  disabled: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onConfigChange, disabled }) => {
  return (
    <div className="control-panel">
      {/* Mode Selection */}
      <div className="control-group">
        <label className="control-label">โหมดตรวจ</label>
        <div className="mode-selector">
          <button
            className={`mode-btn ${config.mode === 'front' ? 'active' : ''}`}
            onClick={() => onConfigChange('mode', 'front' as PostureMode)}
            disabled={disabled}
          >
            <EyeOutlined /> ด้านหน้า
          </button>
          <button
            className={`mode-btn ${config.mode === 'side' ? 'active' : ''}`}
            onClick={() => onConfigChange('mode', 'side' as PostureMode)}
            disabled={disabled}
          >
            <ColumnWidthOutlined /> ด้านข้าง
          </button>
        </div>
      </div>

      {/* Toggle Controls */}
      <div className="control-group toggles-row">
        <button
          className={`toggle-btn ${config.showSkeleton ? 'active' : ''}`}
          onClick={() => onConfigChange('showSkeleton', !config.showSkeleton)}
          title="แสดงโครงกระดูก"
        >
          <AppstoreOutlined />
        </button>
        <button
          className={`toggle-btn ${config.showGrid ? 'active' : ''}`}
          onClick={() => onConfigChange('showGrid', !config.showGrid)}
          title="แสดงเส้นตาราง"
        >
          <CameraOutlined />
        </button>
        <button
          className={`toggle-btn ${config.voiceEnabled ? 'active' : ''}`}
          onClick={() => onConfigChange('voiceEnabled', !config.voiceEnabled)}
          title="เสียงแนะนำ"
        >
          {config.voiceEnabled ? <SoundFilled /> : <SoundOutlined />}
        </button>
        <button
          className="toggle-btn"
          onClick={() =>
            onConfigChange(
              'cameraFacing',
              config.cameraFacing === 'user' ? 'environment' : 'user'
            )
          }
          disabled={disabled}
          title="สลับกล้อง"
        >
          <SwapOutlined />
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;
