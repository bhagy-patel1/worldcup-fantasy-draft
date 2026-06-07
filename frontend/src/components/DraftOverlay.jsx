import { useState, useRef, useCallback } from 'react';
import { NATION_COLORS } from '../constants/formations';
import PlayerCard from './PlayerCard';
import FlagImg from './FlagImg';

const TIMER_MAX = 150; // 2 min 30 sec

export default function DraftOverlay({
  spinResult, isMyTurn, timeLeft,
  socket, roomId, roomState,
}) {
  const visible = !!spinResult;

  // Drawer height as % of screen — user can drag to resize
  const [heightPct, setHeightPct] = useState(60);
  const dragStartY = useRef(null);
  const dragStartH = useRef(null);

  const handleDragHandleMouseDown = useCallback((e) => {
    dragStartY.current = e.clientY ?? e.touches?.[0]?.clientY;
    dragStartH.current = heightPct;

    const onMove = (ev) => {
      const clientY = ev.clientY ?? ev.touches?.[0]?.clientY;
      if (clientY == null || dragStartY.current == null) return;
      const dy = dragStartY.current - clientY;
      const screenH = window.innerHeight;
      const newH = Math.max(20, Math.min(90, dragStartH.current + (dy / screenH) * 100));
      setHeightPct(newH);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchend',  onUp);
      dragStartY.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchend',  onUp);
  }, [heightPct]);

  const handleSelect = (f) => {
    if (!isMyTurn || !socket) return;
    socket.emit('player_draft_selection', { roomId, footballerId: f.id });
  };

  const nationColor = visible ? (NATION_COLORS[spinResult.nation] || '#6366f1') : '#6366f1';
  const timerPct    = timeLeft != null ? Math.max(0, (timeLeft / TIMER_MAX) * 100) : 100;
  const timerCol    = timeLeft == null  ? '#22c55e'
                    : timeLeft <= 15    ? '#ef4444'
                    : timeLeft <= 45    ? '#eab308'
                    : '#22c55e';
  const timerMin    = timeLeft != null ? Math.floor(timeLeft / 60) : '';
  const timerSec    = timeLeft != null ? String(timeLeft % 60).padStart(2, '0') : '';
  const activeName  = roomState?.players[roomState.turnQueueIndex]?.nickname;

  return (
    <div
      className="absolute left-0 right-0 z-40 flex flex-col pointer-events-none"
      style={{
        bottom:      '56px',
        height:      visible ? `calc(${heightPct}% - 56px)` : '0',
        transition:  dragStartY.current ? 'none' : 'height 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        className="flex flex-col flex-1 overflow-hidden rounded-t-2xl"
        style={{
          background:    'linear-gradient(180deg,#0d1b12 0%,#0a1209 100%)',
          border:        `1px solid ${nationColor}44`,
          borderBottom:  'none',
          boxShadow:     `0 -6px 40px ${nationColor}22, 0 -2px 0 ${nationColor}88`,
          pointerEvents: visible ? 'auto' : 'none',
          opacity:       visible ? 1 : 0,
          transition:    'opacity 0.2s ease',
        }}
      >
        {/* ── Drag handle */}
        <div
          className="shrink-0 flex justify-center items-center py-2 cursor-ns-resize select-none touch-none"
          onMouseDown={handleDragHandleMouseDown}
          onTouchStart={handleDragHandleMouseDown}
          title="Drag to resize"
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <div className="w-6 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
          </div>
        </div>

        {/* ── Header */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-2.5"
          style={{
            background:   `linear-gradient(90deg,${nationColor}28,transparent)`,
            borderBottom: `1px solid ${nationColor}33`,
          }}
        >
          <span className="text-3xl leading-none flex items-center">
            {visible && <FlagImg nation={spinResult.nation} size={40} style={{ borderRadius: '4px' }} />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-black text-base leading-none">
                {visible && spinResult.nation}
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: `${nationColor}33`,
                  color: '#fff',
                  border: `1px solid ${nationColor}55`,
                }}
              >
                {visible && `${spinResult.draftPool.length} players`}
              </span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {isMyTurn ? 'Tap a card to draft' : `${activeName} is selecting...`}
            </p>
          </div>

          {/* Timer */}
          {timeLeft != null && (
            <div className="shrink-0 flex flex-col items-end gap-1.5 min-w-16">
              <span className="font-black text-lg tabular-nums leading-none" style={{ color: timerCol }}>
                {timerMin}:{timerSec}
              </span>
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${timerPct}%`,
                    background: timerCol,
                    boxShadow: `0 0 8px ${timerCol}`,
                    transition: 'width 0.5s linear, background 0.3s',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Player grid */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {visible && spinResult.draftPool.length === 0 ? (
            <div className="flex items-center justify-center h-full py-12">
              <p className="text-gray-500 text-sm italic text-center px-4">
                All players from this nation have been drafted.
              </p>
            </div>
          ) : (
            <div
              className="p-3 sm:p-4"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                gap: '10px',
              }}
            >
              {visible &&
                [...spinResult.draftPool]
                  .sort((a, b) => b.ovr - a.ovr)
                  .map((f) => (
                    <PlayerCard
                      key={f.id}
                      footballer={f}
                      isDraftable={isMyTurn}
                      onSelect={handleSelect}
                    />
                  ))}
            </div>
          )}
        </div>

        {/* Waiting footer */}
        {visible && !isMyTurn && (
          <div
            className="shrink-0 py-2 text-center"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Waiting for {activeName} to pick...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
