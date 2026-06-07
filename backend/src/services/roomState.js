'use strict';

const { footballers } = require('./csvLoader');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_NATIONS = [
  'France', 'Spain', 'England', 'Germany', 'Brazil', 'Portugal',
  'Argentina', 'Belgium', 'Uruguay', 'Croatia', 'Netherlands', 'Morocco',
];

/**
 * Lineup slot keys per formation.
 * These are the ONLY valid slot keys for each formation.
 */
const FORMATION_SLOTS = {
  '4-3-3':        ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LCM', 'CM', 'RCM', 'LW', 'ST', 'RW'],
  '4-4-2':        ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LM', 'LCM', 'RCM', 'RM', 'LST', 'RST'],
  '3-4-3':        ['GK', 'LCB', 'CB', 'RCB', 'LM', 'LCM', 'RCM', 'RM', 'LW', 'ST', 'RW'],
  '4-2-3-1':      ['GK', 'LB', 'LCB', 'RCB', 'RB', 'LDM', 'RDM', 'LAM', 'CAM', 'RAM', 'ST'],
  '3-5-2':        ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'LCM', 'CM', 'RCM', 'RWB', 'LST', 'RST'],
  '5-3-2':        ['GK', 'LWB', 'LCB', 'CB', 'RCB', 'RWB', 'LCM', 'CM', 'RCM', 'LST', 'RST'],
  '4-1-4-1':      ['GK', 'LB', 'LCB', 'RCB', 'RB', 'DM', 'LM', 'LCM', 'RCM', 'RM', 'ST'],
  '4-4-2 Diamond':['GK', 'LB', 'LCB', 'RCB', 'RB', 'CDM', 'LCM', 'RCM', 'CAM', 'LST', 'RST'],
  '3-3-3-1':      ['GK', 'LCB', 'CB', 'RCB', 'LDM', 'CDM', 'RDM', 'LW', 'CAM', 'RW', 'ST'],
  '5-4-1':        ['GK', 'LWB', 'LCB', 'CB', 'RCB', 'RWB', 'LM', 'LCM', 'RCM', 'RM', 'ST'],
};

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} roomId -> RoomState */
const rooms = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fresh lineup object for the given formation, all slots null.
 * @param {string} formation
 * @returns {object}
 */
function buildLineup(formation) {
  const lineup = {};
  for (const slot of FORMATION_SLOTS[formation]) {
    lineup[slot] = null;
  }
  return lineup;
}

/**
 * Build a new player object with default formation '4-3-3'.
 * @param {string} nickname
 * @param {string} socketId
 * @returns {object}
 */
function buildPlayer(nickname, socketId) {
  const formation = '4-3-3';
  return {
    nickname,
    socketId,
    formation,
    lineup: buildLineup(formation),
    bench: [],
  };
}

// ---------------------------------------------------------------------------
// createRoom
// ---------------------------------------------------------------------------

/**
 * Create a new room.
 * @param {string} roomId
 * @param {string} password
 * @param {string} nickname
 * @param {string} socketId
 * @returns {object} the new room state
 */
function createRoom(roomId, password, nickname, socketId) {
  if (rooms.has(roomId)) {
    throw new Error(`Room already exists: "${roomId}"`);
  }

  // Deep copy undraftedPool from master footballers array
  const undraftedPool = new Map(footballers.map(f => [f.id, { ...f }]));

  const room = {
    roomId,
    password,
    status: 'waiting',
    gameOver: false,
    suspended: false,
    players: [buildPlayer(nickname, socketId)],
    turnQueueIndex: 0,
    currentNation: null,
    draftPool: [],
    undraftedPool,
    chatLog: [],
    timerEndsAt: null,
    _timerId: null,
    spinCount: 0,
    tradeWindowOpen: false,
    pendingTrade: null,
  };

  rooms.set(roomId, room);
  return room;
}

// ---------------------------------------------------------------------------
// joinRoom
// ---------------------------------------------------------------------------

/**
 * Join an existing room.
 * @param {string} roomId
 * @param {string} password
 * @param {string} nickname
 * @param {string} socketId
 * @returns {object} the updated room state
 */
