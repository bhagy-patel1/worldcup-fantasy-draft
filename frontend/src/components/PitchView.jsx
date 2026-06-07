import { useState, useEffect } from 'react';
import { FORMATIONS } from '../constants/formations';
import PlayerCard from './PlayerCard';

export default function PitchView({ roomState, currentPlayer, socket, roomId }) {
  const [viewingNickname, setViewingNickname] = useState(null);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');

  if (!roomState || !currentPlayer) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <p className="text-gray-500 text-sm">Loading pitch…</p>
      </div>
    );
  }

  const myNickname = currentPlayer.nickname;
  const activeNickname = viewingNickname || myNickname;
  const activePlayer = roomState.players.find(p => p.nickname === activeNickname) || roomState.players[0];
  const isOwnPitch = activePlayer?.nickname === myNickname;

  if (!activePlayer) return <div className="h-full bg-gray-900" />;

  const formation = activePlayer.formation || '4-3-3';
  const currentFormation = isOwnPitch ? selectedFormation : formation;
  const slots = FORMATIONS[currentFormation] || FORMATIONS['4-3-3'];

  useEffect(() => {
    setSelectedFormation(activePlayer.formation || '4-3-3');
  }, [activePlayer.formation]);

  const filledSlots = Object.values(activePlayer.lineup).filter(Boolean);
  const teamOvr = filledSlots.length
    ? Math.round(filledSlots.reduce((sum, p) => sum + (p.ovr || 0), 0) / filledSlots.length)
    : 0;

  const handleFormationSwitch = (f) => {
    if (!isOwnPitch || !socket) return;
    setSelectedFormation(f);
    socket.emit('switch_formation', { roomId, formation: f });
  };

  const handleSlotClick = (slotKey) => {
    if (!isOwnPitch) return;
    const occupant = activePlayer.lineup[slotKey];
    if (occupant) {
      socket.emit('remove_from_slot', { roomId, slotKey });
    } else if (selectedBenchPlayer) {
      socket.emit('assign_to_slot', { roomId, footballerId: selectedBenchPlayer.id, slotKey });
      setSelectedBenchPlayer(null);
    }
  };

  const handleBenchCardClick = (footballer) => {
    if (!isOwnPitch) return;
    setSelectedBenchPlayer(prev => prev?.id === footballer.id ? null : footballer);
  };

  const handleDragStart = (e, footballer, source) => {
    setDragSource({ footballer, ...source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSlot = (e, slotKey) => {
    e.preventDefault();
    if (!dragSource || !isOwnPitch) return;
    const { footballer, type, slotKey: fromSlot } = dragSource;
    if (type === 'slot' && fromSlot === slotKey) { setDragSource(null); return; }
    if (type === 'slot') socket.emit('remove_from_slot', { roomId, slotKey: fromSlot });
    socket.emit('assign_to_slot', { roomId, footballerId: footballer.id, slotKey });
    setDragSource(null);
    setSelectedBenchPlayer(null);
  };

  const handleDropOnBench = (e) => {
    e.preventDefault();
    if (!dragSource || !isOwnPitch) return;
    const { type, slotKey: fromSlot } = dragSource;
    if (type === 'slot' && fromSlot) socket.emit('remove_from_slot', { roomId, slotKey: fromSlot });
    setDragSource(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#06150f]">

      {/* ── Compact header: name + OVR only ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest text-green-400 truncate">
            {activePlayer.nickname}'s Squad
          </span>
          <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5">
            {currentFormation}
          </span>
          {selectedBenchPlayer && (
            <span className="text-[10px] text-yellow-400 font-semibold whitespace-nowrap">
              📌 {selectedBenchPlayer.name.split(' ').pop()}
            </span>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest">OVR</p>
          <p className="text-base font-black text-white leading-none">{teamOvr || '—'}</p>
        </div>
      </div>

      {/* ── Player tabs ── */}
      <div className="shrink-0 flex gap-1 px-2 pt-1.5 pb-1 bg-black/40 border-b border-white/10 overflow-x-auto">
        {roomState.players.map(p => (
          <button
            key={p.nickname}
            onClick={() => setViewingNickname(p.nickname)}
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap
              ${activeNickname === p.nickname ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}
            `}
          >
            {p.nickname === myNickname ? '⚽ ' : ''}{p.nickname}{p.nickname === myNickname ? ' (You)' : ''}
          </button>
        ))}
      </div>

      {/* ── Formation pills (own pitch only) ── */}
      {isOwnPitch && (
        <div className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 bg-black/30 border-b border-white/10 overflow-x-auto">
          <span className="shrink-0 text-[9px] text-white/30 uppercase tracking-widest font-bold mr-1">Formation</span>
          {Object.keys(FORMATIONS).map(f => (
            <button
              key={f}
              onClick={() => handleFormationSwitch(f)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${
                currentFormation === f
                  ? 'bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* ── Pitch (takes all remaining space) ── */}
      <div className="flex-1 relative overflow-hidden p-1">
        <div className="absolute inset-0 bg-[#04140d]" />
        <div className="absolute inset-0 pitch-surface" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,180,80,0.08) 0%, transparent 70%), radial-gradient(circle at 50% 42%, rgba(255,255,255,0.06), transparent 38%)' }}
        />

        {/* Pitch markings — full stadium look */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
          {/* Outer border */}
          <rect x="2%" y="1%" width="96%" height="98%" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" rx="2" />

          {/* Halfway line */}
          <line x1="2%" y1="50%" x2="98%" y2="50%" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />

          {/* Centre circle */}
          <ellipse cx="50%" cy="50%" rx="11%" ry="16%" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />

          {/* Centre spot */}
          <circle cx="50%" cy="50%" r="2.5" fill="rgba(255,255,255,0.5)" />

          {/* ── TOP (attacking) end ── */}
          {/* Penalty area */}
          <rect x="22%" y="1%" width="56%" height="20%" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          {/* 6-yard box */}
          <rect x="34%" y="1%" width="32%" height="8%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          {/* Goal */}
          <rect x="41%" y="1%" width="18%" height="3.5%" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          {/* Penalty spot */}
          <circle cx="50%" cy="14%" r="1.8" fill="rgba(255,255,255,0.5)" />
          {/* Penalty arc */}
          <path d="M 38% 21% A 11% 16% 0 0 1 62% 21%" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />

          {/* Corner arcs — top */}
          <path d="M 2% 4% Q 4% 1% 6% 1%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <path d="M 98% 4% Q 96% 1% 94% 1%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          {/* ── BOTTOM (defensive) end ── */}
          {/* Penalty area */}
          <rect x="22%" y="79%" width="56%" height="20%" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          {/* 6-yard box */}
          <rect x="34%" y="91%" width="32%" height="8%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          {/* Goal */}
          <rect x="41%" y="95.5%" width="18%" height="3.5%" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          {/* Penalty spot */}
          <circle cx="50%" cy="86%" r="1.8" fill="rgba(255,255,255,0.5)" />
          {/* Penalty arc */}
          <path d="M 38% 79% A 11% 16% 0 0 0 62% 79%" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />

          {/* Corner arcs — bottom */}
          <path d="M 2% 96% Q 4% 99% 6% 99%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <path d="M 98% 96% Q 96% 99% 94% 99%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          {/* Subtle pitch stripe overlay — alternating bands */}
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            i % 2 === 0 ? null :
            <rect key={i} x="2%" y={`${1 + i * 9.8}%`} width="96%" height="9.8%"
              fill="rgba(255,255,255,0.015)" />
          ))}
        </svg>

        {/* Formation slots */}
        {Object.entries(slots).map(([slotKey, coords]) => {
          const occupant = activePlayer.lineup[slotKey];
          const isSelected = !!selectedBenchPlayer && isOwnPitch && !occupant;

          return (
            <div
              key={slotKey}
              onClick={() => handleSlotClick(slotKey)}
              onDragOver={isOwnPitch ? handleDragOver : undefined}
              onDrop={isOwnPitch ? (e) => handleDropOnSlot(e, slotKey) : undefined}
              className="absolute"
              style={{ top: coords.top, left: coords.left, transform: 'translate(-50%, -50%)' }}
            >
              {occupant ? (
                <div
                  className={`relative group ${isOwnPitch ? 'cursor-pointer' : ''}`}
                  draggable={isOwnPitch}
                  onDragStart={isOwnPitch ? (e) => handleDragStart(e, occupant, { type: 'slot', slotKey }) : undefined}
                >
                  <PlayerCard footballer={occupant} compact position={slotKey} />
                  {isOwnPitch && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs text-gray-400 whitespace-nowrap bg-black/80 px-1 rounded transition-opacity pointer-events-none">
                      Click/drag to move
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`
                    w-14 h-10 rounded-xl border border-dashed flex items-center justify-center
                    ${isOwnPitch
                      ? isSelected
                        ? 'border-green-400/80 bg-white/10 shadow-[0_0_0_6px_rgba(34,197,94,0.12)]'
                        : 'border-white/20 bg-white/5'
                      : 'border-white/15 bg-black/20'
                    }
                    transition-colors duration-150
                  `}
                >
                  <span className="text-white/50 text-[10px] font-bold">{slotKey}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bench ── */}
      {activePlayer.bench && activePlayer.bench.length > 0 && (
        <div
          className="shrink-0 bg-gray-900 border-t border-gray-800 px-3 py-2"
          onDragOver={isOwnPitch ? handleDragOver : undefined}
          onDrop={isOwnPitch ? handleDropOnBench : undefined}
        >
          <p className="text-gray-500 text-xs mb-1.5 font-semibold uppercase tracking-wider">
            Bench ({activePlayer.bench.length})
            {isOwnPitch && <span className="ml-2 text-gray-600 normal-case font-normal">Click or drag to place</span>}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activePlayer.bench.map((f) => (
              <div
                key={f.id}
                className="shrink-0"
                draggable={isOwnPitch}
                onDragStart={isOwnPitch ? (e) => handleDragStart(e, f, { type: 'bench' }) : undefined}
              >
                <PlayerCard
                  footballer={f}
                  compact
                  isDraftable={isOwnPitch}
                  selected={selectedBenchPlayer?.id === f.id}
                  onSelect={isOwnPitch ? handleBenchCardClick : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
