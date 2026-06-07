import { useState, useRef, useEffect } from 'react';
import FlagImg from './FlagImg';

/**
 * Full-screen game-over screen.
 * Shows all squads side-by-side with a chat panel.
 */
export default function GameOverScreen({ roomState, currentPlayer, socket, roomId, onLeave }) {
  const myNickname = currentPlayer?.nickname;
  const players    = roomState?.players || [];

  // Default compare: me vs first opponent
  const defaultOther = players.find(p => p.nickname !== myNickname);
  const [leftNick,  setLeftNick]  = useState(myNickname);
  const [rightNick, setRightNick] = useState(defaultOther?.nickname || '');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  const chatMessages = roomState?.chatLog || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const sendChat = () => {
    if (!chatInput.trim() || !socket) return;
    socket.emit('Messages', { roomId, nickname: myNickname, text: chatInput.trim() });
    setChatInput('');
  };

  const leftPlayer  = players.find(p => p.nickname === leftNick)  || players[0];
  const rightPlayer = players.find(p => p.nickname === rightNick) || players[1];

  // Rank players by avg ovr of all 15 players
  const ranked = [...players].sort((a, b) => squadAvg(b) - squadAvg(a));

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(180deg,#06090f 0%,#0a0f1c 100%)' }}>

      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/10"
        style={{ background: 'rgba(251,191,36,0.08)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-yellow-400 font-black text-base leading-none">Draft Complete!</p>
            <p className="text-white/40 text-xs mt-0.5">
              {players.length} squads · {players.reduce((s, p) => s + Object.values(p.lineup).filter(Boolean).length + p.bench.length, 0)} total picks
            </p>
          </div>
        </div>
        <button
          onClick={onLeave}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
          Leave Room
        </button>
      </div>

      {/* Rankings strip */}
      <div className="shrink-0 flex gap-2 px-3 py-2 overflow-x-auto border-b border-white/8"
        style={{ background: 'rgba(0,0,0,0.35)' }}>
        {ranked.map((p, i) => {
          const avg = squadAvg(p);
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
          const isMe = p.nickname === myNickname;
          return (
            <div key={p.nickname}
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: isMe ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isMe ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <span className="text-base leading-none">{medal}</span>
              <span className="text-white text-xs font-bold">{p.nickname}{isMe ? ' (You)' : ''}</span>
              <span className="text-yellow-400 text-xs font-black">{avg}</span>
            </div>
          );
        })}
      </div>

      {/* Main: compare + chat */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left: comparison */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Selector row */}
          <div className="shrink-0 flex gap-3 px-3 py-2 overflow-x-auto border-b border-white/8"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-green-400 font-black uppercase tracking-wider shrink-0">L</span>
              {players.map(p => (
                <button key={p.nickname} onClick={() => setLeftNick(p.nickname)}
                  className="px-2 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                  style={{
                    background: leftNick === p.nickname ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${leftNick === p.nickname ? '#4ade80' : 'rgba(255,255,255,0.1)'}`,
                    color: leftNick === p.nickname ? '#86efac' : 'rgba(255,255,255,0.45)',
                  }}>
                  {p.nickname}{p.nickname === myNickname ? ' ★' : ''}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-purple-400 font-black uppercase tracking-wider shrink-0">R</span>
              {players.map(p => (
                <button key={p.nickname} onClick={() => setRightNick(p.nickname)}
                  className="px-2 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                  style={{
                    background: rightNick === p.nickname ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${rightNick === p.nickname ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
                    color: rightNick === p.nickname ? '#d8b4fe' : 'rgba(255,255,255,0.45)',
                  }}>
                  {p.nickname}{p.nickname === myNickname ? ' ★' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-side panels */}
          <div className="flex-1 overflow-hidden grid grid-cols-2">
            <SquadPanel player={leftPlayer} accentColor="#4ade80" myNickname={myNickname} />
            <SquadPanel player={rightPlayer} accentColor="#a855f7" myNickname={myNickname}
              style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }} />
          </div>
        </div>

        {/* Right: chat (desktop only) */}
        <div className="hidden md:flex w-64 flex-col border-l border-white/8"
          style={{ background: 'rgba(0,0,0,0.25)' }}>
          <div className="shrink-0 px-3 py-2 border-b border-white/8">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Chat</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.nickname === myNickname ? 'items-end' : 'items-start'}`}>
                {msg.isSystem ? (
                  <p className="text-[10px] text-indigo-400/60 italic text-center w-full py-0.5">{msg.text}</p>
                ) : (
                  <>
                    <p className="text-[10px] mb-0.5 text-white/30">{msg.nickname}</p>
                    <div className="px-2.5 py-1.5 text-xs max-w-[90%] break-words"
                      style={{
                        background: msg.nickname === myNickname ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        borderRadius: msg.nickname === myNickname ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                      }}>
                      {msg.text}
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="shrink-0 flex gap-1.5 px-2 py-2 border-t border-white/8">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Say something..."
              maxLength={300}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button onClick={sendChat}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: 'rgba(99,102,241,0.3)', color: '#c7d2fe' }}>
              →
            </button>
          </div>
        </div>
      </div>

      {/* Mobile chat bar */}
      <div className="shrink-0 flex gap-2 px-3 py-2 border-t border-white/8 md:hidden"
        style={{ background: 'rgba(0,0,0,0.4)' }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
          placeholder="Chat with everyone..."
          maxLength={300}
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
        <button onClick={sendChat}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'rgba(99,102,241,0.3)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.3)' }}>
          Send
        </button>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function squadAvg(player) {
  const all = [
    ...Object.values(player.lineup || {}).filter(Boolean),
    ...(player.bench || []),
  ];
  if (!all.length) return 0;
  return Math.round(all.reduce((s, f) => s + (f.ovr || 0), 0) / all.length);
}

function SquadPanel({ player, accentColor, myNickname, style = {} }) {
  if (!player) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-600 text-sm" style={style}>
        No player selected
      </div>
    );
  }

  const isMe      = player.nickname === myNickname;
  const lineup    = Object.entries(player.lineup || {});
  const bench     = player.bench || [];
  const allPlayers = [...lineup.map(([, f]) => f).filter(Boolean), ...bench];
  const avg       = squadAvg(player);
  const best      = allPlayers.length ? allPlayers.reduce((a, b) => (b.ovr > a.ovr ? b : a)) : null;

  return (
    <div className="flex flex-col overflow-hidden" style={style}>
      {/* Panel header */}
      <div className="shrink-0 px-3 py-2.5 flex items-center justify-between"
        style={{ background: `${accentColor}10`, borderBottom: `1px solid ${accentColor}28` }}>
        <div>
          <p className="font-black text-sm leading-none" style={{ color: accentColor }}>
            {player.nickname}{isMe ? ' (You)' : ''}
          </p>
          <p className="text-[10px] text-white/35 mt-0.5">{player.formation} · {allPlayers.length} players</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] text-white/25 uppercase">Avg</p>
            <p className="text-sm font-black" style={{ color: avg >= 82 ? '#fbbf24' : '#fff' }}>{avg || '—'}</p>
          </div>
          {best && (
            <div className="text-right">
              <p className="text-[9px] text-white/25 uppercase">Best</p>
              <p className="text-sm font-black text-yellow-400">{best.ovr}</p>
            </div>
          )}
        </div>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Lineup */}
        <p className="text-[9px] uppercase font-black tracking-widest px-1 mb-1.5"
          style={{ color: `${accentColor}80` }}>
          Starting XI ({lineup.filter(([, f]) => f).length}/11)
        </p>
        {lineup.map(([slot, footballer]) => (
          <PlayerRow key={slot} slot={slot} footballer={footballer} accentColor={accentColor} />
        ))}

        {/* Bench */}
        {bench.length > 0 && (
          <>
            <p className="text-[9px] uppercase font-black tracking-widest px-1 mt-3 mb-1.5 text-white/25">
              Bench ({bench.length})
            </p>
            {bench.map(f => (
              <PlayerRow key={f.id} slot="BCH" footballer={f} accentColor={accentColor} isBench />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ slot, footballer, accentColor, isBench = false }) {
  if (!footballer) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-[10px] font-black w-8 shrink-0 text-white/20">{slot}</span>
        <span className="text-white/15 text-xs italic">Empty</span>
      </div>
    );
  }

  const ovrColor = footballer.ovr >= 85 ? '#fbbf24' : footballer.ovr >= 78 ? '#86efac' : footballer.ovr >= 70 ? '#93c5fd' : '#94a3b8';

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
      style={{
        background: isBench ? 'rgba(255,255,255,0.03)' : `${accentColor}0a`,
        border: `1px solid ${isBench ? 'rgba(255,255,255,0.05)' : `${accentColor}20`}`,
      }}>
      <span className="text-[10px] font-black w-8 shrink-0"
        style={{ color: isBench ? 'rgba(255,255,255,0.2)' : `${accentColor}99` }}>
        {slot}
      </span>
      <FlagImg nation={footballer.nation} size={16} style={{ borderRadius: '2px', flexShrink: 0 }} />
      <span className="text-white text-xs font-semibold truncate flex-1 min-w-0">
        {footballer.name.split(' ').pop()}
      </span>
      <span className="text-xs font-black shrink-0 tabular-nums" style={{ color: ovrColor }}>
        {footballer.ovr}
      </span>
    </div>
  );
}
