import { useState, useRef, useEffect } from 'react';
import { FORMATIONS, NATION_COLORS } from '../constants/formations';
import FlagImg from './FlagImg';
import PlayerCard from './PlayerCard';

/**
 * TradeWindow — full-screen overlay shown after 22 spins.
 * Layout:
 *   - Top: side-by-side squad comparison for all players
 *   - Bottom: trade proposals panel + embedded chat
 */
export default function TradeWindow({ roomState, currentPlayer, socket, roomId }) {
  const myNickname = currentPlayer?.nickname;
  const players = roomState?.players || [];

  // Which two players to compare (default: me vs first opponent)
  const defaultOther = players.find(p => p.nickname !== myNickname);
  const [leftNick,  setLeftNick]  = useState(myNickname);
  const [rightNick, setRightNick] = useState(defaultOther?.nickname || '');

  // Trade state
  const [tradeTab, setTradeTab] = useState('compare'); // 'compare' | 'trade' | 'chat'
  const [offeredPlayerId, setOfferedPlayerId]   = useState(null);
  const [wantedPlayerId,  setWantedPlayerId]    = useState(null);
  const [includeSpinToken, setIncludeSpinToken] = useState(false);
  const [targetNickname,  setTargetNickname]    = useState(defaultOther?.nickname || '');

  // Chat
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  const pendingTrade  = roomState?.pendingTrade;
  const isIncomingTarget = pendingTrade?.toNickname === myNickname;
  const me            = players.find(p => p.nickname === myNickname);
  const targetPlayer  = players.find(p => p.nickname === targetNickname);

  const myPlayers = [
    ...Object.values(me?.lineup || {}).filter(Boolean),
    ...(me?.bench || []),
  ];
  const targetPlayers = [
    ...Object.values(targetPlayer?.lineup || {}).filter(Boolean),
    ...(targetPlayer?.bench || []),
  ];

  const leftPlayer  = players.find(p => p.nickname === leftNick)  || players[0];
  const rightPlayer = players.find(p => p.nickname === rightNick) || players[1];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomState?.chatLog?.length]);

  // Auto-switch to trade tab when incoming trade arrives
  useEffect(() => {
    if (isIncomingTarget && pendingTrade?.status === 'pending') {
      setTradeTab('trade');
    }
  }, [isIncomingTarget, pendingTrade]);

  const handlePropose = () => {
    if (!offeredPlayerId || !targetNickname) return;
    socket.emit('propose_trade', {
      roomId,
      fromNickname: myNickname,
      toNickname: targetNickname,
      offeredPlayerId,
      wantedPlayerId: wantedPlayerId || null,
      includeSpinToken,
    });
    setOfferedPlayerId(null);
    setWantedPlayerId(null);
    setIncludeSpinToken(false);
  };

  const handleRespond = (accept) => {
    socket.emit('respond_trade', { roomId, nickname: myNickname, accept });
  };

  const handleClose = () => {
    socket.emit('close_trade_window', { roomId });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socket.emit('Messages', { roomId, nickname: myNickname, text: chatInput.trim() });
    setChatInput('');
  };

  const chatMessages = roomState?.chatLog || [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(180deg,#060d1a 0%,#0a0f1c 100%)' }}>

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: 'rgba(99,102,241,0.1)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div>
            <p className="text-white font-black text-base leading-none">Trade Window</p>
            <p className="text-indigo-300 text-xs mt-0.5">
              Draft paused · {roomState?.spinCount || 0} picks made
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}>
          Resume Draft
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex border-b border-white/8"
        style={{ background: 'rgba(0,0,0,0.3)' }}>
        {[
          { id: 'compare', label: 'Compare Squads', icon: '⚽' },
          { id: 'trade',   label: isIncomingTarget ? '⚡ Trade' : 'Trade', icon: '🔄' },
          { id: 'chat',    label: 'Chat',    icon: '💬' },
        ].map(t => (
          <button key={t.id} onClick={() => setTradeTab(t.id)}
            className="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all relative"
            style={{
              color: tradeTab === t.id ? '#818cf8' : 'rgba(255,255,255,0.35)',
              borderBottom: tradeTab === t.id ? '2px solid #818cf8' : '2px solid transparent',
              background: tradeTab === t.id ? 'rgba(99,102,241,0.06)' : 'transparent',
            }}>
            {t.icon} {t.label}
            {t.id === 'trade' && isIncomingTarget && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">

        {/* ── COMPARE TAB ── */}
        {tradeTab === 'compare' && (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Selector row */}
            <div className="shrink-0 flex gap-2 px-3 py-2 border-b border-white/8 overflow-x-auto"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="flex items-center gap-1.5 mr-4">
                <span className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider">Left</span>
                <div className="flex gap-1">
                  {players.map(p => (
                    <button key={p.nickname} onClick={() => setLeftNick(p.nickname)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                      style={{
                        background: leftNick === p.nickname ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${leftNick === p.nickname ? '#4ade80' : 'rgba(255,255,255,0.1)'}`,
                        color: leftNick === p.nickname ? '#86efac' : 'rgba(255,255,255,0.5)',
                      }}>
                      {p.nickname}{p.nickname === myNickname ? ' (You)' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Right</span>
                <div className="flex gap-1">
                  {players.map(p => (
                    <button key={p.nickname} onClick={() => setRightNick(p.nickname)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                      style={{
                        background: rightNick === p.nickname ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${rightNick === p.nickname ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
                        color: rightNick === p.nickname ? '#d8b4fe' : 'rgba(255,255,255,0.5)',
                      }}>
                      {p.nickname}{p.nickname === myNickname ? ' (You)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-0 h-full">
                <SquadPanel player={leftPlayer} accentColor="#4ade80" label="Left" myNickname={myNickname} />
                <SquadPanel player={rightPlayer} accentColor="#a855f7" label="Right" myNickname={myNickname}
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }} />
              </div>
            </div>
          </div>
        )}

        {/* ── TRADE TAB ── */}
        {tradeTab === 'trade' && (
          <div className="h-full overflow-y-auto p-4 space-y-4">

            {/* Incoming trade */}
            {isIncomingTarget && pendingTrade?.status === 'pending' && (
              <IncomingTrade
                pendingTrade={pendingTrade}
                players={players}
                myNickname={myNickname}
                onAccept={() => handleRespond(true)}
                onDecline={() => handleRespond(false)}
              />
            )}

            {/* My pending outgoing */}
            {pendingTrade && pendingTrade.fromNickname === myNickname && (
              <div className="rounded-xl p-4 text-center space-y-2"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <div className="text-3xl">⏳</div>
                <p className="text-indigo-200 font-semibold text-sm">
                  Waiting for {pendingTrade.toNickname} to respond...
                </p>
              </div>
            )}

            {/* Propose new trade */}
            {!pendingTrade && (
              <div className="space-y-4">
                <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Propose a Trade</p>

                {/* Target player */}
                <div>
                  <p className="text-xs text-white/40 font-semibold mb-1.5">Trade with</p>
                  <div className="flex flex-wrap gap-2">
                    {players.filter(p => p.nickname !== myNickname).map(p => (
                      <button key={p.nickname} onClick={() => { setTargetNickname(p.nickname); setWantedPlayerId(null); }}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                        style={{
                          background: targetNickname === p.nickname ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${targetNickname === p.nickname ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                          color: targetNickname === p.nickname ? '#c7d2fe' : 'rgba(255,255,255,0.5)',
                        }}>
                        {p.nickname}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Your player */}
                <div>
                  <p className="text-xs text-white/40 font-semibold mb-1.5">You offer</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {myPlayers.map(f => (
                      <PlayerChip key={f.id} footballer={f}
                        selected={offeredPlayerId === f.id}
                        accentColor="#4ade80"
                        onClick={() => setOfferedPlayerId(prev => prev === f.id ? null : f.id)} />
                    ))}
                    {myPlayers.length === 0 && <p className="text-gray-500 text-sm">No players yet.</p>}
                  </div>
                </div>

                {/* Their player (optional) */}
                {targetNickname && (
                  <div>
                    <p className="text-xs text-white/40 font-semibold mb-1.5">
                      You want from {targetNickname} <span className="text-gray-600">(optional)</span>
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      <button onClick={() => setWantedPlayerId(null)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: !wantedPlayerId ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${!wantedPlayerId ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                          color: !wantedPlayerId ? '#c7d2fe' : 'rgba(255,255,255,0.4)',
                        }}>
                        Nothing (gift)
                      </button>
                      {targetPlayers.map(f => (
                        <PlayerChip key={f.id} footballer={f}
                          selected={wantedPlayerId === f.id}
                          accentColor="#f87171"
                          onClick={() => setWantedPlayerId(prev => prev === f.id ? null : f.id)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Spin token */}
                <div>
                  <p className="text-xs text-white/40 font-semibold mb-1.5">Extras</p>
                  <button onClick={() => setIncludeSpinToken(v => !v)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: includeSpinToken ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${includeSpinToken ? 'rgba(234,179,8,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: includeSpinToken ? '#fde047' : 'rgba(255,255,255,0.4)',
                    }}>
                    🎰 {includeSpinToken ? 'Spin token included' : 'Add spin token (they spin next)'}
                  </button>
                </div>

                <button onClick={handlePropose}
                  disabled={!offeredPlayerId || !targetNickname}
                  className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all"
                  style={{
                    background: offeredPlayerId && targetNickname ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.05)',
                    color: offeredPlayerId && targetNickname ? '#fff' : 'rgba(255,255,255,0.25)',
                    boxShadow: offeredPlayerId && targetNickname ? '0 0 30px rgba(79,70,229,0.4)' : 'none',
                    cursor: offeredPlayerId && targetNickname ? 'pointer' : 'not-allowed',
                  }}>
                  Send Trade Proposal
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {tradeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-8">No messages yet. Start the conversation!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.nickname === myNickname ? 'items-end' : 'items-start'}`}>
                  {msg.isSystem ? (
                    <p className="text-xs text-center w-full text-indigo-400/70 italic py-1">{msg.text}</p>
                  ) : (
                    <>
                      <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{msg.nickname}</p>
                      <div className="px-3 py-2 rounded-2xl text-sm max-w-xs break-words"
                        style={{
                          background: msg.nickname === myNickname ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          borderRadius: msg.nickname === myNickname ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}>
                        {msg.text}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="shrink-0 flex gap-2 px-3 py-3 border-t border-white/8"
              style={{ background: 'rgba(0,0,0,0.3)' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Message your opponents..."
                maxLength={300}
                className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <button onClick={sendChat}
                className="px-4 py-2 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'rgba(99,102,241,0.3)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.4)' }}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Squad comparison panel — mini pitch visual ──────────────────────────────
function SquadPanel({ player, accentColor, myNickname, style = {} }) {
  if (!player) {
    return (
      <div className="flex items-center justify-center p-4" style={style}>
        <p className="text-gray-600 text-sm">No player selected</p>
      </div>
    );
  }

  const formation = player.formation || '4-3-3';
  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const filledLineup = Object.entries(player.lineup).filter(([, f]) => f);
  const bench = player.bench || [];
  const avgOvr = filledLineup.length
    ? Math.round(filledLineup.reduce((s, [, f]) => s + (f.ovr || 0), 0) / filledLineup.length)
    : 0;
  const isMe = player.nickname === myNickname;

  return (
    <div className="flex flex-col overflow-hidden" style={style}>
      {/* Panel header */}
      <div className="shrink-0 px-2 py-1.5 flex items-center justify-between"
        style={{ background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}30` }}>
        <div>
          <p className="text-xs font-black" style={{ color: accentColor }}>
            {player.nickname}{isMe ? ' (You)' : ''}
          </p>
          <p className="text-[10px] text-white/40">{formation}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-white/30 uppercase">Avg OVR</p>
          <p className="text-sm font-black" style={{ color: avgOvr >= 80 ? '#fbbf24' : '#fff' }}>
            {avgOvr || '—'}
          </p>
        </div>
      </div>

      {/* Mini pitch */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: '280px' }}>
        {/* Pitch background */}
        <div className="absolute inset-0" style={{ background: '#04140d' }} />
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
          <rect x="2%" y="1%" width="96%" height="98%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" rx="2" />
          <line x1="2%" y1="50%" x2="98%" y2="50%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <ellipse cx="50%" cy="50%" rx="11%" ry="14%" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <circle cx="50%" cy="50%" r="2" fill="rgba(255,255,255,0.4)" />
          <rect x="22%" y="1%" width="56%" height="18%" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <rect x="34%" y="1%" width="32%" height="7%" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <rect x="22%" y="81%" width="56%" height="18%" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <rect x="34%" y="92%" width="32%" height="7%" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {[0,1,2,3,4].map(i => (
            i % 2 === 0 ? null :
            <rect key={i} x="2%" y={`${1 + i * 19.6}%`} width="96%" height="19.6%" fill="rgba(255,255,255,0.012)" />
          ))}
        </svg>

        {/* Player tokens */}
        {Object.entries(slots).map(([slotKey, coords]) => {
          const footballer = player.lineup[slotKey];
          return (
            <div
              key={slotKey}
              className="absolute"
              style={{ top: coords.top, left: coords.left, transform: 'translate(-50%, -50%)' }}
            >
              {footballer ? (
                <PlayerCard footballer={footballer} compact position={slotKey} />
              ) : (
                <div className="w-10 h-7 rounded-lg border border-dashed border-white/15 flex items-center justify-center">
                  <span className="text-white/30 font-bold" style={{ fontSize: '8px' }}>{slotKey}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench strip */}
      {bench.length > 0 && (
        <div className="shrink-0 px-2 py-1.5 border-t border-white/8 overflow-x-auto"
          style={{ background: 'rgba(0,0,0,0.35)' }}>
          <p className="text-[9px] uppercase font-bold tracking-widest mb-1 text-white/25">
            Bench ({bench.length})
          </p>
          <div className="flex gap-1.5">
            {bench.map(f => (
              <div key={f.id} className="shrink-0 flex flex-col items-center gap-0.5">
                <FlagImg nation={f.nation} size={16} style={{ borderRadius: '2px' }} />
                <span className="text-white/60 font-semibold" style={{ fontSize: '8px' }}>
                  {f.name.split(' ').pop().slice(0, 6)}
                </span>
                <span className="text-yellow-400 font-black" style={{ fontSize: '8px' }}>{f.ovr}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Incoming trade card ─────────────────────────────────────────────────────
function IncomingTrade({ pendingTrade, players, myNickname, onAccept, onDecline }) {
  const fromPlayer = players.find(p => p.nickname === pendingTrade.fromNickname);
  const me         = players.find(p => p.nickname === myNickname);

  const incomingOffered = fromPlayer
    ? [...Object.values(fromPlayer.lineup || {}).filter(Boolean), ...(fromPlayer.bench || [])]
        .find(f => f.id === pendingTrade.offeredPlayerId)
    : null;

  const myWanted = me && pendingTrade.wantedPlayerId
    ? [...Object.values(me.lineup || {}).filter(Boolean), ...(me.bench || [])]
        .find(f => f.id === pendingTrade.wantedPlayerId)
    : null;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.06)' }}>
      <div className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'rgba(234,179,8,0.12)', borderBottom: '1px solid rgba(234,179,8,0.2)' }}>
        <span className="text-lg">⚡</span>
        <p className="text-yellow-300 font-black text-sm">
          {pendingTrade.fromNickname} wants to trade!
        </p>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-green-400 text-[10px] font-bold uppercase mb-2">They offer</p>
            {incomingOffered
              ? <MiniPlayerCard footballer={incomingOffered} />
              : <p className="text-gray-500 text-xs">—</p>}
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-red-400 text-[10px] font-bold uppercase mb-2">They want</p>
            {myWanted
              ? <MiniPlayerCard footballer={myWanted} />
              : <p className="text-gray-500 text-xs">Nothing (gift)</p>}
          </div>
        </div>
        {pendingTrade.includeSpinToken && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
            <span>🎰</span>
            <p className="text-yellow-300 text-xs font-semibold">Includes spin token — you spin next!</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl font-black text-sm text-black transition-all"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
            Accept
          </button>
          <button onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl font-black text-sm transition-all"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ───────────────────────────────────────────────────────────
function PlayerChip({ footballer, selected, accentColor, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: selected ? `${accentColor}22` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${selected ? accentColor : 'rgba(255,255,255,0.1)'}`,
        color: selected ? accentColor : 'rgba(255,255,255,0.6)',
      }}>
      <FlagImg nation={footballer.nation} size={16} />
      <span>{footballer.name.split(' ').pop()}</span>
      <span style={{ color: '#fbbf24', fontWeight: 900 }}>{footballer.ovr}</span>
    </button>
  );
}

function MiniPlayerCard({ footballer }) {
  return (
    <div className="flex items-center gap-2">
      <FlagImg nation={footballer.nation} size={20} style={{ borderRadius: '3px' }} />
      <div>
        <p className="text-white text-xs font-bold leading-none">{footballer.name.split(' ').pop()}</p>
        <p className="text-yellow-400 text-[11px] font-black">{footballer.ovr}</p>
      </div>
    </div>
  );
}
