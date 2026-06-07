'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Task 3.1: Import csvLoader — triggers CSV parse at startup; exits on failure
const { footballers, nationIndex } = require('./services/csvLoader');

// Task 3.1: Import all named exports from roomState
const {
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
} = require('./services/roomState');

// ---------------------------------------------------------------------------
// Express + HTTP + Socket.io setup (Task 3.1)
// ---------------------------------------------------------------------------

const app = express();

// CORS — allow configured frontend origin or all origins in dev
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: allowedOrigin, credentials: allowedOrigin !== '*' }));

// Health-check endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: allowedOrigin !== '*',
  },
  transports: ['websocket', 'polling'],
});

// ---------------------------------------------------------------------------
// Socket.io connection handler
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // -------------------------------------------------------------------------
  // rejoin_room — reconnect after page refresh
  // Payload: { roomId, nickname }
  // -------------------------------------------------------------------------
  socket.on('rejoin_room', ({ roomId, nickname }) => {
    try {
      const snapshot = reconnectPlayer(roomId, nickname, socket.id);
      socket.join(roomId);
      // Send current room state back only to this socket
      socket.emit('room_state_updated', snapshot);
      // If currently in drafting state, re-send the current draft pool
      const room = rooms.get(roomId);
      if (room && room.status === 'drafting' && room.draftPool.length > 0) {
        socket.emit('wheel_spin_result', {
          nation: room.currentNation,
          draftPool: room.draftPool,
        });
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // Task 3.2: join_room_request
  // Payload: { roomId, password, nickname, action: 'create' | 'join' }
  // -------------------------------------------------------------------------
  socket.on('join_room_request', ({ roomId, password, nickname, action }) => {
    try {
      if (action === 'create') {
        createRoom(roomId, password, nickname, socket.id);
      } else {
        joinRoom(roomId, password, nickname, socket.id);
      }
      socket.join(roomId);
      io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // Task 3.3: trigger_wheel_spin
  // Payload: { roomId }
  // -------------------------------------------------------------------------
  socket.on('trigger_wheel_spin', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: `Room not found: "${roomId}"` });
      return;
    }

    // Validate that it's this socket's turn
    const activePlayer = room.players[room.turnQueueIndex];
    if (!activePlayer || activePlayer.socketId !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    // Validate room status
    if (room.status !== 'waiting') {
      socket.emit('error', { message: room.status === 'trade_window' ? 'Spinning is paused — Trade Window is open' : 'Room is not ready for a spin' });
      return;
    }

    // Pick a random nation
    const nation = VALID_NATIONS[Math.floor(Math.random() * VALID_NATIONS.length)];

    room.status = 'spinning';
    room.currentNation = nation;

    // Broadcast spin start to the room
    io.to(roomId).emit('wheel_spin_start', { nation, duration: 3000 });

    // After spin duration, resolve the draft pool
    setTimeout(() => {
      // Re-fetch room in case state has changed
      const currentRoom = rooms.get(roomId);
      if (!currentRoom) return;

      // Filter draft pool from undraftedPool for the spun nation
      let chosenNation = currentRoom.currentNation;
      let draftPool = [...currentRoom.undraftedPool.values()].filter(
        f => f.nation === chosenNation
      );

      // Auto re-spin if draftPool is empty — try remaining nations
      if (draftPool.length === 0) {
        // Build list of remaining nations that have undrafted players
        const triedNations = new Set([chosenNation]);
        let found = false;

        for (let i = 0; i < VALID_NATIONS.length; i++) {
          const candidateNation = VALID_NATIONS[Math.floor(Math.random() * VALID_NATIONS.length)];
          if (triedNations.has(candidateNation)) continue;
          triedNations.add(candidateNation);

          const candidatePool = [...currentRoom.undraftedPool.values()].filter(
            f => f.nation === candidateNation
          );
          if (candidatePool.length > 0) {
            chosenNation = candidateNation;
            draftPool = candidatePool;
            found = true;
            break;
          }
        }

        // If still empty after trying random nations, do a full sequential scan
        if (!found) {
          for (const nation of VALID_NATIONS) {
            if (triedNations.has(nation)) continue;
            const candidatePool = [...currentRoom.undraftedPool.values()].filter(
              f => f.nation === nation
            );
            if (candidatePool.length > 0) {
              chosenNation = nation;
              draftPool = candidatePool;
              break;
            }
          }
        }
      }

      currentRoom.currentNation = chosenNation;
      currentRoom.draftPool = draftPool;
      currentRoom.status = 'drafting';

      io.to(roomId).emit('wheel_spin_result', {
        nation: currentRoom.currentNation,
        draftPool: currentRoom.draftPool,
      });

      startDraftTimer(roomId, io);

      io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
    }, 3000);
  });

  // -------------------------------------------------------------------------
  // Task 3.7: player_draft_selection
  // Payload: { roomId, footballerId }
  // -------------------------------------------------------------------------
  socket.on('player_draft_selection', ({ roomId, footballerId }) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: `Room not found: "${roomId}"` });
        return;
      }

      // Validate it's this socket's turn
      const activePlayer = room.players[room.turnQueueIndex];
      if (!activePlayer || activePlayer.socketId !== socket.id) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      const nickname = activePlayer.nickname;

      // Validate room is in drafting state
      if (room.status !== 'drafting') {
        socket.emit('error', { message: 'Room is not in drafting state' });
        return;
      }

      const fId = Number(footballerId);

      // Validate footballer exists in undraftedPool
      if (!room.undraftedPool.has(fId)) {
        socket.emit('error', { message: `Footballer ${fId} is not in the undrafted pool` });
        return;
      }

      const footballer = room.undraftedPool.get(fId);

      // Validate footballer's nation matches currentNation
      if (footballer.nation !== room.currentNation) {
        socket.emit('error', {
          message: `Footballer ${fId} is not from the current nation (${room.currentNation})`,
        });
        return;
      }

      // Clear the draft timer before applying draft
      clearDraftTimer(roomId);

      // Apply the draft
      applyDraft(roomId, fId, nickname);

      // Set status back to waiting
      room.status = 'waiting';

      // Broadcast draft system message
      io.to(roomId).emit('chat_broadcast', {
        nickname: 'System',
        text: `${nickname} drafted ${footballer.name}!`,
        timestamp: Date.now(),
        isSystem: true,
      });

      // Advance turn
      advanceTurn(roomId);

      // After 22 picks, notify players that the trade window button is now unlocked
      const updatedRoom = rooms.get(roomId);
      if (updatedRoom && updatedRoom.spinCount === 22) {
        io.to(roomId).emit('chat_broadcast', {
          nickname: 'System',
          text: '🤝 22 picks made — Trade Window is now unlocked! Any player can open it from the wheel panel.',
          timestamp: Date.now(),
          isSystem: true,
        });
      }

      // Check game over
      if (checkGameOver(roomId)) {
        io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
      } else {
        io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // Task 3.8: switch_formation
  // Payload: { roomId, formation }
  // -------------------------------------------------------------------------
  socket.on('switch_formation', ({ roomId, formation }) => {
    try {
      switchFormation(roomId, socket.id, formation);
      io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // remove_from_slot — move a footballer from a lineup slot back to bench
  // Payload: { roomId, slotKey }
  // -------------------------------------------------------------------------
  socket.on('remove_from_slot', ({ roomId, slotKey }) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: `Room not found: "${roomId}"` });
        return;
      }
      const player = room.players.find(p => p.socketId === socket.id);
      if (!player) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }
      const footballer = player.lineup[slotKey];
      if (!footballer) return; // slot already empty, no-op
      player.lineup[slotKey] = null;
      player.bench.push(footballer);
      io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // assign_to_slot (bonus — needed for pitch)
  // Payload: { roomId, footballerId, slotKey }
  // -------------------------------------------------------------------------
  socket.on('assign_to_slot', ({ roomId, footballerId, slotKey }) => {
    try {
      assignToSlot(roomId, socket.id, Number(footballerId), slotKey);
      io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // open_trade_window — host manually opens trade window (or auto after 11 spins)
  // Payload: { roomId }
  // -------------------------------------------------------------------------
  socket.on('open_trade_window', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Can only open trade window between spins' });
      return;
    }
    if (room.spinCount < 22) {
      socket.emit('error', { message: 'Trade window unlocks after 22 picks' });
      return;
    }
    room.tradeWindowOpen = true;
    room.status = 'trade_window';
    io.to(roomId).emit('trade_window_opened', {});
    io.to(roomId).emit('chat_broadcast', {
      nickname: 'System',
      text: `🤝 Trade Window opened by a player! Draft paused — compare squads and make deals.`,
      timestamp: Date.now(),
      isSystem: true,
    });
    io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
  });

  // -------------------------------------------------------------------------
  // propose_trade
  // Payload: { roomId, fromNickname, toNickname, offeredPlayerId, wantedPlayerId, includeSpinToken }
  // -------------------------------------------------------------------------
  socket.on('propose_trade', ({ roomId, fromNickname, toNickname, offeredPlayerId, wantedPlayerId, includeSpinToken }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    if (!room.tradeWindowOpen) { socket.emit('error', { message: 'Trade window is not open' }); return; }
    if (room.pendingTrade) { socket.emit('error', { message: 'A trade is already pending' }); return; }

    const fromPlayer = room.players.find(p => p.nickname === fromNickname);
    const toPlayer   = room.players.find(p => p.nickname === toNickname);
    if (!fromPlayer || !toPlayer) { socket.emit('error', { message: 'Player not found' }); return; }

    // Validate offered player is in fromPlayer bench (or lineup)
    const offeredInBench  = fromPlayer.bench.find(f => f.id === offeredPlayerId);
    const offeredInLineup = Object.values(fromPlayer.lineup).find(f => f && f.id === offeredPlayerId);
    if (!offeredInBench && !offeredInLineup) {
      socket.emit('error', { message: 'You do not own the offered player' }); return;
    }

    // If wantedPlayerId provided, validate toPlayer owns it
    if (wantedPlayerId) {
      const wantedInBench  = toPlayer.bench.find(f => f.id === wantedPlayerId);
      const wantedInLineup = Object.values(toPlayer.lineup).find(f => f && f.id === wantedPlayerId);
      if (!wantedInBench && !wantedInLineup) {
        socket.emit('error', { message: 'Target does not own the wanted player' }); return;
      }
    }

    room.pendingTrade = {
      fromNickname,
      toNickname,
      offeredPlayerId,
      wantedPlayerId: wantedPlayerId || null,
      includeSpinToken: !!includeSpinToken,
      status: 'pending',
    };

    io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));

    // Notify target player
    const toSocket = room.players.find(p => p.nickname === toNickname);
    if (toSocket) {
      io.to(roomId).emit('trade_proposed', { trade: room.pendingTrade });
    }
  });

  // -------------------------------------------------------------------------
  // respond_trade
  // Payload: { roomId, nickname, accept }
  // -------------------------------------------------------------------------
  socket.on('respond_trade', ({ roomId, nickname, accept }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', { message: 'Room not found' }); return; }
    if (!room.pendingTrade) { socket.emit('error', { message: 'No pending trade' }); return; }

    const trade = room.pendingTrade;
    if (trade.toNickname !== nickname) {
      socket.emit('error', { message: 'You are not the target of this trade' }); return;
    }

    if (!accept) {
      room.pendingTrade = null;
      io.to(roomId).emit('trade_declined', { fromNickname: trade.fromNickname });
      io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
      return;
    }

    // Execute the trade
    const fromPlayer = room.players.find(p => p.nickname === trade.fromNickname);
    const toPlayer   = room.players.find(p => p.nickname === trade.toNickname);

    // Helper: remove player from bench or lineup, return { footballer, fromLineupSlot }
    const removeFromPlayer = (player, footballerId) => {
      const benchIdx = player.bench.findIndex(f => f.id === footballerId);
      if (benchIdx !== -1) {
        return { footballer: player.bench.splice(benchIdx, 1)[0], fromLineupSlot: null };
      }
      for (const [slot, f] of Object.entries(player.lineup)) {
        if (f && f.id === footballerId) {
          player.lineup[slot] = null;
          return { footballer: f, fromLineupSlot: slot };
        }
      }
      return null;
    };

    const { footballer: offeredF, fromLineupSlot: offeredSlot } = removeFromPlayer(fromPlayer, trade.offeredPlayerId) || {};
    if (!offeredF) { socket.emit('error', { message: 'Offered player not found' }); return; }

    let wantedF = null, wantedSlot = null;
    if (trade.wantedPlayerId) {
      const result = removeFromPlayer(toPlayer, trade.wantedPlayerId);
      if (!result) { socket.emit('error', { message: 'Wanted player not found' }); return; }
      wantedF = result.footballer; wantedSlot = result.fromLineupSlot;
    }

    // Place offeredF into toPlayer (bench or original lineup slot if compatible)
    if (offeredSlot && toPlayer.lineup[offeredSlot] !== undefined) {
      toPlayer.lineup[offeredSlot] = offeredF;
    } else {
      toPlayer.bench.push(offeredF);
    }

    // Place wantedF into fromPlayer
    if (wantedF) {
      if (wantedSlot && fromPlayer.lineup[wantedSlot] !== undefined) {
        fromPlayer.lineup[wantedSlot] = wantedF;
      } else {
        fromPlayer.bench.push(wantedF);
      }
    }

    // Handle spin token: bump turnQueueIndex so fromPlayer gets an extra turn next
    if (trade.includeSpinToken) {
      // Insert fromPlayer right before the next spin by adjusting turnQueueIndex
      // so that after current turn they go again — we just set turnQueueIndex to fromPlayer's index
      const fromIdx = room.players.findIndex(p => p.nickname === trade.fromNickname);
      if (fromIdx !== -1) {
        room.turnQueueIndex = fromIdx;
      }
    }

    room.pendingTrade = null;

    const systemMsg = trade.wantedPlayerId
      ? `Trade complete: ${trade.fromNickname} ↔ ${trade.toNickname} swapped players${trade.includeSpinToken ? ' + spin token' : ''}!`
      : `Trade complete: ${trade.fromNickname} gave a player to ${trade.toNickname}${trade.includeSpinToken ? ' + spin token' : ''}!`;

    room.chatLog.push({ nickname: 'System', text: systemMsg, timestamp: Date.now(), isSystem: true });
    io.to(roomId).emit('chat_broadcast', { nickname: 'System', text: systemMsg, timestamp: Date.now(), isSystem: true });
    io.to(roomId).emit('trade_completed', { trade });
    io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
  });

  // -------------------------------------------------------------------------
  // close_trade_window
  // Payload: { roomId }
  // -------------------------------------------------------------------------
  socket.on('close_trade_window', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.tradeWindowOpen = false;
    room.pendingTrade = null;
    if (room.status === 'trade_window') room.status = 'waiting';
    io.to(roomId).emit('trade_window_closed', {});
    io.to(roomId).emit('room_state_updated', getRoomSnapshot(roomId));
  });

  // -------------------------------------------------------------------------
  // Task 3.9: Messages
  // Payload: { roomId, nickname, text }
  // -------------------------------------------------------------------------
  socket.on('Messages', ({ roomId, nickname, text }) => {
    if (!text || text.length > 300) return; // silently discard
    const room = rooms.get(roomId);
    if (!room) return;
    const entry = { nickname, text, timestamp: Date.now(), isSystem: false };
    room.chatLog.push(entry);
    io.to(roomId).emit('chat_broadcast', entry);
  });

  // -------------------------------------------------------------------------
  // Task 3.12: disconnect
  // -------------------------------------------------------------------------
  socket.on('disconnect', () => {
    handleDisconnect(socket.id, io);
  });
});

// ---------------------------------------------------------------------------
// Start server (Task 3.1)
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(
    `[server] Listening on port ${PORT} — ${footballers.length} footballers loaded across ${nationIndex.size} nations`
  );
});

module.exports = { app, httpServer, io };
