import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT || 3000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const CARO_BOARD_SIZE = 12;

const rooms = new Map();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Built frontend (vite build output). Present when running the production image.
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const hasDist = fs.existsSync(path.join(DIST_DIR, 'index.html'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.map': 'application/json; charset=utf-8',
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
};

const serveStatic = (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  // Resolve within DIST_DIR and guard against path traversal.
  const requested = path.normalize(path.join(DIST_DIR, urlPath));
  if (!requested.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (urlPath !== '/' && fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    sendFile(res, requested);
    return;
  }

  // SPA fallback: serve index.html for any unmatched route.
  sendFile(res, path.join(DIST_DIR, 'index.html'));
};

const createHttpServer = () => http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }

  if (hasDist) {
    serveStatic(req, res);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Game Viet realtime server is running.');
});

const httpServer = createHttpServer();

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

const createRoomCode = () => {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
};

const createCaroState = () => ({
  board: Array.from({ length: CARO_BOARD_SIZE }, () => Array(CARO_BOARD_SIZE).fill(null)),
  isXNext: true,
  winner: null,
  winningLine: [],
  lastMove: null,
});

const createOAnQuanBoard = () => [
  { id: 0, small: 5, big: 0, isMandarin: false },
  { id: 1, small: 5, big: 0, isMandarin: false },
  { id: 2, small: 5, big: 0, isMandarin: false },
  { id: 3, small: 5, big: 0, isMandarin: false },
  { id: 4, small: 5, big: 0, isMandarin: false },
  { id: 5, small: 0, big: 1, isMandarin: true },
  { id: 6, small: 5, big: 0, isMandarin: false },
  { id: 7, small: 5, big: 0, isMandarin: false },
  { id: 8, small: 5, big: 0, isMandarin: false },
  { id: 9, small: 5, big: 0, isMandarin: false },
  { id: 10, small: 5, big: 0, isMandarin: false },
  { id: 11, small: 0, big: 1, isMandarin: true },
];

const createOAnQuanState = () => ({
  board: createOAnQuanBoard(),
  p1Score: 0,
  p2Score: 0,
  isP1Turn: true,
  winner: null,
  lastMove: null,
});

const createInitialState = (gameId) => {
  if (gameId === 'co-ca-ro') return createCaroState();
  if (gameId === 'o-an-quan') return createOAnQuanState();
  throw new Error('Game is not supported for online play.');
};

const serializePlayers = (room) => Array.from(room.players.values()).map((player) => ({
  role: player.role,
  connected: true,
}));

const emitRoomState = (room) => {
  for (const [socketId, player] of room.players.entries()) {
    io.to(socketId).emit('roomState', {
      roomCode: room.code,
      gameId: room.gameId,
      playerRole: player.role,
      players: serializePlayers(room),
      state: room.state,
    });
  }
};

const getNextRole = (room) => {
  const roles = new Set(Array.from(room.players.values()).map((player) => player.role));
  if (!roles.has('P1')) return 'P1';
  if (!roles.has('P2')) return 'P2';
  return null;
};

const findPlayerRoom = (socketId) => {
  for (const room of rooms.values()) {
    if (room.players.has(socketId)) return room;
  }
  return null;
};

const removePlayer = (socketId) => {
  const room = findPlayerRoom(socketId);
  if (!room) return;

  room.players.delete(socketId);
  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }

  emitRoomState(room);
};

const checkDraw = (board) => board.every((row) => row.every((cell) => cell !== null));

