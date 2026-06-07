import { useState } from 'react';
import { NATION_FLAGS } from '../constants/formations';
import FlagImg from './FlagImg';

export default function PlayerCard({ footballer, isDraftable, onSelect, compact, selected, position }) {
  const [imgError, setImgError] = useState(false);
  const [faceError, setFaceError] = useState(false);

  if (!footballer) return null;

  const handleClick = () => {
    if (isDraftable && onSelect) onSelect(footballer);
  };

  const shortName = footballer.name.split(' ').pop();
  const positionAcronym = position || footballer.position || 'ST';
  const badgeLevel = footballer.level ?? footballer.rank ?? footballer.trainingLevel ?? 15;
  const clubName = footballer.club || footballer.team || 'FC';
  const nameBadge = footballer.name.split(' ').slice(-1)[0].toUpperCase();

  // ── Compact mode: pitch slot card (larger than before)
  if (compact) {
    return (
      <div
        onClick={handleClick}
        draggable={false}
        className={`relative overflow-hidden rounded-[1.4rem] select-none
          ${isDraftable ? 'cursor-pointer hover:scale-105 hover:z-10' : 'cursor-default'}
          ${selected ? 'ring-2 ring-yellow-400 scale-105' : ''}
          transition-all duration-150 shadow-[0_18px_45px_-24px_rgba(0,0,0,0.75)]
        `}
        style={{ width: '72px', height: '98px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)' }}
        title={footballer.name}
      >
        {!imgError && footballer.card ? (
          <img
            src={footballer.card}
            alt={footballer.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 rounded-xl"
            style={{ background: 'linear-gradient(160deg,#1e293b,#0f172a)' }}>
            <FlagImg nation={footballer.nation} size={24} />
            <span className="text-yellow-400 font-black text-sm leading-none">{footballer.ovr}</span>
            <span className="text-white text-xs text-center leading-tight px-0.5 truncate w-full text-center"
              style={{ fontSize: '9px' }}>{shortName}</span>
          </div>
        )}
        {/* OVR badge bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-1 pb-0.5"
          style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)' }}>
          <span className="text-yellow-300 font-black leading-none" style={{ fontSize: '10px' }}>{footballer.ovr}</span>
          <FlagImg nation={footballer.nation} size={16} style={{ borderRadius: '2px' }} />
        </div>
      </div>
    );
  }

  // ── Full card mode: draft pool
  return (
    <div
      onClick={handleClick}
      role={isDraftable ? 'button' : undefined}
      tabIndex={isDraftable ? 0 : undefined}
      onKeyDown={isDraftable ? (e) => e.key === 'Enter' && handleClick() : undefined}
      aria-label={isDraftable ? `Draft ${footballer.name}` : footballer.name}
      className={`
        relative overflow-hidden select-none rounded-[1.8rem]
        ${isDraftable ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_80px_-40px_rgba(34,197,94,0.7)] active:translate-y-0' : 'cursor-default'}
        ${selected ? 'ring-2 ring-yellow-400' : ''}
        transition-all duration-150
      `}
      style={{
        width: '120px',
        minHeight: '210px',
        background: 'linear-gradient(180deg, rgba(9,18,34,0.95), rgba(4,9,21,0.95))',
        border: isDraftable ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(255,255,255,0.12)',
        boxShadow: isDraftable ? '0 16px 40px -24px rgba(34,197,94,0.65)' : '0 8px 20px -18px rgba(0,0,0,0.45)',
        clipPath: 'polygon(15% 0%, 85% 0%, 100% 18%, 100% 78%, 50% 100%, 0% 78%, 0% 18%)',
      }}
    >
      {/* Card image */}
      <div className="relative" style={{ height: '140px' }}>
        {!imgError && footballer.card ? (
          <img
            src={footballer.card}
            alt={footballer.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-end justify-center pb-4">
            {!faceError && footballer.url ? (
              <img
                src={footballer.url}
                alt={footballer.name}
                onError={() => setFaceError(true)}
                className="w-20 h-20 rounded-full object-cover border-2 border-white/20 shadow-[0_15px_40px_-20px_rgba(0,0,0,0.7)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-4xl text-white/80 shadow-[0_15px_40px_-20px_rgba(0,0,0,0.7)]">
                👤
              </div>
            )}
          </div>
        )}

        <div className="absolute inset-x-0 top-2 px-3 flex items-center justify-between">
          <div className="rounded-full bg-black/50 px-2 py-1 text-[11px] uppercase tracking-[0.2em] font-black text-lime-300">
            {footballer.ovr}
          </div>
          <div className="rounded-full bg-black/50 px-2 py-1 text-[11px] uppercase tracking-[0.2em] font-black text-white">
            {positionAcronym}
          </div>
        </div>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shadow-[0_12px_30px_-16px_rgba(0,0,0,0.8)]">
          <FlagImg nation={footballer.nation} size={20} />
        </div>
      </div>

      {/* Info */}
      <div className="px-3 pb-3 pt-3 text-center">
        <p className="text-white font-black text-base tracking-tight leading-none">{nameBadge}</p>
        <p className="text-gray-400 text-[11px] uppercase tracking-[0.25em] mt-1">{clubName}</p>
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-white/70">
          <span className="rounded-full bg-white/5 px-2 py-1 flex items-center">
            <FlagImg nation={footballer.nation} size={16} />
          </span>
          <span className="rounded-full bg-white/5 px-2 py-1">{positionAcronym}</span>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 rounded-full bg-green-500 px-2 py-1 text-[10px] font-black text-black uppercase tracking-[0.2em]">
        {badgeLevel}
      </div>
    </div>
  );
}
