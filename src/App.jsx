import { useEffect, useRef, useState } from "react";
import "./App.css";

const HOLD_SECONDS = 6;
const STOP_DELAY_MS = 2000;

export default function App() {
  const [alarmTime, setAlarmTime] = useState("");
  const [isArmed, setIsArmed] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [message, setMessage] = useState("アラーム未設定");
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [showHoldVideo, setShowHoldVideo] = useState(false);
  const [showFinishVideo, setShowFinishVideo] = useState(false);
  const [stopScheduled, setStopScheduled] = useState(false);

  const audioRef = useRef(null);
  const holdVideoRef = useRef(null);
  const finishVideoRef = useRef(null);
  const stopButtonRef = useRef(null);

  const holdIntervalRef = useRef(null);
  const holdStartTimeRef = useRef(null);
  const stopDelayTimeoutRef = useRef(null);
  const stoppedByLongPressRef = useRef(false);
  const activePointerIdRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${h}:${m}:${s}`);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isArmed || !alarmTime) return;

    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const nowTime = `${h}:${m}`;

      if (nowTime === alarmTime) {
        ringAlarm();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isArmed, alarmTime]);

  useEffect(() => {
    return () => {
      clearHoldTimer();
      clearStopDelayTimeout();
    };
  }, []);

  const clearHoldTimer = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartTimeRef.current = null;
  };

  const clearStopDelayTimeout = () => {
    if (stopDelayTimeoutRef.current) {
      clearTimeout(stopDelayTimeoutRef.current);
      stopDelayTimeoutRef.current = null;
    }
  };

  const resetHoldVideo = () => {
    if (!holdVideoRef.current) return;
    holdVideoRef.current.pause();
    holdVideoRef.current.currentTime = 0;
  };

  const resetFinishVideo = () => {
    if (!finishVideoRef.current) return;
    finishVideoRef.current.pause();
    finishVideoRef.current.currentTime = 0;
  };

  const freezeVideoOnLastFrame = (videoElement) => {
    if (!videoElement) return;

    const safeTime = Math.max((videoElement.duration || 0) - 0.05, 0);
    videoElement.pause();

    if (Number.isFinite(safeTime)) {
      videoElement.currentTime = safeTime;
    }
  };

  const playHoldVideoFromStart = async () => {
    if (!holdVideoRef.current) return;

    const video = holdVideoRef.current;
    video.pause();
    video.currentTime = 0;

    try {
      await video.play();
    } catch {
      setMessage("下の動画の再生に失敗した");
    }
  };

  const playFinishVideoFromStart = async () => {
    if (!finishVideoRef.current) return;

    const video = finishVideoRef.current;
    video.pause();
    video.currentTime = 0;

    try {
      await video.play();
    } catch {
      setMessage("上の動画の再生に失敗した");
    }
  };

  const setAlarm = () => {
    if (!alarmTime) {
      setMessage("時刻を設定しろ");
      return;
    }

    clearHoldTimer();
    clearStopDelayTimeout();

    setIsArmed(true);
    setIsRinging(false);
    setIsHolding(false);
    setShowHoldVideo(false);
    setShowFinishVideo(false);
    setStopScheduled(false);
    setHoldProgress(0);

    activePointerIdRef.current = null;
    stoppedByLongPressRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    resetHoldVideo();
    resetFinishVideo();

    setMessage(`${alarmTime} にセットした`);
  };

  const ringAlarm = async () => {
    if (isRinging) return;

    clearHoldTimer();
    clearStopDelayTimeout();

    stoppedByLongPressRef.current = false;
    activePointerIdRef.current = null;

    setIsRinging(true);
    setIsArmed(false);
    setIsHolding(false);
    setShowHoldVideo(false);
    setShowFinishVideo(false);
    setStopScheduled(false);
    setHoldProgress(0);

    resetHoldVideo();
    resetFinishVideo();

    setMessage("鳴ってるぞ（6秒長押しで停止予約）");

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.loop = true;

      try {
        await audioRef.current.play();
      } catch {
        setMessage("タップしてから再生しろ");
      }
    }
  };

  const completeStopSequence = async () => {
    setIsRinging(false);
    setIsHolding(false);
    setStopScheduled(false);
    setShowFinishVideo(true);

    activePointerIdRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setMessage("アラーム停止。上の動画を再生中");
    await playFinishVideoFromStart();
  };

  const scheduleAlarmStop = () => {
    clearStopDelayTimeout();
    setStopScheduled(true);
    setMessage("6秒達成。2秒後に停止");

    stopDelayTimeoutRef.current = setTimeout(() => {
      completeStopSequence();
    }, STOP_DELAY_MS);
  };

  const startHoldCore = async () => {
    stoppedByLongPressRef.current = false;
    setIsHolding(true);
    setShowHoldVideo(true);
    setMessage("そのまま6秒押し続けろ");

    await playHoldVideoFromStart();

    holdStartTimeRef.current = Date.now();

    holdIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(elapsedMs / (HOLD_SECONDS * 1000), 1);

      setHoldProgress(progress);

      if (progress >= 1) {
        stoppedByLongPressRef.current = true;
        clearHoldTimer();
        setIsHolding(false);
        setHoldProgress(1);
        scheduleAlarmStop();
      }
    }, 50);
  };

  const cancelHoldCore = () => {
    if (!isRinging) return;
    if (stopScheduled) return;

    clearHoldTimer();
    setIsHolding(false);

    if (!stoppedByLongPressRef.current) {
      setHoldProgress(0);
      setShowHoldVideo(false);
      resetHoldVideo();
      setMessage("離したのでリセットされた");
    }
  };

  const handlePointerDown = async (event) => {
    event.preventDefault();

    if (!isRinging) return;
    if (stopScheduled) return;
    if (holdIntervalRef.current) return;
    if (activePointerIdRef.current !== null) return;

    activePointerIdRef.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 取れない環境でも続行
    }

    await startHoldCore();
  };

  const handlePointerUp = (event) => {
    if (activePointerIdRef.current !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 無視
    }

    activePointerIdRef.current = null;
    cancelHoldCore();
  };

  const handlePointerCancel = (event) => {
    if (activePointerIdRef.current !== event.pointerId) return;

    activePointerIdRef.current = null;
    cancelHoldCore();
  };

  const handleLostPointerCapture = () => {
    if (activePointerIdRef.current === null) return;
    activePointerIdRef.current = null;
    cancelHoldCore();
  };

  const handleHoldVideoEnded = () => {
    freezeVideoOnLastFrame(holdVideoRef.current);
  };

  const handleFinishVideoEnded = () => {
    freezeVideoOnLastFrame(finishVideoRef.current);
    setMessage("上の動画の再生が終わった");
  };

  return (
    <div className="app">
      <div className="alarm-screen">
        <div className="top-panel">
          <p className="app-name">ema-mezamashi</p>

          <p className="label">現在時刻</p>
          <p className="current-time">{currentTime}</p>

          <p className="label">アラーム</p>
          <p className="alarm-time">{alarmTime || "--:--"}</p>

          <input
            type="time"
            value={alarmTime}
            onChange={(e) => setAlarmTime(e.target.value)}
            className="time-input"
          />

          <button className="set-btn" onClick={setAlarm}>
            セット
          </button>

          <p className="status">{message}</p>
        </div>

        <div className="bottom-area">
          <div className="character-wrapper">
            <img
              src="/character.png"
              alt="character"
              className={`character-media character-image ${showFinishVideo ? "media-hidden" : "media-visible"}`}
            />

            <video
              ref={finishVideoRef}
              className={`character-media finish-video ${showFinishVideo ? "media-visible" : "media-hidden"}`}
              src="/finish.mp4"
              playsInline
              preload="auto"
              onEnded={handleFinishVideoEnded}
            />
          </div>

          <div className="stop-wrapper">
            <img
              src="/base.png"
              alt="base"
              className={`stop-media ${showHoldVideo ? "media-hidden" : "media-visible"}`}
            />

            <video
              ref={holdVideoRef}
              className={`stop-media ${showHoldVideo ? "media-visible" : "media-hidden"}`}
              src="/hold.mp4"
              playsInline
              muted
              preload="auto"
              onEnded={handleHoldVideoEnded}
            />

            <button
              ref={stopButtonRef}
              className="stop-btn"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handleLostPointerCapture}
            >
              <span className="sr-only">stop button</span>
            </button>
          </div>
        </div>

        <audio ref={audioRef} src="/alarm.wav" preload="auto" />
      </div>
    </div>
  );
}