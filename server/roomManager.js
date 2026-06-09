const rooms = new Map();

function createRoom(code, hostId) {
  const room = {
    code,
    hostId,
    quizId: null,
    quiz: null,
    players: new Map(),
    state: 'lobby',
    currentQuestionIndex: -1,
    questionTimer: null,
    questionStartTime: null,
    answeredThisRound: new Set()
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function deleteRoom(code) {
  const room = rooms.get(code);
  if (room && room.questionTimer) clearInterval(room.questionTimer);
  rooms.delete(code);
}

function addPlayer(code, socketId, playerName, avatar, avatarBg) {
  const room = getRoom(code);
  if (!room) return null;

  const normalizedNew = playerName.trim().replace(/\s+/g, ' ').toLowerCase();

  for (const [existingSocketId, player] of room.players) {
    const normalizedExisting = player.name.trim().replace(/\s+/g, ' ').toLowerCase();
    if (normalizedExisting === normalizedNew) {
      if (player.disconnected) {
        // reconnect flow — sama seperti sebelumnya
        if (player.disconnectTimer) {
          clearTimeout(player.disconnectTimer);
          player.disconnectTimer = null;
        }
        room.players.delete(existingSocketId);
        player.id = socketId;
        player.disconnected = false;
        room.players.set(socketId, player);
        if (room.answeredThisRound.has(existingSocketId)) {
          room.answeredThisRound.delete(existingSocketId);
          room.answeredThisRound.add(socketId);
        }
        return { player, isReconnect: true };
      }
      return null;
    }
  }

  const player = {
    id: socketId,
    name: playerName.trim().replace(/\s+/g, ' '), // simpan nama yang sudah clean
    avatar: avatar || '🎮',
    avatarBg: avatarBg || '#1A2A6C',
    score: 0,
    rank: room.players.size + 1,
    answered: false,
    disconnected: false,
    disconnectTimer: null,
    pendingResult: null,
    lastAnswer: null
  };
  room.players.set(socketId, player);
  return { player, isReconnect: false };
}

function disconnectPlayer(code, socketId, onRemove) {
  const room = getRoom(code);
  if (!room) return;

  const player = room.players.get(socketId);
  if (!player) return;

  // Tandai disconnected, jangan hapus dulu
  player.disconnected = true;

  // Hapus setelah 30 detik kalau tidak reconnect
  player.disconnectTimer = setTimeout(() => {
    room.players.delete(socketId);
    if (onRemove) onRemove(player);
  }, 30000);
}

function removePlayer(code, socketId) {
  const room = getRoom(code);
  if (!room) return;
  const player = room.players.get(socketId);
  if (player && player.disconnectTimer) clearTimeout(player.disconnectTimer);
  room.players.delete(socketId);
}

function getPlayerList(code) {
  const room = getRoom(code);
  if (!room) return [];
  // Hanya return player yang masih connected
  return Array.from(room.players.values()).filter(p => !p.disconnected);
}

function findRoomBySocket(socketId) {
  for (const [, room] of rooms) {
    if (room.hostId === socketId) return room;
    if (room.players.has(socketId)) return room;
  }
  return null;
}

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
  addPlayer,
  disconnectPlayer,
  removePlayer,
  getPlayerList,
  findRoomBySocket,
  rooms
};