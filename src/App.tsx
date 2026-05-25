import { useState, useCallback, useRef, useEffect } from 'react';
import PostureCamera from './components/PostureCamera';
import ControlPanel from './components/ControlPanel';
import CalibrationGuide from './components/CalibrationGuide';
import HistoryDashboard, { saveSession } from './components/HistoryDashboard';
import { usePoseDetection } from './hooks/usePoseDetection';
import { generateVoiceFeedback, getScoreColor } from './utils/postureCalculator';
import { HistoryOutlined, PlayCircleOutlined, RedoOutlined } from '@ant-design/icons';
import type { AppConfig, AppPhase, PostureResult } from './types';
import './index.css';

function App() {
  const [phase, setPhase] = useState<AppPhase>('idle');
  const [countdown, setCountdown] = useState(5);
  const [result, setResult] = useState<PostureResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const countdownIntervalRef = useRef<number>(0);

  const [config, setConfig] = useState<AppConfig>({
    mode: 'front',
    countdownSeconds: 5,
    showGrid: true,
    showSkeleton: true,
    voiceEnabled: true,
    cameraFacing: 'user',
  });

  const handleConfigChange = useCallback((key: keyof AppConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // Voice synthesis
  const speak = useCallback((text: string) => {
    if (!config.voiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [config.voiceEnabled]);

  // Handle posture result from detection
  const handleResult = useCallback((postureResult: PostureResult) => {
    setResult(postureResult);
  }, []);

  const {
    videoRef,
    canvasRef,
    isModelLoading,
    isCameraReady,
    error,
    latestResultRef,
  } = usePoseDetection({
    mode: config.mode,
    phase,
    showSkeleton: config.showSkeleton,
    showGrid: config.showGrid,
    cameraFacing: config.cameraFacing,
    onResult: handleResult,
  });

  // Start countdown
  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setResult(null);
    setShowResult(false);
    let remaining = config.countdownSeconds;
    setCountdown(remaining);
    speak('เตรียมตัว');

    countdownIntervalRef.current = window.setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);

      if (remaining <= 3 && remaining > 0) {
        speak(String(remaining));
      }

      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        speak('เริ่มตรวจ');
        setPhase('analyzing');

        // Analyze for 3 seconds then show result
        setTimeout(() => {
          setPhase('result');
          const finalResult = latestResultRef.current;
          if (finalResult) {
            setResult(finalResult);
            setShowResult(true);

            // Save to history
            const now = new Date();
            saveSession({
              id: crypto.randomUUID(),
              date: now.toLocaleDateString('th-TH'),
              time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
              mode: config.mode,
              durationSeconds: 3,
              score: finalResult.score,
              status: finalResult.status,
              metrics: finalResult.metrics,
            });

            // Voice feedback
            const feedback = generateVoiceFeedback(finalResult);
            setTimeout(() => speak(feedback), 500);
          }
        }, 3000);
      }
    }, 1000);
  }, [config.countdownSeconds, config.mode, config.voiceEnabled, speak, latestResultRef]);

  // Reset
  const handleReset = useCallback(() => {
    clearInterval(countdownIntervalRef.current);
    setPhase('idle');
    setResult(null);
    setShowResult(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(countdownIntervalRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  const isRunning = phase === 'countdown' || phase === 'analyzing';

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">🦴</span>
            PostureAI
          </h1>
        </div>
        <button
          className="history-btn"
          onClick={() => setShowHistory(true)}
        >
          <HistoryOutlined />
        </button>
      </header>

      {/* Live Score Mini Badge (during analysis) */}
      {phase === 'analyzing' && result && (
        <div className="live-score-badge" style={{ borderColor: getScoreColor(result.score) }}>
          <span className="live-score-value" style={{ color: getScoreColor(result.score) }}>
            {result.score}
          </span>
          <span className="live-score-label">คะแนน</span>
        </div>
      )}

      {/* Camera */}
      <PostureCamera
        videoRef={videoRef}
        canvasRef={canvasRef}
        isModelLoading={isModelLoading}
        isCameraReady={isCameraReady}
        error={error}
        phase={phase}
        countdown={countdown}
      />

      {/* Controls */}
      <div className="bottom-section">
        <ControlPanel
          config={config}
          onConfigChange={handleConfigChange}
          disabled={isRunning}
        />

        {/* Action Button */}
        <div className="action-area">
          {phase === 'idle' || phase === 'result' ? (
            <button
              className="start-btn"
              onClick={startCountdown}
              disabled={!isCameraReady || isModelLoading}
            >
              <PlayCircleOutlined className="start-icon" />
              <span>{phase === 'result' ? 'ตรวจอีกครั้ง' : 'เริ่มตรวจท่าทาง'}</span>
            </button>
          ) : (
            <button className="stop-btn" onClick={handleReset}>
              <RedoOutlined /> หยุด
            </button>
          )}
        </div>
      </div>

      {/* Result Panel */}
      <CalibrationGuide
        result={result}
        isVisible={showResult}
        onClose={() => setShowResult(false)}
      />

      {/* History Dashboard */}
      <HistoryDashboard
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  );
}

export default App;