const checkCaroWin = (board, row, col, player) => {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const { dr, dc } of directions) {
    const line = [{ row, col }];
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < CARO_BOARD_SIZE && c >= 0 && c < CARO_BOARD_SIZE && board[r][c] === player) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < CARO_BOARD_SIZE && c >= 0 && c < CARO_BOARD_SIZE && board[r][c] === player) {
      line.push({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    if (line.length >= 5) return line;
  }

  return null;
};

const makeCaroMove = (room, role, move) => {
  const { row, col } = move || {};
  const state = room.state;
  const currentRole = state.isXNext ? 'P1' : 'P2';

  if (room.players.size < 2) return { ok: false, error: 'Đang chờ người chơi thứ 2.' };
  if (state.winner) return { ok: false, error: 'Ván này đã kết thúc.' };
  if (role !== currentRole) return { ok: false, error: 'Chưa tới lượt của bạn.' };
  if (!Number.isInteger(row) || !Number.isInteger(col)) return { ok: false, error: 'Nước đi không hợp lệ.' };
  if (row < 0 || row >= CARO_BOARD_SIZE || col < 0 || col >= CARO_BOARD_SIZE) return { ok: false, error: 'Ô này nằm ngoài bàn cờ.' };
  if (state.board[row][col]) return { ok: false, error: 'Ô này đã có quân.' };

  const symbol = role === 'P1' ? 'X' : 'O';
  state.board = state.board.map((boardRow, rIdx) => (
    boardRow.map((cell, cIdx) => (rIdx === row && cIdx === col ? symbol : cell))
  ));
  state.lastMove = { row, col };

  const winLine = checkCaroWin(state.board, row, col, symbol);
  if (winLine) {
    state.winner = symbol;
    state.winningLine = winLine;
  } else if (checkDraw(state.board)) {
    state.winner = 'Draw';
  } else {
    state.isXNext = !state.isXNext;
  }

  return { ok: true };
};

const ensureOAnQuanRefill = (state) => {
  if (state.winner) return;

  const activeSlots = state.isP1Turn ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
  const totalSeeds = activeSlots.reduce((sum, idx) => sum + state.board[idx].small, 0);
  if (totalSeeds > 0) return;

  if (state.isP1Turn) state.p1Score -= 5;
  else state.p2Score -= 5;

  state.board = state.board.map((slot, idx) => (
    activeSlots.includes(idx) ? { ...slot, small: 1 } : slot
  ));
};

const finishOAnQuanIfNeeded = (state) => {
  const gameOver = state.board[5].small === 0 && state.board[5].big === 0
    && state.board[11].small === 0 && state.board[11].big === 0;

  if (!gameOver) return false;

  let finalP1Score = state.p1Score;
  let finalP2Score = state.p2Score;

  state.board = state.board.map((slot, idx) => {
    if (idx >= 0 && idx <= 4) {
      finalP1Score += slot.small;
      return { ...slot, small: 0 };
    }
    if (idx >= 6 && idx <= 10) {
      finalP2Score += slot.small;
      return { ...slot, small: 0 };
    }
    return slot;
  });

  state.p1Score = finalP1Score;
  state.p2Score = finalP2Score;
  state.winner = finalP1Score === finalP2Score ? 'Draw' : (finalP1Score > finalP2Score ? 'P1' : 'P2');
  return true;
};

const makeOAnQuanMove = (room, role, move) => {
  const { slot, direction } = move || {};
  const state = room.state;
  const currentRole = state.isP1Turn ? 'P1' : 'P2';

  ensureOAnQuanRefill(state);

  if (room.players.size < 2) return { ok: false, error: 'Đang chờ người chơi thứ 2.' };
  if (state.winner) return { ok: false, error: 'Ván này đã kết thúc.' };
  if (role !== currentRole) return { ok: false, error: 'Chưa tới lượt của bạn.' };
  if (!Number.isInteger(slot) || (direction !== 1 && direction !== -1)) return { ok: false, error: 'Nước đi không hợp lệ.' };
  if (role === 'P1' && (slot < 0 || slot > 4)) return { ok: false, error: 'Bạn chỉ được đi hàng dưới.' };
  if (role === 'P2' && (slot < 6 || slot > 10)) return { ok: false, error: 'Bạn chỉ được đi hàng trên.' };
  if (state.board[slot].small === 0) return { ok: false, error: 'Ô này không còn sỏi.' };

  const board = state.board.map((item) => ({ ...item }));
  let handCount = board[slot].small;
  board[slot].small = 0;
  let currIdx = slot;
  let captured = 0;

  while (handCount > 0) {
    currIdx = (currIdx + direction + 12) % 12;
    board[currIdx].small += 1;
    handCount -= 1;

    if (handCount === 0) {
      let nextIdx = (currIdx + direction + 12) % 12;

      if (board[nextIdx].small > 0 && !board[nextIdx].isMandarin) {
        handCount = board[nextIdx].small;
        board[nextIdx].small = 0;
        currIdx = nextIdx;
      } else if (board[nextIdx].isMandarin) {
        break;
      } else {
        let targetIdx = (nextIdx + direction + 12) % 12;

        while (board[nextIdx].small === 0 && (board[targetIdx].small > 0 || board[targetIdx].big > 0)) {
          captured += board[targetIdx].small + board[targetIdx].big * 10;
          board[targetIdx].small = 0;
          board[targetIdx].big = 0;

          nextIdx = (targetIdx + direction + 12) % 12;
          targetIdx = (nextIdx + direction + 12) % 12;
        }
        break;
      }
    }
  }

  state.board = board;
  state.lastMove = { slot, direction };
  if (role === 'P1') state.p1Score += captured;
  else state.p2Score += captured;

  if (!finishOAnQuanIfNeeded(state)) {
    state.isP1Turn = !state.isP1Turn;
    ensureOAnQuanRefill(state);
  }

  return { ok: true };
};

const makeMove = (room, socketId, move) => {
  const player = room.players.get(socketId);
  if (!player) return { ok: false, error: 'Bạn không ở trong phòng này.' };

  if (room.gameId === 'co-ca-ro') return makeCaroMove(room, player.role, move);
  if (room.gameId === 'o-an-quan') return makeOAnQuanMove(room, player.role, move);
  return { ok: false, error: 'Game chưa hỗ trợ online.' };
};

io.on('connection', (socket) => {
  socket.on('createRoom', ({ gameId } = {}, callback) => {
    try {
      const code = createRoomCode();
      const room = {
        code,
        gameId,
        players: new Map([[socket.id, { role: 'P1' }]]),
        state: createInitialState(gameId),
      };

      rooms.set(code, room);
      socket.join(code);
      callback?.({ ok: true, roomCode: code, playerRole: 'P1', players: serializePlayers(room), state: room.state });
      emitRoomState(room);
    } catch (error) {
      callback?.({ ok: false, error: error.message });
    }
  });

  socket.on('joinRoom', ({ roomCode } = {}, callback) => {
    const code = roomCode?.toString().trim();
    const room = rooms.get(code);

    if (!room) {
      callback?.({ ok: false, error: 'Không tìm thấy phòng.' });
      return;
    }

    const role = getNextRole(room);
    if (!role) {
      callback?.({ ok: false, error: 'Phòng đã đủ 2 người.' });
      return;
    }

    removePlayer(socket.id);
    room.players.set(socket.id, { role });
    socket.join(room.code);
    callback?.({ ok: true, roomCode: room.code, gameId: room.gameId, playerRole: role, players: serializePlayers(room), state: room.state });
    emitRoomState(room);
  });

  socket.on('makeMove', ({ roomCode, move } = {}, callback) => {
    const room = rooms.get(roomCode);
    if (!room) {
      callback?.({ ok: false, error: 'Phòng không còn tồn tại.' });
      return;
    }

    const result = makeMove(room, socket.id, move);
    callback?.(result);
    if (result.ok) emitRoomState(room);
  });

  socket.on('resetRoom', ({ roomCode } = {}, callback) => {
    const room = rooms.get(roomCode);
    if (!room || !room.players.has(socket.id)) {
      callback?.({ ok: false, error: 'Không thể reset phòng này.' });
      return;
    }

    room.state = createInitialState(room.gameId);
    callback?.({ ok: true });
    emitRoomState(room);
  });

  socket.on('leaveRoom', () => {
    removePlayer(socket.id);
  });

  socket.on('disconnect', () => {
    removePlayer(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Realtime server listening on http://localhost:${PORT}`);
});
