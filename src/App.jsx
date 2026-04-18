import { useEffect, useRef, useState } from "react";
import "./App.css";
import { db } from "./firebase";
import {
  doc,
  updateDoc,
  increment,
  getDoc,
} from "firebase/firestore";

const HOLD_SECONDS = 6;
const STOP_DELAY_MS = 2000;

export default function App() {
  const [alarmTime, setAlarmTime] = useState("07:00");
  const [isArmed, setIsArmed] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [message, setMessage] = useState("未セット");
  const [stopCount, setStopCount] = useState(0);

  const [showHoldVideo, setShowHoldVideo] = useState(false);
  const [showFinishVideo, setShowFinishVideo] = useState(false);
  const [stopScheduled, setStopScheduled] = useState(false);
  const [showStopUi, setShowStopUi] = useState(false);

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
    if (!isArmed) return;

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

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const snap = await getDoc(doc(db, "stats", "alarm"));
        if (snap.exists()) {
          setStopCount(snap.data().count ?? 0);
        }
      } catch (error) {
        console.log("count fetch failed:", error);
      }
    };

    fetchCount();
  }, []);

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

  const unlockAlarmAudio = async () => {
    if (!audioRef.current) return;

    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } catch (error) {
      console.log("audio unlock failed:", error);
    }
  };

  const fetchLatestCount = async () => {
    try {
      const ref = doc(db, "stats", "alarm");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setStopCount(snap.data().count ?? 0);
      }
    } catch (error) {
      console.log("latest count fetch failed:", error);
    }
  };

  const setAlarm = async () => {
    clearHoldTimer();
    clearStopDelay();

    setIsArmed(true);
    setIsRinging(false);
    setShowHoldVideo(false);
    setShowFinishVideo(false);
    setStopScheduled(false);
    setShowStopUi(false);

    activePointerIdRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    resetHoldVideo();
    resetFinishVideo();

    await unlockAlarmAudio();

    setMessage(`${alarmTime} にセット`);
  };

  const ringAlarm = async () => {
    if (isRinging) return;

    clearHoldTimer();
    clearStopDelay();

    setIsRinging(true);
    setIsArmed(false);
    setShowFinishVideo(false);
    setShowHoldVideo(false);
    setStopScheduled(false);
    setShowStopUi(true);

    setMessage("鳴っています");

    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.currentTime = 0;

      try {
        await audioRef.current.play();
      } catch (error) {
        console.log("alarm play failed:", error);
      }
    }
  };

  const completeStop = async () => {
    setIsRinging(false);
    setShowFinishVideo(true);
    setShowStopUi(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      const ref = doc(db, "stats", "alarm");

      await updateDoc(ref, {
        count: increment(1),
      });

      const snap = await getDoc(ref);
      if (snap.exists()) {
        setStopCount(snap.data().count ?? 0);
      }
    } catch (error) {
      console.log("count update failed:", error);
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

    if (stopScheduled) return;

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
    cancelHold();
  };

  const handleCancel = () => {
    activePointerIdRef.current = null;
    cancelHold();
  };

  return (
    <div className="app">
      <div className="alarm-screen">
        <div className="top-panel">
          <p className="current-time">{currentTime}</p>

          <p className="execution-count">
            処刑回数：<span className="count-number">{stopCount}</span>回
          </p>

          <input
            type="time"
            value={alarmTime}
            onChange={(e) => setAlarmTime(e.target.value)}
            className="time-input"
            disabled={isRinging}
          />

          <button
            onClick={setAlarm}
            className="set-btn"
            disabled={isRinging}
          >
            セット
          </button>

          <p>{message}</p>
        </div>

        <div className="bottom-area">
          <div className="character-wrapper">
            <img
              src={isRinging ? "/character.png" : "/character_idle.png"}
              className={`top-visual ${
                showFinishVideo ? "media-hidden" : "media-visible"
              }`}
              alt="character"
            />

            <video
              ref={finishVideoRef}
              className={`top-visual finish-video ${
                showFinishVideo ? "media-visible" : "media-hidden"
              }`}
              src="/finish.mp4"
              playsInline
              preload="auto"
            />
          </div>

          {showStopUi && (
            <div className="stop-wrapper">
              <img
                src="/base.png"
                className={`stop-media ${
                  showHoldVideo ? "media-hidden" : "media-visible"
                }`}
                alt="base"
              />

              <video
                ref={holdVideoRef}
                className={`stop-media ${
                  showHoldVideo ? "media-visible" : "media-hidden"
                }`}
                src="/hold.mp4"
                playsInline
                muted
              />

              <button
                className="stop-btn"
                onPointerDown={handleDown}
                onPointerUp={handleUp}
                onPointerCancel={handleCancel}
              >
                <span className="sr-only">停止ボタン</span>
              </button>
            </div>
          )}
        </div>

        <audio ref={audioRef} src="/alarm.wav" preload="auto" />
      </div>
    </div>
  );
}