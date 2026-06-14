import { useEffect, useState, useRef } from 'react';
import PitchView from './PitchView';

/**
 * Full-screen overlay shown after all spins complete.
 * Gives players 1:30 to finalise their lineup, take a photo, and discuss.
 * Also lets any player propose/share their lineup to the room chat.
 */
export default function LineupReviewOverlay({ roomState, currentPlayer, socket, roomId, endsAt }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const [readyCount, setReadyCount] = useState(0);
  const totalPlayers = roomState?.players?.length || 1;

  // Derive ready count from chat messages ("is ready!")
  useEffect(() => {
    const readyMsgs = (roomState?.chatLog || []).filter(
      m => m.isSystem && m.text.includes('is ready!')
    );
    // Extract unique nicknames who are ready
    const nicknames = new Set(
      readyMsgs.map(m => {
        const match = m.text.match(/^(.+) is ready!/);
        return match ? match[1] : null;
      }).filter(Boolean)
    );
    setReadyCount(nicknames.size);
  }, [roomState?.chatLog]);

  // Countdown from endsAt
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [endsAt]);

  const handleShareLineup = () => {
    if (!socket || !currentPlayer) return;
    socket.emit('share_lineup', { roomId, nickname: currentPlayer.nickname });
  };

  const handleReady = () => {
    if (!socket) return;
    socket.emit('skip_lineup_review', { roomId });
  };

  const mins = timeLeft != null ? Math.floor(timeLeft / 60) : 1;
  const secs = timeLeft != null ? String(timeLeft % 60).padStart(2, '0') : '30';
  const timerColor = timeLeft == null ? '#22c55e' : timeLeft <= 20 ? '#ef4444' : timeLeft <= 45 ? '#eab308' : '#22c55e';
  const pct = timeLeft != null ? (timeLeft / 90) * 100 : 100;

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: '#060d17' }}>

      {/* Header banner */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-2.5"
        style={{ background: 'linear-gradient(90deg,rgba(34,197,94,0.18) 0%,rgba(16,185,129,0.12) 100%)', borderBottom: '1px solid rgba(34,197,94,0.25)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📸</span>
          <div>
            <p className="text-green-400 font-black text-sm leading-none tracking-wide">Lineup Review</p>
            <p className="text-white/40 text-xs mt-0.5">Finalise your squad, take a screenshot &amp; discuss</p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-xl font-black tabular-nums leading-none"
            style={{ color: timerColor }}
          >
            {mins}:{secs}
          </span>
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: timerColor }}
            />
          </div>
        </div>
      </div>

      {/* Pitch takes all remaining space */}
      <div className="flex-1 overflow-hidden">
        <PitchView
          roomState={roomState}
          currentPlayer={currentPlayer}
          socket={socket}
          roomId={roomId}
        />
      </div>

      {/* Action bar at the bottom */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3"
        style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-white/35 text-xs font-semibold hidden sm:block">
          {readyCount}/{totalPlayers} ready
        </p>

        <div className="flex gap-2 flex-1 sm:flex-initial justify-end">
          {/* Share lineup to chat */}
          <button
            onClick={handleShareLineup}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.45)',
              color: '#a5b4fc',
            }}
          >
            📋 Share Lineup
          </button>

          {/* Mark self as ready */}
          <button
            onClick={handleReady}
            className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            style={{
              background: 'linear-gradient(135deg,#16a34a,#15803d)',
              color: '#fff',
              boxShadow: '0 0 16px rgba(22,163,74,0.45)',
            }}
          >
            ✅ I'm Ready
          </button>
        </div>
      </div>
    </div>
  );
}
