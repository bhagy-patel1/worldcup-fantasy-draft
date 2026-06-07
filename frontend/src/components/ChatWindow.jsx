import React, { useState, useEffect, useRef } from 'react';

/**
 * Returns a deterministic Tailwind text-color class based on the nickname string.
 */
function nicknameColor(name) {
  const colors = [
    'text-blue-400',
    'text-green-400',
    'text-yellow-400',
    'text-pink-400',
    'text-purple-400',
    'text-orange-400',
    'text-cyan-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Format a timestamp (epoch ms or ISO string) to HH:MM.
 */
function formatTime(timestamp) {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

export default function ChatWindow({ socket, roomId, nickname, messages }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socket || !roomId || !nickname) return;
    socket.emit('Messages', { roomId, nickname, text });
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const remaining = 300 - input.length;
  const showCounter = input.length > 250;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <span className="font-bold text-white text-sm flex items-center gap-2">
          💬 Live Chat
        </span>
        <span className="text-xs text-gray-400">
          {messages.filter((m) => !m.isSystem).length > 0
            ? `${new Set(messages.filter((m) => !m.isSystem).map((m) => m.nickname)).size} player${
                new Set(messages.filter((m) => !m.isSystem).map((m) => m.nickname)).size !== 1 ? 's' : ''
              }`
            : null}
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs italic text-center mt-4">No messages yet. Say hello! 👋</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="leading-snug">
            {msg.isSystem ? (
              /* System message */
              <p className="text-yellow-400/70 text-xs italic">
                {formatTime(msg.timestamp) && (
                  <span className="text-gray-600 text-xs mr-1 not-italic">{formatTime(msg.timestamp)}</span>
                )}
                {msg.text}
              </p>
            ) : (
              /* Player message */
              <p className="text-gray-200 text-sm break-words">
                {formatTime(msg.timestamp) && (
                  <span className="text-gray-600 text-xs mr-1">{formatTime(msg.timestamp)}</span>
                )}
                <span className={`font-semibold ${nicknameColor(msg.nickname || '')}`}>
                  {msg.nickname}
                </span>
                <span className="text-gray-500 mx-0.5">:</span>
                {msg.text}
              </p>
            )}
          </div>
        ))}
        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 bg-gray-800 border-t border-gray-700 px-3 py-3">
        {showCounter && (
          <p className={`text-xs mb-1 text-right ${remaining <= 10 ? 'text-red-400' : 'text-gray-500'}`}>
            {remaining} chars remaining
          </p>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={300}
            placeholder="Type a message…"
            className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 border border-transparent focus:border-green-500 transition-colors"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || !socket}
            aria-label="Send message"
            className="shrink-0 px-3 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
