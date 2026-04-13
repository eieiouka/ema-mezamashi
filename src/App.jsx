import { useEffect, useRef, useState } from "react";
import "./App.css";

const HOLD_SECONDS = 6;
const STOP_DELAY_MS = 2000;

export default function App() {
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [isArmed, setIsArmed] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [message, setMessage] = useState("未セット");
  const [showHoldVideo, setShowHoldVideo] = useState(false);
  const [showFinishVideo, setShowFinishVideo] = useState(false);
  const [stopScheduled, setStopScheduled] = useState(false);

  const audioRef = useRef(null);
  const holdVideoRef = useRef(null);
  const finishVideoRef = useRef(null);

  const holdIntervalRef = useRef(null);
  const holdStartTimeRef = useRef(null);
  const stopDelayTimeoutRef = useRef(null);
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

      if (`${h}:${m}` === alarmTime) {
        ringAlarm();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isArmed, alarmTime]);

  const clearHoldTimer = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const clearStopDelay = () => {
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

  const playHoldVideo = async () => {
    const v = holdVideoRef.current;
    if (!v) return;
    v.currentTime = 0;
    try {
      await v.play();
    } catch {}
  };

  const playFinishVideo = async () => {
    const v = finishVideoRef.current;
    if (!v) return;
    v.currentTime = 0;
    try {
      await v.play();
    } catch {}
  };

  const setAlarm = () => {
    if (!alarmTime) return;

    clearHoldTimer();
    clearStopDelay();

    setIsArmed(true);
    setIsRinging(false);
    setShowHoldVideo(false);
    setShowFinishVideo(false);
    setStopScheduled(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    resetHoldVideo();
    resetFinishVideo();

    setMessage(`${alarmTime} にセット`);
  };

  const ringAlarm = async () => {
    if (isRinging) return;

    setIsRinging(true);
    setIsArmed(false);
    setShowFinishVideo(false);
    setShowHoldVideo(false);
    setStopScheduled(false);

    resetHoldVideo();
    resetFinishVideo();

    setMessage("鳴っています");

    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
      } catch {}
    }
  };

  const completeStop = async () => {
    setIsRinging(false);
    setShowFinishVideo(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setMessage("停止しました");

    await playFinishVideo();
  };

  const scheduleStop = () => {
    setStopScheduled(true);
    stopDelayTimeoutRef.current = setTimeout(completeStop, STOP_DELAY_MS);
  };

  const startHold = async () => {
    setShowHoldVideo(true);

    await playHoldVideo();

    holdStartTimeRef.current = Date.now();

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      if (elapsed >= HOLD_SECONDS * 1000) {
        clearHoldTimer();
        scheduleStop();
      }
    }, 50);
  };

  const cancelHold = () => {
    clearHoldTimer();
    setShowHoldVideo(false);
    resetHoldVideo();
  };

  const handleDown = async (e) => {
    e.preventDefault();
    if (!isRinging || stopScheduled) return;

    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    await startHold();
  };

  const handleUp = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;

    if (stopScheduled) return;

    cancelHold();
  };

  const handleCancel = () => {
    activePointerIdRef.current = null;

    if (stopScheduled) return;

    cancelHold();
  };

  return (
    <div className="app">
      <div className="alarm-screen">
        <div className="top-panel">
          <p className="current-time">{currentTime}</p>

          <input
            type="time"
            value={alarmTime}
            onChange={(e) => setAlarmTime(e.target.value)}
            className="time-input"
          />

          <button onClick={setAlarm} className="set-btn">
            セット
          </button>

          <p>{message}</p>
        </div>

        <div className="bottom-area">
          <div className="character-wrapper">
            <img
              src={isRinging ? "/character.png" : "/character_idle.png"}
              className={`top-visual ${showFinishVideo ? "media-hidden" : "media-visible"}`}
              alt="character"
            />

            <video
              ref={finishVideoRef}
              className={`top-visual finish-video ${showFinishVideo ? "media-visible" : "media-hidden"}`}
              src="/finish.mp4"
              playsInline
              preload="auto"
            />
          </div>

          <div className="stop-wrapper">
            <img
              src="/base.png"
              className={`stop-media ${showHoldVideo ? "media-hidden" : "media-visible"}`}
              alt="base"
            />

            <video
              ref={holdVideoRef}
              className={`stop-media ${showHoldVideo ? "media-visible" : "media-hidden"}`}
              src="/hold.mp4"
              playsInline
              muted
            />

            <button
              className="stop-btn"
              onPointerDown={handleDown}
              onPointerUp={handleUp}
              onPointerCancel={handleCancel}
            />
          </div>
        </div>

        <audio ref={audioRef} src="/alarm.wav" />
      </div>
    </div>
  );
}