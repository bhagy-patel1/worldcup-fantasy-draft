import React, { useState, useEffect } from 'react';
import { Trophy, Users, Lock, User, PlusCircle, LogIn } from 'lucide-react';

export default function Lobby({ socket, onJoined }) {
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [fields, setFields] = useState({ roomId: '', password: '', nickname: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('[Lobby] render, socket:', socket?.id || 'null');

  useEffect(() => {
    if (!socket) {
      console.log('[Lobby] no socket yet');
      return;
    }

    console.log('[Lobby] socket ready, attaching listeners');

    const onRoomStateUpdated = () => {
      console.log('[Lobby] room_state_updated received');
      setLoading(false);
      onJoined(fields.nickname, fields.roomId.trim());
    };

    const onError = ({ message }) => {
      console.log('[Lobby] error received:', message);
      setLoading(false);
      setError(message);
    };

    socket.on('room_state_updated', onRoomStateUpdated);
    socket.on('error', onError);

    return () => {
      socket.off('room_state_updated', onRoomStateUpdated);
      socket.off('error', onError);
    };
  }, [socket, fields.nickname, onJoined]);

  const handleChange = (e) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { roomId, password, nickname } = fields;
    if (!roomId.trim() || !password.trim() || !nickname.trim()) {
      setError('All fields are required');
      return;
    }
    if (!socket) {
      setError('Connecting to server… please try again in a moment');
      return;
    }
    setError('');
    setLoading(true);
    socket.emit('join_room_request', {
      roomId: roomId.trim(),
      password: password.trim(),
      nickname: nickname.trim(),
      action: tab,
    });
  };

  const flags = ['🇫🇷', '🇪🇸', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇩🇪', '🇧🇷', '🇵🇹', '🇦🇷', '🇧🇪', '🇺🇾', '🇭🇷', '🇨🇭', '🇲🇦', '🇨🇴'];

  return (
    <div className="app-shell w-full flex flex-col items-center justify-center bg-gray-950 px-4 py-8 overflow-y-auto">
      {/* Decorative flag banner */}
      <div className="mb-6 flex gap-2 text-2xl select-none" aria-hidden="true">
        {flags.map((flag, i) => (
          <span key={i} className="opacity-80 hover:opacity-100 transition-opacity">
            {flag}
          </span>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">
        {/* Card header with gradient */}
        <div className="bg-gradient-to-br from-green-900 via-green-800 to-yellow-900 px-6 pt-8 pb-6 text-center">
          <div className="text-5xl mb-2" aria-label="World Cup Trophy">🏆</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">WC Draft</h1>
          <p className="text-green-300 text-sm mt-1 opacity-80">World Cup Nation Draft Game</p>
        </div>

        {/* Player count info */}
        <div className="flex items-center justify-center gap-2 bg-gray-800 border-b border-gray-700 py-2 text-gray-400 text-xs">
          <Users size={13} />
          <span>2–8 players per room</span>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-700">
          <button
            type="button"
            onClick={() => { setTab('create'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              tab === 'create'
                ? 'bg-green-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
            }`}
          >
            <PlusCircle size={15} />
            Create Room
          </button>
          <button
            type="button"
            onClick={() => { setTab('join'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              tab === 'join'
                ? 'bg-green-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
            }`}
          >
            <LogIn size={15} />
            Join Room
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4" noValidate>
          {/* Room ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Room ID
            </label>
            <div className="relative">
              <Trophy size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                name="roomId"
                value={fields.roomId}
                onChange={handleChange}
                placeholder="e.g. worldcup2026"
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                name="password"
                value={fields.password}
                onChange={handleChange}
                placeholder="Room password"
                autoComplete="new-password"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
              Nickname
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                name="nickname"
                value={fields.nickname}
                onChange={handleChange}
                placeholder="Your nickname"
                autoComplete="off"
                maxLength={30}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !socket}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-all duration-150 active:scale-95 mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Connecting…</span>
            ) : tab === 'create' ? (
              <>
                <PlusCircle size={16} />
                Create Room
              </>
            ) : (
              <>
                <LogIn size={16} />
                Join Room
              </>
            )}
          </button>
        </form>

        {/* Footer hint */}
        <p className="text-center text-gray-600 text-xs pb-4">
          {tab === 'create'
            ? 'Share your Room ID & password with friends to let them join'
            : 'Ask the room creator for the Room ID and password'}
        </p>
      </div>

      {/* Bottom flag row */}
      <div className="mt-6 flex gap-2 text-xl select-none opacity-40" aria-hidden="true">
        {flags.slice(0, 7).map((flag, i) => (
          <span key={i}>{flag}</span>
        ))}
      </div>
    </div>
  );
}
