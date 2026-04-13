import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [alarmTime, setAlarmTime] = useState("");
  const [isArmed, setIsArmed] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [message, setMessage] = useState("アラーム未設定");

  const audioRef = useRef(null);

  // 現在時刻
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

  // アラーム監視
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

  const setAlarm = () => {
    if (!alarmTime) {
      setMessage("時刻を設定しろ");
      return;
    }

    setIsArmed(true);
    setIsRinging(false);
    setMessage(`${alarmTime} にセットした`);
  };

  const ringAlarm = async () => {
    if (isRinging) return;

    setIsRinging(true);
    setIsArmed(false);
    setMessage("鳴ってるぞ");

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

  const stopAlarm = () => {
    setIsArmed(false);
    setIsRinging(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setMessage("止めた");
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

        {/* 下エリア */}
        <div className="bottom-area">
          {/* キャラ（横幅いっぱい） */}
          <img
            src="/character.png"
            alt="character"
            className="character"
          />

          {/* 土台＋ボタン */}
          <div className="stop-wrapper">
            <img
              src="/base.png"
              alt="base"
              className="stop-base"
            />

            <button className="stop-btn" onClick={stopAlarm}>
              止める
            </button>
          </div>
        </div>

        <audio ref={audioRef} src="/alarm.wav" preload="auto" />
      </div>
    </div>
  );
}