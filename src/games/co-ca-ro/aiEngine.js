// Gomoku AI engine for Cờ Ca Rô. Pure functions, no DOM/React deps, so this
// can run both on the main thread and inside the Web Worker (aiWorker.js).
export const BOARD_SIZE = 15;
const WIN_LENGTH = 5;
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const SEARCH_TIMEOUT = Symbol('search-timeout');

// Shown by the UI to build the difficulty picker; keeps labels/ids in one place.
export const LEVELS = [
  { id: 1, label: 'Dễ' },
  { id: 2, label: 'Vừa' },
  { id: 3, label: 'Khó' },
  { id: 4, label: 'Cao thủ' },
  { id: 5, label: 'Bậc thầy' },
];

// mode 'random'/'heuristic' play instantly; 'minimax' runs an iterative-
// deepening alpha-beta search bounded by timeBudgetMs so it can never hang.
const LEVEL_CONFIG = {
  1: { mode: 'random', blockChance: 0.65, defenseWeight: 1 },
  2: { mode: 'heuristic', blockChance: 1, defenseWeight: 1.15 },
  3: { mode: 'minimax', blockChance: 1, defenseWeight: 1.2, maxDepth: 3, maxBranch: 10, timeBudgetMs: 800 },
  4: { mode: 'minimax', blockChance: 1, defenseWeight: 1.3, maxDepth: 5, maxBranch: 14, timeBudgetMs: 700 },
  5: { mode: 'minimax', blockChance: 1, defenseWeight: 1.45, maxDepth: 9, maxBranch: 16, timeBudgetMs: 1200 },
};

const inBounds = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

export const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

// Returns the winning line through (row, col) for `player`, or null.
export const checkWinAt = (board, row, col, player) => {
  for (const [dr, dc] of DIRECTIONS) {
    const line = [{ row, col }];
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) {
      line.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) {
      line.push({ row: r, col: c });
      r -= dr;
      c -= dc;
    }
    if (line.length >= WIN_LENGTH) return line;
  }
  return null;
};

const findImmediateWin = (board, player) => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue;
      board[r][c] = player;
      const win = checkWinAt(board, r, c, player);
      board[r][c] = null;
      if (win) return { row: r, col: c };
    }
  }
  return null;
};

// Empty cells within `radius` of any existing stone — keeps the search/random
// pool focused on the live area of the board instead of the whole 15x15 grid.
const getCandidateMoves = (board, radius = 2) => {
  const found = new Set();
  let hasStone = false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!board[r][c]) continue;
      hasStone = true;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (inBounds(rr, cc) && !board[rr][cc]) found.add(rr * BOARD_SIZE + cc);
        }
      }
    }
  }
  if (!hasStone) {
    const mid = Math.floor(BOARD_SIZE / 2);
    return [[mid, mid]];
  }
  return Array.from(found, (v) => [Math.floor(v / BOARD_SIZE), v % BOARD_SIZE]);
};

const patternScore = (count, openEnds) => {
  if (count >= 5) return 1_000_000;
  if (count === 4) return openEnds === 2 ? 100_000 : (openEnds === 1 ? 10_000 : 0);
  if (count === 3) return openEnds === 2 ? 1_000 : (openEnds === 1 ? 200 : 0);
  if (count === 2) return openEnds === 2 ? 100 : (openEnds === 1 ? 20 : 0);
  if (count === 1) return openEnds === 2 ? 10 : (openEnds === 1 ? 2 : 0);
  return 0;
};

// Value of hypothetically placing `player` at an empty (row, col): the live
// run length + open ends it would create in each of the 4 directions.
const scoreCell = (board, row, col, player) => {
  let total = 0;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    let openEnds = 0;
    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c) && board[r][c] === player) { count++; r += dr; c += dc; }
    if (inBounds(r, c) && board[r][c] === null) openEnds++;
    r = row - dr;
    c = col - dc;
    while (inBounds(r, c) && board[r][c] === player) { count++; r -= dr; c -= dc; }
    if (inBounds(r, c) && board[r][c] === null) openEnds++;
    total += patternScore(count, openEnds);
  }
  return total;
};

const rankCandidates = (board, candidates, aiPlayer, humanPlayer, defenseWeight) =>
  candidates
    .map(([r, c]) => {
      const attack = scoreCell(board, r, c, aiPlayer);
      const defense = scoreCell(board, r, c, humanPlayer);
      return { row: r, col: c, score: attack + defense * defenseWeight };
    })
    .sort((a, b) => b.score - a.score);