function joinRoom(roomId, password, nickname, socketId) {
  if (!rooms.has(roomId)) {
    throw new Error(`Room not found: "${roomId}"`);
  }

  const room = rooms.get(roomId);

  if (room.password !== password) {
    throw new Error('Incorrect room password');
  }

  if (room.players.some(p => p.nickname === nickname)) {
    throw new Error(`Nickname "${nickname}" is already taken in this room`);
  }

  if (room.players.length >= 8) {
    throw new Error('Room is full (maximum 8 players)');
  }

  if (room.status !== 'waiting') {
    throw new Error('Cannot join a room while a draft is in progress');
  }

  room.players.push(buildPlayer(nickname, socketId));
  return room;
}

// ---------------------------------------------------------------------------
// getRoom
// ---------------------------------------------------------------------------

/**
 * Get a room by ID, throwing if it doesn't exist.
 * @param {string} roomId
 * @returns {object}
 */
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    throw new Error(`Room not found: "${roomId}"`);
  }
  return rooms.get(roomId);
}

// ---------------------------------------------------------------------------
// applyDraft
// ---------------------------------------------------------------------------

/**
 * Apply a draft selection: remove from undraftedPool, push to player bench,
 * append system chat message.
 * @param {string} roomId
 * @param {number} footballerId
 * @param {string} nickname
 * @returns {object} the drafted footballer
 */
function applyDraft(roomId, footballerId, nickname) {
  const room = getRoom(roomId);

  const player = room.players.find(p => p.nickname === nickname);
  if (!player) {
    throw new Error(`Player "${nickname}" not found in room "${roomId}"`);
  }

  if (!room.undraftedPool.has(footballerId)) {
    throw new Error(`Footballer ${footballerId} is not in the undrafted pool`);
  }

  const footballer = room.undraftedPool.get(footballerId);
  room.undraftedPool.delete(footballerId);
  player.bench.push(footballer);

  room.chatLog.push({
    nickname: 'System',
    text: `${nickname} drafted ${footballer.name}!`,
    timestamp: Date.now(),
    isSystem: true,
  });

  return footballer;
}

// ---------------------------------------------------------------------------
// advanceTurn
// ---------------------------------------------------------------------------

/**
 * Advance the turn queue to the next player.
 * @param {string} roomId
 */
function advanceTurn(roomId) {
  const room = getRoom(roomId);
  room.turnQueueIndex = (room.turnQueueIndex + 1) % room.players.length;
  room.currentNation = null;
  room.draftPool = [];
  room.status = 'waiting';
  room.spinCount = (room.spinCount || 0) + 1;
}

// ---------------------------------------------------------------------------
// autoDraft
// ---------------------------------------------------------------------------

/**
 * Auto-draft a random footballer from the current draftPool.
 * @param {string} roomId
 * @param {string} nickname  nickname of the player to draft for
 * @returns {object} the drafted footballer
 */
function autoDraft(roomId, nickname) {
  const room = getRoom(roomId);

  if (!room.draftPool || room.draftPool.length === 0) {
    throw new Error('Draft pool is empty — cannot auto-draft');
  }

  const idx = Math.floor(Math.random() * room.draftPool.length);
  const footballer = room.draftPool[idx];

  applyDraft(roomId, footballer.id, nickname);
  advanceTurn(roomId);

  return footballer;
}

// ---------------------------------------------------------------------------
// startDraftTimer
// ---------------------------------------------------------------------------

/**
 * Start a 30-second draft timer. On expiry, auto-drafts for the active player.
 * @param {string} roomId
 * @param {object} io  Socket.io server instance
 */
function startDraftTimer(roomId, io) {
  const room = getRoom(roomId);

  // Clear any existing timer
  if (room._timerId !== null) {
    clearTimeout(room._timerId);
    room._timerId = null;
  }

  room.timerEndsAt = Date.now() + 150_000; // 2 min 30 sec
  room.status = 'drafting';

  room._timerId = setTimeout(() => {
    // Re-fetch room in case state changed
    const currentRoom = rooms.get(roomId);
    if (!currentRoom) return;

    if (currentRoom.status !== 'drafting') {
      // Selection was already made — do nothing
      return;
    }

    const activePlayer = currentRoom.players[currentRoom.turnQueueIndex];
    if (!activePlayer) return;

    const nickname = activePlayer.nickname;

    let draftedPlayer;
    try {
      draftedPlayer = autoDraft(roomId, nickname);
    } catch (err) {
      // draftPool exhausted — nothing to auto-draft
      console.error(`[startDraftTimer] autoDraft failed for room "${roomId}": ${err.message}`);
      return;
    }

    io.to(roomId).emit('turn_timeout', {
      autoDraftedPlayer: draftedPlayer,
      nickname,
    });

    io.to(roomId).emit('chat_broadcast', {
      nickname: 'System',
      text: `${nickname} was auto-drafted ${draftedPlayer.name}!`,
      timestamp: Date.now(),
      isSystem: true,
    });

    io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
  }, 150_000);
}

