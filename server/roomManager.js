// In-memory store for active rooms
// Structure: Map<roomCode, RoomObject>

const rooms = new Map();

/**
 * Room structure:
 * {
 *   code: string,
 *   hostId: string (socket.id),
 *   quizId: string,
 *   quiz: Object,        // full quiz data
 *   players: Map<socketId, PlayerObject>,
 *   state: 'lobby' | 'playing' | 'question' | 'reviewing' | 'finished',
 *   currentQuestionIndex: number,
 *   questionTimer: NodeJS.Timeout | null,
 *   questionStartTime: number | null,
 *   answeredThisRound: Set<socketId>
 * }
 *
 * Player structure:
 * {
 *   id: string,   // socket.id
 *   name: string,
 *   score: number,
 *   rank: number,
 *   answered: boolean
 * }
 */

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
  if (room && room.questionTimer) {
    clearInterval(room.questionTimer);
  }
  rooms.delete(code);
}

function addPlayer(code, socketId, playerName, avatar, avatarBg) {
  const room = getRoom(code);
  if (!room) return null;

  for (const [, player] of room.players) {
    if (player.name.toLowerCase() === playerName.toLowerCase()) {
      return null;
    }
  }

  const player = {
    id: socketId,
    name: playerName,
    avatar: avatar || '🎮',
    avatarBg: avatarBg || '#1A2A6C',
    score: 0,
    rank: room.players.size + 1,
    answered: false
  };
  room.players.set(socketId, player);
  return player;
}

function removePlayer(code, socketId) {
  const room = getRoom(code);
  if (!room) return;
  room.players.delete(socketId);
}

function getPlayerList(code) {
  const room = getRoom(code);
  if (!room) return [];
  return Array.from(room.players.values());
}

/**
 * Find which room a socket is in (as player or host)
 */
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
  removePlayer,
  getPlayerList,
  findRoomBySocket,
  rooms
};