// Sum of pattern scores for every existing run of `player`'s stones already
// on the board (each run counted once, from its start cell).
const scoreLines = (board, player) => {
  let total = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const pr = r - dr;
        const pc = c - dc;
        if (inBounds(pr, pc) && board[pr][pc] === player) continue; // not a run start
        let count = 0;
        let rr = r;
        let cc = c;
        while (inBounds(rr, cc) && board[rr][cc] === player) { count++; rr += dr; cc += dc; }
        const afterOpen = inBounds(rr, cc) && board[rr][cc] === null;
        const beforeOpen = inBounds(pr, pc) && board[pr][pc] === null;
        total += patternScore(count, (afterOpen ? 1 : 0) + (beforeOpen ? 1 : 0));
      }
    }
  }
  return total;
};

const evaluateBoard = (board, aiPlayer, humanPlayer, defenseWeight) =>
  scoreLines(board, aiPlayer) - scoreLines(board, humanPlayer) * defenseWeight;

const minimaxValue = (board, depth, alpha, beta, maximizing, aiPlayer, humanPlayer, defenseWeight, maxBranch, deadline) => {
  if (Date.now() > deadline) throw SEARCH_TIMEOUT;
  if (depth <= 0) return evaluateBoard(board, aiPlayer, humanPlayer, defenseWeight);

  const player = maximizing ? aiPlayer : humanPlayer;
  const candidates = getCandidateMoves(board, 2);
  if (candidates.length === 0) return evaluateBoard(board, aiPlayer, humanPlayer, defenseWeight);

  const ranked = rankCandidates(board, candidates, aiPlayer, humanPlayer, defenseWeight).slice(0, maxBranch);
  let best = maximizing ? -Infinity : Infinity;

  for (const { row: r, col: c } of ranked) {
    board[r][c] = player;
    const win = checkWinAt(board, r, c, player);
    const value = win
      ? (maximizing ? 1_000_000 + depth : -1_000_000 - depth)
      : minimaxValue(board, depth - 1, alpha, beta, !maximizing, aiPlayer, humanPlayer, defenseWeight, maxBranch, deadline);
    board[r][c] = null;

    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) break;
  }
  return best;
};

const searchRoot = (board, rootCandidates, depth, aiPlayer, humanPlayer, defenseWeight, maxBranch, deadline) => {
  let alpha = -Infinity;
  const beta = Infinity;
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const { row: r, col: c } of rootCandidates) {
    board[r][c] = aiPlayer;
    const win = checkWinAt(board, r, c, aiPlayer);
    const score = win
      ? 1_000_000 + depth
      : minimaxValue(board, depth - 1, alpha, beta, false, aiPlayer, humanPlayer, defenseWeight, maxBranch, deadline);
    board[r][c] = null;

    if (score > bestScore) { bestScore = score; bestMoves = [{ row: r, col: c }]; }
    else if (score === bestScore) bestMoves.push({ row: r, col: c });
    alpha = Math.max(alpha, score);
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

// Deepens 2 plies at a time (always ending right after the opponent's reply)
// until maxDepth or the time budget runs out, keeping the best fully-searched
// result found so far.
const iterativeDeepeningSearch = (board, rootCandidates, config, aiPlayer, humanPlayer) => {
  const deadline = Date.now() + config.timeBudgetMs;
  let bestMove = rootCandidates[0] ? { row: rootCandidates[0].row, col: rootCandidates[0].col } : null;

  for (let depth = 2; depth <= config.maxDepth; depth += 1) {
    try {
      const move = searchRoot(board, rootCandidates, depth, aiPlayer, humanPlayer, config.defenseWeight, config.maxBranch, deadline);
      if (move) bestMove = move;
    } catch (err) {
      if (err === SEARCH_TIMEOUT) break;
      throw err;
    }
    if (Date.now() > deadline) break;
  }
  return bestMove;
};

export const getAIMove = (board, level, aiPlayer = 'O', humanPlayer = 'X') => {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[2];

  const winningMove = findImmediateWin(board, aiPlayer);
  if (winningMove) return winningMove;

  const blockingMove = findImmediateWin(board, humanPlayer);
  if (blockingMove && Math.random() < (config.blockChance ?? 1)) return blockingMove;

  const candidates = getCandidateMoves(board, 2);
  if (candidates.length === 0) return null;

  if (config.mode === 'random') {
    const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
    return { row, col };
  }

  const ranked = rankCandidates(board, candidates, aiPlayer, humanPlayer, config.defenseWeight);

  if (config.mode === 'heuristic') {
    const best = ranked[0].score;
    const top = ranked.filter((m) => m.score === best);
    const pick = top[Math.floor(Math.random() * top.length)];
    return { row: pick.row, col: pick.col };
  }

  const rootCandidates = ranked.slice(0, config.maxBranch);
  return iterativeDeepeningSearch(board, rootCandidates, config, aiPlayer, humanPlayer);
};