// ---------------------------------------------------------------------------
// clearDraftTimer
// ---------------------------------------------------------------------------

/**
 * Clear the draft timer for a room.
 * @param {string} roomId
 */
function clearDraftTimer(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room._timerId !== null) {
    clearTimeout(room._timerId);
    room._timerId = null;
  }
  room.timerEndsAt = null;
}

// ---------------------------------------------------------------------------
// switchFormation
// ---------------------------------------------------------------------------

/**
 * Switch a player's formation, resetting lineup slots accordingly.
 * @param {string} roomId
 * @param {string} socketId
 * @param {string} formation  one of '4-3-3', '4-4-2', '3-4-3'
 */
function switchFormation(roomId, socketId, formation) {
  if (!FORMATION_SLOTS[formation]) {
    throw new Error(`Invalid formation: "${formation}". Valid: ${Object.keys(FORMATION_SLOTS).join(', ')}`);
  }

  const room = getRoom(roomId);
  const player = room.players.find(p => p.socketId === socketId);
  if (!player) {
    throw new Error(`No player found with socketId "${socketId}" in room "${roomId}"`);
  }

  const newSlots = FORMATION_SLOTS[formation];
  const oldLineup = player.lineup;

  // Build new lineup preserving any footballers whose slot keys still exist in the new formation
  const newLineup = {};
  for (const slot of newSlots) {
    newLineup[slot] = oldLineup[slot] !== undefined ? oldLineup[slot] : null;
  }

  // Any footballer in a slot that no longer exists gets moved back to bench
  for (const [slot, footballer] of Object.entries(oldLineup)) {
    if (!newSlots.includes(slot) && footballer !== null) {
      player.bench.push(footballer);
    }
  }

  player.formation = formation;
  player.lineup = newLineup;
}

// ---------------------------------------------------------------------------
// assignToSlot
// ---------------------------------------------------------------------------

/**
 * Assign a footballer from bench to a lineup slot.
 * @param {string} roomId
 * @param {string} socketId
 * @param {number} footballerId
 * @param {string} slotKey
 */
function assignToSlot(roomId, socketId, footballerId, slotKey) {
  const room = getRoom(roomId);
  const player = room.players.find(p => p.socketId === socketId);
  if (!player) {
    throw new Error(`No player found with socketId "${socketId}" in room "${roomId}"`);
  }

  const slots = FORMATION_SLOTS[player.formation];
  if (!slots || !slots.includes(slotKey)) {
    throw new Error(`Slot "${slotKey}" is not valid for formation "${player.formation}"`);
  }

  const benchIdx = player.bench.findIndex(f => f.id === footballerId);
  if (benchIdx === -1) {
    throw new Error(`Footballer ${footballerId} is not in player "${player.nickname}"'s bench`);
  }

  const footballer = player.bench.splice(benchIdx, 1)[0];

  // If there was already someone in the slot, move them back to bench
  if (player.lineup[slotKey] !== null) {
    player.bench.push(player.lineup[slotKey]);
  }

  player.lineup[slotKey] = footballer;
}

/**
 * Reconnect a player who already exists in a room (e.g. after page refresh).
 * Updates their socketId so they can receive events again.
 * @param {string} roomId
 * @param {string} nickname
 * @param {string} newSocketId
 * @returns {object} the room snapshot
 */
function reconnectPlayer(roomId, nickname, newSocketId) {
  if (!rooms.has(roomId)) {
    throw new Error(`Room not found: "${roomId}"`);
  }
  const room = rooms.get(roomId);
  const player = room.players.find(p => p.nickname === nickname);
  if (!player) {
    throw new Error(`Player "${nickname}" not found in room "${roomId}"`);
  }

  // Cancel the eviction timer if it's running
  if (player._evictTimer) {
    clearTimeout(player._evictTimer);
    player._evictTimer = null;
  }

  // Clear disconnected marker and update socket
  player.disconnectedAt = null;
  player.socketId = newSocketId;

  // Unsuspend if we now have enough players
  if (room.suspended && room.players.length >= 2) {
    room.suspended = false;
    if (room.status === 'suspended') room.status = 'waiting';
  }

  return getRoomSnapshot(roomId);
}
// ---------------------------------------------------------------------------

