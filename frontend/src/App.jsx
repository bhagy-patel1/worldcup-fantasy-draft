import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import SpinWheel from './components/SpinWheel';
import PitchView from './components/PitchView';
import ChatWindow from './components/ChatWindow';
import DraftOverlay from './components/DraftOverlay';
import TradeWindow from './components/TradeWindow';
import GameOverScreen from './components/GameOverScreen';

const TABS = [
  { id: 'pitch', label: 'Pitch', icon: '🏟️' },
  { id: 'wheel', label: 'Wheel', icon: '🎰' },
  { id: 'chat',  label: 'Chat',  icon: '💬' },
];

const SESSION_KEY = 'wc_draft_session';

function saveSession(roomId, nickname) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, nickname }));
  } catch (_) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
}

export default function App() {
  const socketRef      = useRef(null);
  const activeTabRef   = useRef('wheel');
  const timerRef       = useRef(null);
  const rejoiningRef   = useRef(false);

  const [socketReady,    setSocketReady]    = useState(false);
  const [phase,          setPhase]          = useState('lobby');
  const [roomState,      setRoomState]      = useState(null);
  const [currentPlayer,  setCurrentPlayer]  = useState(null);
  const [spinData,       setSpinData]       = useState(null);
  const [spinResult,     setSpinResult]     = useState(null);
  const [wheelAnimating, setWheelAnimating] = useState(false);
  const [globalError,    setGlobalError]    = useState(null);
  const [timeLeft,       setTimeLeft]       = useState(null);
  const [activeTab,      setActiveTab]      = useState('wheel');
  const [rejoining,      setRejoining]      = useState(false);
  const [tradeOpen,      setTradeOpen]      = useState(false);

  const setRejoiningSync = (val) => {
    rejoiningRef.current = val;
    setRejoining(val);
  };

  const setActiveTabSynced = (tab) => {
    activeTabRef.current = tab;
    setActiveTab(tab);
  };

  useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const socket = io(BACKEND_URL, { transports: ['polling', 'websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketReady(true);

      // Attempt session rejoin on connect/reconnect
      const session = loadSession();
      if (session?.roomId && session?.nickname) {
        setRejoiningSync(true);
        socket.emit('rejoin_room', { roomId: session.roomId, nickname: session.nickname });
      }
    });

    socket.on('room_state_updated', (state) => {
      setRoomState(state);
      setRejoiningSync(false);

      if (state.gameOver) {
        clearInterval(timerRef.current);
        setTimeLeft(null);
      }
      if (state.status === 'waiting') {
        setSpinResult(null);
        setSpinData(null);
        setWheelAnimating(false);
      }

      // Sync trade window from server state
      if (state.tradeWindowOpen) setTradeOpen(true);
      else if (!state.tradeWindowOpen) setTradeOpen(false);

      // If we were rejoining, restore to game phase
      setPhase(prev => {
        if (prev === 'lobby') {
          const session = loadSession();
          if (session?.nickname) {
            setCurrentPlayer({ nickname: session.nickname, socketId: socket.id });
            return 'game';
          }
        }
        return prev;
      });
    });

    socket.on('wheel_spin_start', ({ nation, duration }) => {
      setSpinData({ nation, duration });
      setWheelAnimating(true);
      setSpinResult(null);
    });

    socket.on('wheel_spin_result', ({ nation, draftPool }) => {
      setSpinResult({ nation, draftPool });
      setWheelAnimating(false);
      if (activeTabRef.current !== 'chat') {
        setActiveTabSynced('wheel');
      }
    });

    socket.on('turn_timeout', () => {});

    socket.on('chat_broadcast', (msg) => {
      setRoomState(prev => {
        if (!prev) return prev;
        const dup = prev.chatLog.some(
          m => m.timestamp === msg.timestamp && m.nickname === msg.nickname && m.text === msg.text
        );
        if (dup) return prev;
        return { ...prev, chatLog: [...prev.chatLog, msg] };
      });
    });

    socket.on('trade_window_opened', () => {
      setTradeOpen(true);
    });

    socket.on('trade_window_closed', () => {
      setTradeOpen(false);
    });

    socket.on('trade_proposed', () => {
      setTradeOpen(true);
    });

    socket.on('trade_completed', () => {
      // trade window stays open until explicitly closed
    });

    socket.on('error', ({ message }) => {
      // Use ref to avoid stale closure — check if we were in the middle of rejoining
      if (rejoiningRef.current && (message.includes('not found') || message.includes('not found'))) {
        clearSession();
        setRejoiningSync(false);
        setPhase('lobby');
        setRoomState(null);
        setCurrentPlayer(null);
      } else {
        setRejoiningSync(false);
      }
      setGlobalError(message);
      setTimeout(() => setGlobalError(null), 5000);
    });

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Client-side countdown
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!roomState?.timerEndsAt) { setTimeLeft(null); return; }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((roomState.timerEndsAt - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem <= 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [roomState?.timerEndsAt]);

  const handleJoined = useCallback((nickname, joinedRoomId) => {
    const socket = socketRef.current;
    if (joinedRoomId) saveSession(joinedRoomId, nickname);
    setCurrentPlayer({ nickname, socketId: socket?.id });
    setPhase('game');
  }, []);

  // Save session whenever roomState arrives and currentPlayer is set
  useEffect(() => {
    if (roomState?.roomId && currentPlayer?.nickname) {
      saveSession(roomState.roomId, currentPlayer.nickname);
    }
  }, [roomState?.roomId, currentPlayer?.nickname]);

  const isMyTurn = roomState && currentPlayer &&
    roomState.players[roomState.turnQueueIndex]?.nickname === currentPlayer.nickname;
  const roomId   = roomState?.roomId;
  const activeName = roomState?.players[roomState?.turnQueueIndex]?.nickname;

  // ── Loading / rejoining state
  if (!socketReady || rejoining) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
        <div className="text-4xl animate-bounce">⚽</div>
        <p className="text-white text-lg font-semibold animate-pulse">
          {rejoining ? 'Rejoining your game...' : 'Connecting...'}
        </p>
      </div>
    );
  }

  // ── Lobby
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <Lobby
          socket={socketRef.current}
          onJoined={(nickname) => {
            // session saved in handleJoined via useEffect once roomState arrives
            handleJoined(nickname);
          }}
        />
      </div>
    );
  }

  // ── Game
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-950 text-white">

      {/* Mobile top status bar */}
      <div
        className="shrink-0 flex items-center justify-between px-3 py-1.5 md:hidden"
        style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-xs font-bold" style={{ color: isMyTurn ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
          {isMyTurn ? '⚡ Your turn!' : `⏳ ${activeName}'s turn`}
        </span>
        {timeLeft != null && (
          <span
            className="text-xs font-black tabular-nums"
            style={{ color: timeLeft <= 15 ? '#ef4444' : timeLeft <= 45 ? '#eab308' : '#22c55e' }}
          >
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      {roomState?.suspended && (
        <div className="shrink-0 bg-yellow-600 text-black text-center py-2 font-bold text-xs z-50">
          Game suspended — waiting for players to reconnect
        </div>
      )}

      {roomState?.gameOver && (
        <GameOverScreen
          roomState={roomState}
          currentPlayer={currentPlayer}
          socket={socketRef.current}
          roomId={roomId}
          onLeave={() => { clearSession(); setPhase('lobby'); setRoomState(null); setCurrentPlayer(null); }}
        />
      )}

      {globalError && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs text-center">
          {globalError}
        </div>
      )}

      {tradeOpen && phase === 'game' && roomState && !roomState.gameOver && (
        <TradeWindow
          roomState={roomState}
          currentPlayer={currentPlayer}
          socket={socketRef.current}
          roomId={roomId}
        />
      )}

      {/* ── DESKTOP layout (md+) */}
      <div className="hidden md:flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-hidden min-w-0">
          <PitchView roomState={roomState} currentPlayer={currentPlayer} socket={socketRef.current} roomId={roomId} />
        </div>
        <div
          className="flex flex-col border-x border-gray-800 overflow-hidden transition-all duration-300"
          style={{ width: spinResult ? '260px' : '340px' }}
        >
          <SpinWheel
            socket={socketRef.current} roomId={roomId} roomState={roomState}
            isMyTurn={isMyTurn} spinData={spinData} spinResult={spinResult}
            wheelAnimating={wheelAnimating} timeLeft={timeLeft}
          />
        </div>
        <div className="w-64 flex flex-col border-l border-gray-800">
          <ChatWindow socket={socketRef.current} roomId={roomId} nickname={currentPlayer?.nickname} messages={roomState?.chatLog || []} />
        </div>
        <DraftOverlay spinResult={spinResult} isMyTurn={isMyTurn} timeLeft={timeLeft} socket={socketRef.current} roomId={roomId} roomState={roomState} />
      </div>

      {/* ── MOBILE layout */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden relative">
        <div className="flex-1 overflow-hidden relative">
          {/* Pitch */}
          <div className="absolute inset-0 transition-opacity duration-200"
            style={{ opacity: activeTab === 'pitch' ? 1 : 0, pointerEvents: activeTab === 'pitch' ? 'auto' : 'none' }}>
            <PitchView roomState={roomState} currentPlayer={currentPlayer} socket={socketRef.current} roomId={roomId} />
          </div>
          {/* Wheel */}
          <div className="absolute inset-0 transition-opacity duration-200"
            style={{ opacity: activeTab === 'wheel' ? 1 : 0, pointerEvents: activeTab === 'wheel' ? 'auto' : 'none' }}>
            <SpinWheel
              socket={socketRef.current} roomId={roomId} roomState={roomState}
              isMyTurn={isMyTurn} spinData={spinData} spinResult={spinResult}
              wheelAnimating={wheelAnimating} timeLeft={timeLeft}
            />
          </div>
          {/* Chat */}
          <div className="absolute inset-0 transition-opacity duration-200"
            style={{ opacity: activeTab === 'chat' ? 1 : 0, pointerEvents: activeTab === 'chat' ? 'auto' : 'none' }}>
            <ChatWindow socket={socketRef.current} roomId={roomId} nickname={currentPlayer?.nickname} messages={roomState?.chatLog || []} />
          </div>
        </div>

        <DraftOverlay spinResult={spinResult} isMyTurn={isMyTurn} timeLeft={timeLeft} socket={socketRef.current} roomId={roomId} roomState={roomState} />

        {/* Bottom tab bar */}
        <div className="shrink-0 flex border-t z-50 relative"
          style={{ background: '#0a0f1a', borderColor: 'rgba(255,255,255,0.08)' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const hasAlert = tab.id === 'wheel' && isMyTurn && !spinResult;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabSynced(tab.id)}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all relative"
                style={{
                  color:      isActive ? '#22c55e' : 'rgba(255,255,255,0.35)',
                  background: isActive ? 'rgba(34,197,94,0.06)' : 'transparent',
                  borderTop:  isActive ? '2px solid #22c55e' : '2px solid transparent',
                }}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span className="text-xs font-semibold">{tab.label}</span>
                {hasAlert && (
                  <span className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full animate-pulse"
                    style={{ background: '#22c55e' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
