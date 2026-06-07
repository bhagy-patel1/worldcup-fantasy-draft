import { useEffect, useRef, useState } from 'react';
import { NATION_COLORS, VALID_NATIONS, flagUrl } from '../constants/formations';
import FlagImg from './FlagImg';

// Wheel geometry
const CX = 250, CY = 250, R = 230, INNER_R = 48;
const TOTAL = VALID_NATIONS.length;
const ANGLE_STEP = (2 * Math.PI) / TOTAL;

function buildSegments() {
  return VALID_NATIONS.map((nation, i) => {
    const start = i * ANGLE_STEP - Math.PI / 2;
    const end   = start + ANGLE_STEP;
    const mid   = start + ANGLE_STEP / 2;
    const cos   = Math.cos, sin = Math.sin;

    const x1  = CX + R       * cos(start), y1  = CY + R       * sin(start);
    const x2  = CX + R       * cos(end),   y2  = CY + R       * sin(end);
    const ix1 = CX + INNER_R * cos(start), iy1 = CY + INNER_R * sin(start);
    const ix2 = CX + INNER_R * cos(end),   iy2 = CY + INNER_R * sin(end);

    const d = [
      `M ${ix1} ${iy1}`,
      `L ${x1} ${y1}`,
      `A ${R} ${R} 0 0 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${INNER_R} ${INNER_R} 0 0 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    const flagR = INNER_R + (R - INNER_R) * 0.68;
    const fx = CX + flagR * cos(mid);
    const fy = CY + flagR * sin(mid);

    const nameR = INNER_R + (R - INNER_R) * 0.36;
    const nx = CX + nameR * cos(mid);
    const ny = CY + nameR * sin(mid);

    const angleDeg = (mid * 180) / Math.PI;

    return { nation, d, fx, fy, nx, ny, angleDeg, color: NATION_COLORS[nation] || '#334155' };
  });
}

const SEGMENTS = buildSegments();
const SEG_DEG  = 360 / TOTAL;

export default function SpinWheel({
  socket, roomId, roomState, isMyTurn,
  spinData, spinResult, wheelAnimating, timeLeft,
}) {
  const wheelRef    = useRef(null);
  const rotRef      = useRef(0);
  const [rotDisp,   setRotDisp]   = useState(0);
  const [glowColor, setGlowColor] = useState(null);
  const rafRef      = useRef(null);
  const t0Ref       = useRef(null);

  useEffect(() => {
    if (!spinData) return;
    const { nation, duration } = spinData;
    t0Ref.current = Date.now();
    const base = rotRef.current;
    const idx  = VALID_NATIONS.indexOf(nation);
    const target = base + 5 * 360 + (360 - idx * SEG_DEG);

    setGlowColor(null);

    const tick = () => {
      const elapsed = Date.now() - t0Ref.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      const cur = base + eased * (target - base);

      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${cur}deg)`;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const final = target % 360;
        rotRef.current = final;
        setRotDisp(final);
        if (wheelRef.current) wheelRef.current.style.transform = `rotate(${final}deg)`;
        setGlowColor(NATION_COLORS[nation] || '#6366f1');
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [spinData]);

  const handleSpin = () => {
    if (!isMyTurn || wheelAnimating || !socket) return;
    socket.emit('trigger_wheel_spin', { roomId });
  };

  const activeName = roomState?.players[roomState.turnQueueIndex]?.nickname;
  const timerPct   = timeLeft != null ? (timeLeft / 30) * 100 : 100;
  const timerCol   = timeLeft == null ? '#22c55e' : timeLeft <= 5 ? '#ef4444' : timeLeft <= 15 ? '#eab308' : '#22c55e';
  const canSpin    = isMyTurn && !wheelAnimating && !spinResult;
  const spinCount  = roomState?.spinCount || 0;
  const tradeAlreadyOpen = roomState?.tradeWindowOpen;

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#080c1a 0%,#0f172a 40%,#1a103a 100%)' }}>

      {/* Header */}
      <div className="shrink-0 py-2.5 px-4 border-b border-white/5"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        <p className="text-center font-black text-white text-sm tracking-widest uppercase">
          Nation Draft Wheel
        </p>
        {roomState && (
          <p className={`text-center text-xs font-semibold mt-0.5 ${isMyTurn ? 'text-emerald-400' : 'text-indigo-300/70'}`}>
            {isMyTurn ? 'Your turn - Spin now!' : `Waiting for ${activeName}...`}
          </p>
        )}
      </div>

      {/* Wheel section */}
      <div className="shrink-0 flex flex-col items-center py-3 px-3">
        <div className="relative" style={{ width: '260px', height: '260px' }}>

          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full pointer-events-none transition-all duration-1000"
            style={{
              boxShadow: glowColor
                ? `0 0 60px 20px ${glowColor}66, 0 0 120px 40px ${glowColor}22`
                : wheelAnimating
                ? '0 0 30px 10px rgba(99,102,241,0.3)'
                : '0 0 15px 4px rgba(99,102,241,0.1)',
            }}
          />

          {/* Pointer */}
          <div className="absolute z-30 pointer-events-none"
            style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.9))' }}>
            <svg width="28" height="36" viewBox="0 0 28 36">
              <polygon points="14,2 2,34 14,26 26,34" fill="#f59e0b" />
              <polygon points="14,2 2,34 14,26 26,34" fill="none" stroke="#fde68a" strokeWidth="1.5" />
              <circle cx="14" cy="28" r="3" fill="#fbbf24" />
            </svg>
          </div>

          {/* SVG Wheel */}
          <svg
            ref={wheelRef}
            viewBox="0 0 500 500"
            width="260"
            height="260"
            style={{ display: 'block', transformOrigin: 'center', transform: `rotate(${rotDisp}deg)` }}
          >
            <defs>
              {SEGMENTS.map(({ nation, color }) => (
                <radialGradient key={nation} id={`g-${nation}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor={color} stopOpacity="1" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.65" />
                </radialGradient>
              ))}
              <radialGradient id="rim" cx="50%" cy="50%" r="50%">
                <stop offset="90%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
              </radialGradient>
            </defs>

            {SEGMENTS.map(({ nation, d }) => (
              <path key={`seg-${nation}`} d={d}
                fill={`url(#g-${nation})`}
                stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
            ))}

            {SEGMENTS.map(({ nation }, i) => {
              const a = i * ANGLE_STEP - Math.PI / 2;
              return (
                <line key={`div-${nation}`}
                  x1={CX + INNER_R * Math.cos(a)} y1={CY + INNER_R * Math.sin(a)}
                  x2={CX + R * Math.cos(a)}       y2={CY + R * Math.sin(a)}
                  stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              );
            })}

            <circle cx={CX} cy={CY} r={R} fill="url(#rim)" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />

            {SEGMENTS.map(({ nation, fx, fy, angleDeg }) => (
              <image
                key={`flag-${nation}`}
                href={flagUrl(nation, 32)}
                x={fx - 14} y={fy - 10}
                width="28" height="21"
                transform={`rotate(${angleDeg}, ${fx}, ${fy})`}
                style={{ pointerEvents: 'none' }}
                preserveAspectRatio="xMidYMid meet"
              />
            ))}

            {SEGMENTS.map(({ nation, nx, ny, angleDeg }) => (
              <text key={`name-${nation}`}
                x={nx} y={ny}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="10" fontWeight="bold"
                fill="rgba(255,255,255,0.85)"
                transform={`rotate(${angleDeg}, ${nx}, ${ny})`}
                style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {nation.slice(0, 3).toUpperCase()}
              </text>
            ))}

            <circle cx={CX} cy={CY} r={INNER_R + 6} fill="#080c1a" stroke="rgba(99,102,241,0.6)" strokeWidth="3" />
            <circle cx={CX} cy={CY} r={INNER_R}     fill="#0f172a" stroke="rgba(129,140,248,0.5)" strokeWidth="2" />
            <text x={CX} y={CY + 2} textAnchor="middle" dominantBaseline="middle"
              fontSize="28" style={{ userSelect: 'none' }}>
              ??
            </text>
          </svg>
        </div>

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={!canSpin}
          className="mt-3 font-black tracking-widest uppercase text-sm rounded-full px-10 py-2.5 select-none transition-all duration-200"
          style={{
            background: canSpin ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#1e293b',
            color:      canSpin ? '#fff' : '#475569',
            boxShadow:  canSpin ? '0 0 24px rgba(22,163,74,0.6),0 4px 16px rgba(0,0,0,0.5)' : 'none',
            cursor:     canSpin ? 'pointer' : 'not-allowed',
          }}
        >
          {wheelAnimating ? 'Spinning...' : spinResult ? spinResult.nation : 'SPIN!'}
        </button>

        {/* Timer bar */}
        {timeLeft !== null && (
          <div className="mt-2.5 w-full px-2">
            <div className="flex justify-between mb-1 text-xs font-bold" style={{ color: timerCol }}>
              <span>Time left</span>
              <span>{timeLeft}s</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${timerPct}%`, background: timerCol, boxShadow: `0 0 8px ${timerCol}88` }} />
            </div>
          </div>
        )}
      </div>

      {/* Nation result pill after spin — points to overlay below */}
      {spinResult && (
        <div className="shrink-0 mx-3 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: `${NATION_COLORS[spinResult.nation] || '#6366f1'}22`,
            border:     `1px solid ${NATION_COLORS[spinResult.nation] || '#6366f1'}55`,
          }}>
          <FlagImg nation={spinResult.nation} size={40} style={{ borderRadius: '4px' }} />
          <div className="min-w-0">
            <p className="text-white font-black text-sm leading-none">{spinResult.nation}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {spinResult.draftPool.length} players shown below
            </p>
          </div>
        </div>
      )}

      {/* Idle state */}
      {!spinResult && !wheelAnimating && roomState?.status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-center px-6 opacity-60">
            <div className="text-5xl mb-3">🎰</div>
            <p className="text-indigo-200 text-sm font-semibold">
              {isMyTurn ? 'Spin to reveal your nation!' : `Waiting for ${activeName}...`}
            </p>
          </div>

          {/* Trade window unlock button — visible to all after 22 spins */}
          {spinCount >= 22 && !tradeAlreadyOpen && (
            <button
              onClick={() => socket?.emit('open_trade_window', { roomId })}
              className="mx-4 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all"
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                color: '#fff',
                boxShadow: '0 0 24px rgba(124,58,237,0.5)',
              }}
            >
              🤝 Open Trade Window
            </button>
          )}

          {spinCount < 22 && (
            <p className="text-white/20 text-xs font-semibold px-4 text-center">
              Trade window unlocks after pick {22 - spinCount} more {22 - spinCount === 1 ? 'pick' : 'picks'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