/**
 * Check if the game is over — every player has 15 total players (lineup + bench).
 * @param {string} roomId
 * @returns {boolean}
 */
function checkGameOver(roomId) {
  const room = getRoom(roomId);

  const allHave15 = room.players.every(player => {
    const lineupCount = Object.values(player.lineup).filter(Boolean).length;
    const benchCount  = player.bench.length;
    return lineupCount + benchCount >= 15;
  });

  if (allHave15) {
    room.status = 'done';
    room.gameOver = true;
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// getRoomSnapshot
// ---------------------------------------------------------------------------

/**
 * Return a serialisable snapshot of the room — safe to send to clients.
 * Converts undraftedPool Map to a count; omits _timerId and password.
 * @param {string} roomId
 * @returns {object}
 */
function getRoomSnapshot(roomId) {
  const room = getRoom(roomId);

  return {
    roomId: room.roomId,
    status: room.status,
    gameOver: room.gameOver,
    suspended: room.suspended,
    players: room.players.map(p => ({
      nickname: p.nickname,
      socketId: p.socketId,
      formation: p.formation,
      lineup: { ...p.lineup },
      bench: [...p.bench],
    })),
    turnQueueIndex: room.turnQueueIndex,
    currentNation: room.currentNation,
    draftPool: [...room.draftPool],
    undraftedCount: room.undraftedPool.size,
    chatLog: [...room.chatLog],
    timerEndsAt: room.timerEndsAt,
    spinCount: room.spinCount || 0,
    tradeWindowOpen: room.tradeWindowOpen || false,
    pendingTrade: room.pendingTrade || null,
  };
}

// ---------------------------------------------------------------------------
// handleDisconnect
// ---------------------------------------------------------------------------

/**
 * Handle a socket disconnect: mark player as disconnected, give a 10-second
 * grace window for rejoin before actually removing them from the room.
 * @param {string} socketId
 * @param {object} io  Socket.io server instance
 */
function handleDisconnect(socketId, io) {
  let foundRoomId = null;
  for (const [roomId, room] of rooms) {
    if (room.players.some(p => p.socketId === socketId)) {
      foundRoomId = roomId;
      break;
    }
  }

  if (foundRoomId === null) return;

  const room = rooms.get(foundRoomId);
  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return;

  // Mark as disconnected — don't remove yet
  player.disconnectedAt = Date.now();

  // Give 10 seconds for rejoin before evicting
  const evictTimer = setTimeout(() => {
    const currentRoom = rooms.get(foundRoomId);
    if (!currentRoom) return;

    // If the player reconnected in the meantime their disconnectedAt is cleared
    const p = currentRoom.players.find(pp => pp.nickname === player.nickname);
    if (!p || !p.disconnectedAt) return; // already rejoined — do nothing

    const playerIdx = currentRoom.players.indexOf(p);
    const wasActiveTurn = currentRoom.players[currentRoom.turnQueueIndex]?.nickname === p.nickname;

    // Auto-draft if they were the active player and there's a pool
    if (wasActiveTurn && currentRoom.draftPool && currentRoom.draftPool.length > 0) {
      try { autoDraft(foundRoomId, p.nickname); } catch (_) {}
    }

    currentRoom.players.splice(playerIdx, 1);

    if (currentRoom.players.length === 0) {
      rooms.delete(foundRoomId);
      return;
    }

    if (currentRoom.players.length < 2) {
      currentRoom.suspended = true;
      currentRoom.status = 'suspended';
    }

    if (currentRoom.turnQueueIndex >= currentRoom.players.length) {
      currentRoom.turnQueueIndex = 0;
    }

    io.to(foundRoomId).emit('room_state_updated', getRoomSnapshot(foundRoomId));
  }, 10_000);

  // Store timer so reconnect can cancel it
  player._evictTimer = evictTimer;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  rooms,
  VALID_NATIONS,
  FORMATION_SLOTS,
  createRoom,
  joinRoom,
  getRoom,
  applyDraft,
  advanceTurn,
  autoDraft,
  startDraftTimer,
  clearDraftTimer,
  switchFormation,
  assignToSlot,
  checkGameOver,
  getRoomSnapshot,
  handleDisconnect,
  reconnectPlayer,
};
