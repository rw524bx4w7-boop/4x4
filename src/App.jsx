import { useState, useEffect, useRef, useCallback } from "react";

const DISCLAIMER_KEY = "n4x4_disclaimer_v1";

// Apple dark-mode system palette — semantic, high-contrast, research-backed
const C = {
  red:        "#ff375f",
  redDeep:    "#c0001c",
  green:      "#32d74b",
  greenDeep:  "#1a8a28",
  blue:       "#0a84ff",
  blueDeep:   "#0055c8",
  yellow:     "#ffd60a",
  yellowDeep: "#b38600",
};

function getBattStatus(v) {
  if (v >= 75) return { grade: "green",  label: "CRUSH IT",          sub: "Energy reserves optimal. Push to your limit.",   color: C.green,  cta: "CRUSH IT",          go: true  };
  if (v >= 50) return { grade: "yellow", label: "PROCEED WITH CARE", sub: "Moderate reserves. Dial back intensity if needed.", color: C.yellow, cta: "START WITH CARE",    go: true  };
  return         { grade: "red",    label: "NO GO",              sub: "Insufficient reserves. Rest or easy movement only.", color: C.red,    cta: "REST TODAY",         go: false };
}

function QuoteSplash({ onContinue }) {
  const [firing, setFiring] = useState(false);

  const execute = () => {
    if (firing) return;
    setFiring(true);
    setTimeout(onContinue, 420);
  };

  return (
    <>
      <style>{`
        @keyframes qs-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes qs-breathe {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        @keyframes qs-flash {
          0%   { opacity: 0; }
          25%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {firing && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: C.red,
          animation: "qs-flash 0.42s ease forwards",
          pointerEvents: "none",
        }} />
      )}

      <div style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "#000",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "56px 32px 48px",
      }}>
        <div style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: "rgba(255,255,255,0.28)", letterSpacing: 4.5,
          marginBottom: 28, opacity: 0,
          animation: "qs-up 0.7s ease 0.1s forwards",
        }}>
          BEFORE YOU BEGIN
        </div>

        <div style={{
          maxWidth: 360, textAlign: "center",
          fontSize: 27, fontWeight: 800,
          color: C.red,
          lineHeight: 1.28, letterSpacing: -0.6,
          fontFamily: "'Syne', sans-serif",
          opacity: 0,
          animation: "qs-up 0.8s ease 0.35s forwards, qs-breathe 3.2s ease-in-out 1.4s infinite",
        }}>
          Invest in your strength today, so your family doesn't have to finance your weakness in the future.
        </div>

        <div style={{
          width: 36, height: 1,
          background: "rgba(255,255,255,0.1)",
          margin: "36px 0", opacity: 0,
          animation: "qs-up 0.6s ease 0.7s forwards",
        }} />

        <button
          onClick={execute}
          style={{
            width: "100%", maxWidth: 360, height: 62,
            background: firing ? C.redDeep : C.red,
            border: "none", borderRadius: 16,
            color: "#fff",
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 14, letterSpacing: 4.5,
            cursor: "pointer",
            boxShadow: `0 12px 40px ${C.red}60`,
            opacity: 0,
            animation: "qs-up 0.7s ease 0.9s forwards",
            transition: "background 0.1s ease",
          }}
        >
          EXECUTE
        </button>

        <div style={{
          marginTop: 16,
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: "rgba(255,255,255,0.18)", letterSpacing: 2.5,
          opacity: 0,
          animation: "qs-up 0.6s ease 1.1s forwards",
        }}>
          Norwegian 4×4 · 42 minutes
        </div>
      </div>
    </>
  );
}

function Disclaimer({ onAccept }) {
  const [checked, setChecked] = useState(false);

  return (
    <>
      <style>{`
        @keyframes disclaimerUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#060c12",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 22px",
      }}>
        <div style={{
          maxWidth: 440, width: "100%",
          animation: "disclaimerUp 0.5s ease both",
        }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.9 }}>
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.759 3.872 2 6.5 2c1.972 0 3.963 1.073 5.5 3.093C13.537 3.073 15.528 2 17.5 2 20.128 2 23 3.76 23 7.191c0 4.105-5.37 8.863-11 14.402z"
                fill={C.red} opacity="0.85"/>
            </svg>
          </div>

          <div style={{
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            color: "rgba(255,255,255,0.45)", letterSpacing: 3.5,
            textAlign: "center", marginBottom: 8,
          }}>
            HEALTH & SAFETY
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: "#fff",
            letterSpacing: -0.5, textAlign: "center", marginBottom: 24,
          }}>
            Cardiac Disclosure
          </div>

          <div style={{
            background: "rgba(255,255,255,0.028)",
            border: "1px solid rgba(255,255,255,0.075)",
            borderRadius: 16, padding: "20px 22px",
            marginBottom: 20,
          }}>
            {[
              "Norwegian 4×4 interval training is a high-intensity cardiovascular protocol that raises your heart rate to 90–95% of maximum. It places significant stress on the heart and cardiovascular system.",
              "This app is a timer only. It does not monitor your health, detect cardiac events, or provide medical advice. It is not a substitute for professional medical guidance.",
              "Before starting this or any high-intensity exercise program, consult a qualified physician — especially if you have a history of heart disease, high blood pressure, arrhythmia, chest pain, shortness of breath, or any other cardiovascular condition.",
              "Stop exercising immediately and seek emergency medical attention if you experience chest pain, irregular heartbeat, severe shortness of breath, dizziness, or fainting.",
              "By continuing, you confirm that you have read this disclosure, understand the risks involved, and accept sole responsibility for your participation.",
            ].map((text, i) => (
              <p key={i} style={{
                fontSize: 12, lineHeight: 1.7,
                color: "rgba(255,255,255,0.65)",
                fontFamily: "system-ui, sans-serif",
                marginBottom: i < 4 ? 14 : 0,
              }}>
                {text}
              </p>
            ))}
          </div>

          <label style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            cursor: "pointer", marginBottom: 20, userSelect: "none",
          }}>
            <div
              onClick={() => setChecked(c => !c)}
              style={{
                width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
                background: checked ? C.red : "transparent",
                border: `1.5px solid ${checked ? C.red : "rgba(255,255,255,0.25)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              {checked && (
                <svg width="11" height="11" viewBox="0 0 11 11">
                  <polyline points="1.5,5.5 4,8 9.5,2" fill="none" stroke="#fff"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span style={{
              fontSize: 12, lineHeight: 1.6,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "system-ui, sans-serif",
            }}>
              I have read and understood the cardiac disclosure above. I confirm I am physically capable of high-intensity exercise and accept full responsibility for my participation.
            </span>
          </label>

          <button
            onClick={() => { if (checked) onAccept(); }}
            disabled={!checked}
            style={{
              width: "100%", height: 56,
              background: checked
                ? `linear-gradient(140deg, ${C.redDeep}, ${C.red})`
                : "rgba(255,255,255,0.04)",
              border: checked ? "none" : "1.5px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              color: checked ? "#fff" : "rgba(255,255,255,0.25)",
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: 13, letterSpacing: 2.5,
              cursor: checked ? "pointer" : "not-allowed",
              transition: "all 0.3s ease",
              boxShadow: checked ? `0 6px 24px ${C.red}48` : "none",
            }}
          >
            I UNDERSTAND — CONTINUE
          </button>

          <p style={{
            textAlign: "center", marginTop: 14,
            fontSize: 10, fontFamily: "'DM Mono', monospace",
            color: "rgba(255,255,255,0.25)", letterSpacing: 1.5,
          }}>
            YOUR ACCEPTANCE IS RECORDED LOCALLY ON THIS DEVICE
          </p>
        </div>
      </div>
    </>
  );
}

function BodyBatteryGate({ onContinue }) {
  const [value, setValue] = useState(50);
  const [confirmed, setConfirmed] = useState(false);

  const status = getBattStatus(value);

  const handleCta = () => {
    if (status.go) { onContinue(value); return; }
    setConfirmed(true); // show override option for red
  };

  const TIERS = [
    { range: "75 – 100", ...getBattStatus(75) },
    { range: "50 – 74",  ...getBattStatus(60) },
    { range: "0 – 49",   ...getBattStatus(20) },
  ];

  return (
    <>
      <style>{`
        @keyframes bb-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "#000",
        overflowY: "auto",
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: "48px 32px",
      }}>
        <div style={{ flex: 1 }} />
        {/* Eyebrow */}
        <div style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          color: "rgba(255,255,255,0.28)", letterSpacing: 4.5,
          marginBottom: 20, opacity: 0,
          animation: "bb-up 0.6s ease 0.05s forwards",
        }}>
          PRE-WORKOUT CHECK
        </div>

        {/* Title */}
        <div style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          letterSpacing: -0.8, textAlign: "center", lineHeight: 1.1,
          marginBottom: 32, opacity: 0,
          animation: "bb-up 0.6s ease 0.15s forwards",
        }}>
          Body Battery
        </div>

        {/* Stepper */}
        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          marginBottom: 32, opacity: 0,
          animation: "bb-up 0.7s ease 0.25s forwards",
        }}>
          <button
            onClick={() => setValue(v => Math.max(0, v - 1))}
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              color: "#fff", fontSize: 22, fontWeight: 300,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >−</button>

          <input
            type="number" min="0" max="100"
            value={value}
            onChange={e => {
              const n = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
              setValue(n);
            }}
            style={{
              width: 96, textAlign: "center",
              fontSize: 56, fontWeight: 800,
              color: status.color,
              fontFamily: "'Syne', sans-serif",
              background: "transparent", border: "none", outline: "none",
              transition: "color 0.3s ease",
            }}
          />

          <button
            onClick={() => setValue(v => Math.min(100, v + 1))}
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1.5px solid rgba(255,255,255,0.12)",
              color: "#fff", fontSize: 22, fontWeight: 300,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >+</button>
        </div>

        {/* Tier legend */}
        <div style={{
          width: "100%", maxWidth: 320,
          display: "flex", flexDirection: "column", gap: 8,
          marginBottom: 28, opacity: 0,
          animation: "bb-up 0.7s ease 0.35s forwards",
        }}>
          {TIERS.map(t => {
            const active = status.grade === t.grade;
            return (
              <div key={t.grade} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 12,
                background: active ? `${t.color}18` : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${active ? `${t.color}55` : "rgba(255,255,255,0.06)"}`,
                transition: "all 0.3s ease",
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: t.color,
                  boxShadow: active ? `0 0 10px ${t.color}99` : "none",
                  transition: "box-shadow 0.3s ease",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    fontFamily: "'Syne', sans-serif",
                    color: active ? t.color : "rgba(255,255,255,0.45)",
                    letterSpacing: 1.5,
                    transition: "color 0.3s ease",
                  }}>
                    {t.label}
                  </div>
                  {active && (
                    <div style={{
                      fontSize: 10, fontFamily: "'DM Mono', monospace",
                      color: "rgba(255,255,255,0.5)", marginTop: 2,
                    }}>
                      {t.sub}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 9, fontFamily: "'DM Mono', monospace",
                  color: active ? t.color : "rgba(255,255,255,0.25)",
                  letterSpacing: 1,
                }}>
                  {t.range}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{
          width: "100%", maxWidth: 320, opacity: 0,
          animation: "bb-up 0.7s ease 0.5s forwards",
        }}>
          <button
            onClick={handleCta}
            style={{
              width: "100%", height: 60,
              background: status.go
                ? `linear-gradient(140deg, ${status.grade === "green" ? C.greenDeep : C.yellowDeep}, ${status.color})`
                : `linear-gradient(140deg, ${C.redDeep}, ${C.red})`,
              border: "none", borderRadius: 16,
              color: status.grade === "yellow" ? "#000" : "#fff",
              fontFamily: "'Syne', sans-serif", fontWeight: 800,
              fontSize: 13, letterSpacing: 3.5,
              cursor: "pointer",
              boxShadow: `0 10px 36px ${status.color}50`,
              transition: "all 0.3s ease",
            }}
          >
            {status.cta}
          </button>

          {/* Red override */}
          {status.grade === "red" && confirmed && (
            <button
              onClick={() => onContinue(value)}
              style={{
                width: "100%", marginTop: 12, height: 44,
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, letterSpacing: 2.5,
                cursor: "pointer",
              }}
            >
              OVERRIDE — PROCEED ANYWAY
            </button>
          )}
        </div>
        <div style={{ flex: 1 }} />
      </div>
    </>
  );
}

const MAX_OSCILLATORS = 4;

const PHASES = [
  { id: "warmup",    label: "Warm-Up",    short: "WU", duration: 600, type: "rest",     color: C.blue,  accent: C.blueDeep,  targetHR: "60–70%" },
  { id: "interval1", label: "Interval 1", short: "I1", duration: 240, type: "work",     color: C.red,   accent: C.redDeep,   targetHR: "90–95%" },
  { id: "recovery1", label: "Recovery",   short: "R1", duration: 180, type: "recovery", color: C.green, accent: C.greenDeep, targetHR: "~70%" },
  { id: "interval2", label: "Interval 2", short: "I2", duration: 240, type: "work",     color: C.red,   accent: C.redDeep,   targetHR: "90–95%" },
  { id: "recovery2", label: "Recovery",   short: "R2", duration: 180, type: "recovery", color: C.green, accent: C.greenDeep, targetHR: "~70%" },
  { id: "interval3", label: "Interval 3", short: "I3", duration: 240, type: "work",     color: C.red,   accent: C.redDeep,   targetHR: "90–95%" },
  { id: "recovery3", label: "Recovery",   short: "R3", duration: 180, type: "recovery", color: C.green, accent: C.greenDeep, targetHR: "~70%" },
  { id: "interval4", label: "Interval 4", short: "I4", duration: 240, type: "work",     color: C.red,   accent: C.redDeep,   targetHR: "90–95%" },
  { id: "cooldown",  label: "Cool-Down",  short: "CD", duration: 300, type: "rest",     color: C.blue,  accent: C.blueDeep,  targetHR: "60–70%" },
];

const TOTAL = PHASES.reduce((s, p) => s + p.duration, 0);

function fmt(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function getPhaseFromTotal(total) {
  let rem = Math.min(total, TOTAL);
  for (let i = 0; i < PHASES.length; i++) {
    if (rem < PHASES[i].duration) return { phaseIdx: i, phaseElapsed: rem };
    rem -= PHASES[i].duration;
  }
  return { phaseIdx: PHASES.length - 1, phaseElapsed: PHASES[PHASES.length - 1].duration };
}

function ArcRing({ progress, color, size = 260, strokeWidth = 3, glow = false, children }) {
  const cx = size / 2, cy = size / 2;
  const r = (size - strokeWidth * 2 - 16) / 2;
  const circ = 2 * Math.PI * r;
  const clampedP = Math.max(0, Math.min(1, progress));
  const offset = circ * (1 - clampedP);
  const filterId = `glow-${color.replace("#", "")}`;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <defs>
          {glow && (
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          )}
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
        {clampedP > 0 && (
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            filter={glow ? `url(#${filterId})` : undefined}
            style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.8s ease" }}
          />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function PhaseNode({ phase, isCurrent, isPast }) {
  const isWork = phase.type === "work";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      opacity: isPast ? 0.35 : isCurrent ? 1 : 0.4,
      transition: "opacity 0.5s ease",
    }}>
      <div style={{
        width: isCurrent ? 26 : isWork ? 20 : 14,
        height: isCurrent ? 26 : isWork ? 20 : 14,
        borderRadius: "50%",
        background: isCurrent ? phase.color : isPast ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
        border: isCurrent ? `2px solid ${phase.color}` : `1.5px solid ${isPast ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
        boxShadow: isCurrent ? `0 0 14px ${phase.color}66, 0 0 28px ${phase.color}22` : "none",
        transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isPast && (
          <svg width="8" height="8" viewBox="0 0 8 8">
            <polyline points="1.5,4 3,5.5 6.5,2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span style={{
        fontSize: 8, fontFamily: "'DM Mono', monospace",
        color: isCurrent ? phase.color : "rgba(255,255,255,0.45)",
        letterSpacing: 1, transition: "color 0.5s ease"
      }}>
        {phase.short}
      </span>
    </div>
  );
}

export default function App() {
  const [showQuote, setShowQuote] = useState(true);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseElapsed, setPhaseElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(
    () => localStorage.getItem(DISCLAIMER_KEY) === "1"
  );
  const [bodyBattery, setBodyBattery] = useState(null);

  const intervalRef = useRef(null);
  const audioCtx = useRef(null);
  const activeOscillators = useRef(0);
  const wakeLockRef = useRef(null);
  const totalElapsedRef = useRef(0);
  const runStartRef = useRef(null);
  const runBaseRef = useRef(0);

  const beep = useCallback((freq = 880, dur = 0.12, vol = 0.25) => {
    if (activeOscillators.current >= MAX_OSCILLATORS) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      activeOscillators.current++;
      osc.onended = () => { activeOscillators.current--; };
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch {}
  }, []);

  const transitionBeep = useCallback(() => {
    beep(660, 0.08);
    setTimeout(() => beep(880, 0.1), 100);
    setTimeout(() => beep(1100, 0.18), 220);
  }, [beep]);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  useEffect(() => { totalElapsedRef.current = totalElapsed; }, [totalElapsed]);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock = null;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request("screen"); wakeLockRef.current = lock; } catch {}
    };
    acquire();
    const onVisibility = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!running || done) return;
    runStartRef.current = Date.now();
    runBaseRef.current = totalElapsedRef.current;
    let prevPIdx = getPhaseFromTotal(runBaseRef.current).phaseIdx;
    let lastProcessed = runBaseRef.current;
    let lastCountdownBeep = -1;
    intervalRef.current = setInterval(() => {
      const newTotal = Math.min(
        runBaseRef.current + Math.floor((Date.now() - runStartRef.current) / 1000),
        TOTAL
      );
      if (newTotal <= lastProcessed) return;
      lastProcessed = newTotal;
      const { phaseIdx: newPIdx, phaseElapsed: newPE } = getPhaseFromTotal(newTotal);
      const newRemaining = PHASES[newPIdx].duration - newPE;
      if (newPIdx !== prevPIdx) {
        prevPIdx = newPIdx;
        transitionBeep();
        setTransitioning(true);
        setTimeout(() => setTransitioning(false), 700);
      }
      if (newRemaining <= 3 && newRemaining > 0 && newRemaining !== lastCountdownBeep) {
        lastCountdownBeep = newRemaining;
        beep(newRemaining === 1 ? 1100 : 660, 0.07);
      }
      if (newTotal >= TOTAL) {
        transitionBeep();
        setTotalElapsed(TOTAL);
        const final = getPhaseFromTotal(TOTAL);
        setPhaseIdx(final.phaseIdx);
        setPhaseElapsed(final.phaseElapsed);
        setDone(true);
        setRunning(false);
        return;
      }
      setTotalElapsed(newTotal);
      setPhaseIdx(newPIdx);
      setPhaseElapsed(newPE);
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [running, done, beep, transitionBeep]);

  const acceptDisclaimer = () => {
    localStorage.setItem(DISCLAIMER_KEY, "1");
    setDisclaimerAccepted(true);
  };

  const toggle = () => {
    if (done) return;
    if (!running) beep(528, 0.08);
    setRunning(r => !r);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false); setDone(false); setTransitioning(false);
    setPhaseIdx(0); setPhaseElapsed(0); setTotalElapsed(0);
  };

  const skipToInterval1 = () => {
    clearInterval(intervalRef.current);
    const i1 = PHASES.findIndex(p => p.id === "interval1");
    const elapsed = PHASES.slice(0, i1).reduce((s, p) => s + p.duration, 0);
    setPhaseIdx(i1); setPhaseElapsed(0); setTotalElapsed(elapsed); setRunning(false);
  };

  if (showQuote) return <QuoteSplash onContinue={() => setShowQuote(false)} />;
  if (!disclaimerAccepted) return <Disclaimer onAccept={acceptDisclaimer} />;
  if (bodyBattery === null) return <BodyBatteryGate onContinue={setBodyBattery} />;

  const phase = PHASES[phaseIdx];
  const phaseRemaining = phase.duration - phaseElapsed;
  const phaseProgress = phaseElapsed / phase.duration;
  const totalProgress = totalElapsed / TOTAL;
  const completedWork = PHASES.slice(0, phaseIdx).filter(p => p.type === "work").length;
  const isWork = phase.type === "work";
  const isCountdown = phaseRemaining <= 3 && running && phaseRemaining > 0;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #060c12; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulseGlow { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes breathe { 0%,100%{transform:scale(1) translateX(-50%)} 50%{transform:scale(1.08) translateX(-46%)} }
        @keyframes flashIn { 0%,100%{opacity:0} 40%{opacity:0.1} }
        button { cursor: pointer; }
        button:active { transform: scale(0.97) !important; transition: transform 0.1s ease !important; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: done ? "#001a08" : isWork ? "#160008" : "#060c12",
        transition: "background 1.4s cubic-bezier(0.4,0,0.2,1)"
      }} />

      <div style={{
        position: "fixed", top: "-8%", left: "50%", transform: "translateX(-50%)",
        width: 560, height: 420, borderRadius: "50%",
        background: done
          ? `radial-gradient(ellipse, ${C.green}18 0%, transparent 65%)`
          : isWork
          ? `radial-gradient(ellipse, ${C.red}1e 0%, transparent 65%)`
          : `radial-gradient(ellipse, ${C.blue}14 0%, transparent 65%)`,
        pointerEvents: "none", zIndex: 0,
        transition: "background 1.4s ease",
        animation: isWork && running ? "breathe 3.5s ease-in-out infinite" : "none"
      }} />

      {transitioning && (
        <div style={{
          position: "fixed", inset: 0, background: phase.color,
          opacity: 0, animation: "flashIn 0.7s ease forwards",
          pointerEvents: "none", zIndex: 50
        }} />
      )}

      <div style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", padding: "0 22px 48px",
        maxWidth: 480, margin: "0 auto",
        opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease",
      }}>

        <div style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", paddingTop: 56, paddingBottom: 28,
          animation: "fadeUp 0.55s ease both", animationDelay: "0.05s"
        }}>
          <div>
            <div style={{
              fontSize: 10, fontFamily: "'DM Mono', monospace",
              color: "rgba(255,255,255,0.45)", letterSpacing: 3.5, marginBottom: 6
            }}>
              VO₂MAX PROTOCOL
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -0.8, lineHeight: 1 }}>
              Norwegian 4×4
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, paddingTop: 4 }}>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.45)", letterSpacing: 2.5 }}>
              INTERVALS
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 4, borderRadius: 2,
                  width: i < completedWork ? 20 : (i === completedWork && isWork ? 14 : 10),
                  background: i < completedWork
                    ? C.red
                    : i === completedWork && isWork
                    ? `${C.red}70`
                    : "rgba(255,255,255,0.09)",
                  transition: "all 0.55s cubic-bezier(0.4,0,0.2,1)"
                }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", marginBottom: 40,
          animation: "fadeUp 0.55s ease both", animationDelay: "0.15s"
        }}>
          {PHASES.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center" }}>
              <PhaseNode
                phase={p}
                isCurrent={i === phaseIdx && !done}
                isPast={i < phaseIdx || done}
              />
              {i < PHASES.length - 1 && (
                <div style={{
                  width: i < phaseIdx || done ? 12 : 9, height: 1.5,
                  background: i < phaseIdx || done ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
                  marginBottom: 20, transition: "all 0.5s ease"
                }} />
              )}
            </div>
          ))}
        </div>

        {done ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "28px 0 36px",
            animation: "fadeUp 0.45s ease both"
          }}>
            <div style={{
              fontSize: 86, fontWeight: 800, letterSpacing: -4, lineHeight: 1,
              color: C.green, textShadow: `0 0 60px ${C.green}48`
            }}>
              Done.
            </div>
            <div style={{
              fontSize: 11, fontFamily: "'DM Mono', monospace",
              color: "rgba(255,255,255,0.55)", letterSpacing: 3, marginTop: 14
            }}>
              42:00 · WORKOUT COMPLETE
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            width: "100%",
            animation: "fadeUp 0.55s ease both", animationDelay: "0.25s"
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                fontSize: 12, fontFamily: "'DM Mono', monospace",
                color: phase.color, letterSpacing: 4,
                transition: "color 0.7s ease", marginBottom: 10
              }}>
                {phase.label.toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: phase.color,
                  boxShadow: `0 0 8px ${phase.color}`,
                  animation: isWork && running ? "pulseGlow 1s ease infinite" : "none"
                }} />
                <span style={{
                  fontSize: 10, fontFamily: "'DM Mono', monospace",
                  color: "rgba(255,255,255,0.55)", letterSpacing: 2
                }}>
                  TARGET {phase.targetHR} MAX HR
                </span>
              </div>
            </div>

            <ArcRing
              progress={phaseProgress}
              color={phase.color}
              size={272}
              strokeWidth={3}
              glow={isWork && running}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: isCountdown ? 84 : 70,
                  fontWeight: 800,
                  letterSpacing: -3,
                  lineHeight: 1,
                  color: isCountdown ? phase.color : "#ffffff",
                  transition: "color 0.3s ease, font-size 0.15s ease",
                  animation: isCountdown ? "pulseGlow 0.45s ease infinite" : "none",
                  textShadow: isWork && running ? `0 0 50px ${phase.color}33` : "none",
                  userSelect: "none"
                }}>
                  {fmt(phaseRemaining)}
                </div>
                <div style={{
                  fontSize: 9, fontFamily: "'DM Mono', monospace",
                  color: "rgba(255,255,255,0.45)", letterSpacing: 3.5, marginTop: 10
                }}>
                  PHASE
                </div>
              </div>
            </ArcRing>

            <div style={{ width: "100%", marginTop: 30, padding: "0 4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>
                  {fmt(totalElapsed)}
                </span>
                <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>
                  −{fmt(TOTAL - totalElapsed)}
                </span>
              </div>
              <div style={{ position: "relative", height: 3, background: "rgba(255,255,255,0.055)", borderRadius: 2 }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${totalProgress * 100}%`,
                  background: `linear-gradient(90deg, ${phase.accent}, ${phase.color})`,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${phase.color}55`,
                  transition: "width 0.65s cubic-bezier(0.4,0,0.2,1), background 0.9s ease"
                }} />
                {PHASES.slice(1).map((p, i) => {
                  const pos = PHASES.slice(0, i + 1).reduce((s, ph) => s + ph.duration, 0) / TOTAL;
                  return (
                    <div key={p.id} style={{
                      position: "absolute", top: -2, bottom: -2,
                      left: `${pos * 100}%`, width: 1,
                      background: "rgba(255,255,255,0.07)",
                      transform: "translateX(-50%)"
                    }} />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 10, marginTop: 36, width: "100%",
          animation: "fadeUp 0.55s ease both", animationDelay: "0.45s"
        }}>
          {!done && (
            <button
              onClick={toggle}
              style={{
                width: "100%", height: 60,
                background: running
                  ? "rgba(255,255,255,0.04)"
                  : `linear-gradient(140deg, ${phase.accent} 0%, ${phase.color} 100%)`,
                border: running ? "1.5px solid rgba(255,255,255,0.09)" : "none",
                borderRadius: 16,
                color: running ? "rgba(255,255,255,0.85)" : "#fff",
                fontFamily: "'Syne', sans-serif", fontWeight: 700,
                fontSize: 14, letterSpacing: 2.5,
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                boxShadow: running ? "none" : `0 6px 28px ${phase.color}40, 0 2px 8px rgba(0,0,0,0.5)`,
                backdropFilter: "blur(20px)",
              }}
            >
              {running ? "PAUSE" : phaseElapsed === 0 && phaseIdx === 0 ? "START WORKOUT" : "RESUME"}
            </button>
          )}

          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            {!done && phaseIdx === 0 && (
              <button
                onClick={skipToInterval1}
                style={{
                  flex: 1, height: 48,
                  background: `${C.red}12`,
                  border: `1.5px solid ${C.red}38`,
                  borderRadius: 13,
                  color: C.red,
                  fontFamily: "'Syne', sans-serif", fontWeight: 600,
                  fontSize: 11, letterSpacing: 1.5,
                  transition: "all 0.25s ease",
                }}
              >
                SKIP TO INT 1
              </button>
            )}
            <button
              onClick={reset}
              style={{
                flex: 1, height: 48,
                background: "rgba(255,255,255,0.025)",
                border: "1.5px solid rgba(255,255,255,0.065)",
                borderRadius: 13,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'Syne', sans-serif", fontWeight: 600,
                fontSize: 11, letterSpacing: 1.5,
                transition: "all 0.25s ease",
              }}
            >
              RESET
            </button>
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8, width: "100%", marginTop: 20,
          animation: "fadeUp 0.55s ease both", animationDelay: "0.55s"
        }}>
          {(() => {
            const batt = getBattStatus(bodyBattery);
            return [
              { label: "WORK",      value: `${completedWork}/4`,   sub: "intervals",             color: null },
              { label: "ELAPSED",   value: fmt(totalElapsed),       sub: `of ${fmt(TOTAL)}`,      color: null },
              { label: "BODY BATT", value: String(bodyBattery),     sub: batt.label,              color: batt.color },
            ].map(s => (
              <div key={s.label} style={{
                background: s.color ? `${s.color}10` : "rgba(255,255,255,0.028)",
                border: `1px solid ${s.color ? `${s.color}35` : "rgba(255,255,255,0.055)"}`,
                borderRadius: 14, padding: "14px 10px",
                textAlign: "center",
                transition: "all 0.4s ease",
              }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.45)", letterSpacing: 2, marginBottom: 7 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, color: s.color || "rgba(255,255,255,0.92)", letterSpacing: -0.5, lineHeight: 1, transition: "color 0.3s ease" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: s.color ? `${s.color}cc` : "rgba(255,255,255,0.38)", letterSpacing: 1, marginTop: 5, transition: "color 0.3s ease" }}>
                  {s.sub}
                </div>
              </div>
            ));
          })()}
        </div>

        {!done && PHASES[phaseIdx + 1] && (
          <div style={{
            width: "100%", marginTop: 10,
            background: "rgba(255,255,255,0.018)",
            border: "1px solid rgba(255,255,255,0.045)",
            borderRadius: 14, padding: "14px 18px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            animation: "fadeUp 0.55s ease both", animationDelay: "0.65s"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: PHASES[phaseIdx + 1].color, opacity: 0.6
              }} />
              <div>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.45)", letterSpacing: 2.5, marginBottom: 3 }}>
                  UP NEXT
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.72)" }}>
                  {PHASES[phaseIdx + 1].label}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.65)" }}>
                {fmt(PHASES[phaseIdx + 1].duration)}
              </div>
              <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginTop: 3 }}>
                {PHASES[phaseIdx + 1].targetHR} MAX HR
              </div>
            </div>
          </div>
        )}

        {done && (
          <button
            onClick={reset}
            style={{
              marginTop: 32, width: "100%", height: 60,
              background: `linear-gradient(140deg, ${C.greenDeep}, ${C.green})`,
              border: "none", borderRadius: 16,
              color: "#fff", fontFamily: "'Syne', sans-serif",
              fontWeight: 700, fontSize: 14, letterSpacing: 2.5,
              boxShadow: `0 8px 32px ${C.green}48`,
              animation: "fadeUp 0.45s ease both",
              transition: "all 0.3s ease"
            }}
          >
            GO AGAIN
          </button>
        )}
      </div>
    </>
  );
}