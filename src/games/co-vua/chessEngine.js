// Chess engine: legal move generation + 5-level AI (negamax + alpha-beta + quiescence)

export const BOARD_SIZE = 8;

const PV = { p:100, n:320, b:330, r:500, q:900, k:20000 };

// PST indexed [rank_from_own_back_rank][file], 0=own back rank, 7=opponent back rank
// For white piece at (r,c): PST[type][7-r][c]
// For black piece at (r,c): PST[type][r][c]
const PST = {
  p: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,-20,-20,10,10,5],
    [5,-5,-10,0,0,-10,-5,5],
    [0,0,0,20,20,0,0,0],
    [5,5,10,25,25,10,5,5],
    [10,10,20,30,30,20,10,10],
    [50,50,50,50,50,50,50,50],
    [0,0,0,0,0,0,0,0],
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,5,5,0,-20,-40],
    [-30,5,10,15,15,10,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,10,15,15,10,0,-30],
    [-40,-20,0,0,0,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,5,0,0,0,0,5,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,0,0,0,0,0,0,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  r: [
    [0,0,0,5,5,0,0,0],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [5,10,10,10,10,10,10,5],
    [0,0,0,0,0,0,0,0],
  ],
  q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,5,0,0,0,0,-10],
    [-10,5,5,5,5,5,0,-10],
    [0,0,5,5,5,5,0,-5],
    [-5,0,5,5,5,5,0,-5],
    [-10,0,5,5,5,5,0,-10],
    [-10,0,0,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20],
  ],
  k: [
    [20,30,10,0,0,10,30,20],
    [20,20,0,0,0,0,20,20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
  ],
};

export const LEVELS = [
  { id:1, name:'Dễ',    mode:'random'              },
  { id:2, name:'Trung', mode:'greedy'              },
  { id:3, name:'Khó',   mode:'minimax', depth:2    },
  { id:4, name:'Cao',   mode:'minimax', depth:3    },
  { id:5, name:'Huyền', mode:'minimax', depth:4    },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
export function createInitialBoard() {
  return [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    Array(8).fill(null), Array(8).fill(null),
    Array(8).fill(null), Array(8).fill(null),
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R'],
  ];
}

function cloneBoard(b) { return b.map(r => [...r]); }
function onBoard(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
export function isWhitePiece(p) { return !!p && p === p.toUpperCase(); }
function isEnemy(p, white) { return white ? (!!p && p !== p.toUpperCase()) : (!!p && p === p.toUpperCase()); }
function isFriend(p, white) { return white ? (!!p && p === p.toUpperCase()) : (!!p && p !== p.toUpperCase()); }

// ── Move generation ───────────────────────────────────────────────────────────
function pseudoMoves(board, r, c, ep) {
  const p = board[r][c]; if (!p) return [];
  const w = isWhitePiece(p), t = p.toUpperCase(), mvs = [];

  if (t === 'P') {
    const d = w ? -1 : 1, sr = w ? 6 : 1, pr = w ? 0 : 7;
    if (onBoard(r+d,c) && !board[r+d][c]) {
      mvs.push({ r:r+d, c, promo:r+d===pr });
      if (r === sr && !board[r+2*d][c]) mvs.push({ r:r+2*d, c });
    }
    for (const dc of [-1,1]) {
      if (onBoard(r+d,c+dc)) {
        if (isEnemy(board[r+d][c+dc],w)) mvs.push({ r:r+d, c:c+dc, promo:r+d===pr });
        if (ep && r+d===ep.r && c+dc===ep.c) mvs.push({ r:r+d, c:c+dc, ep:true });
      }
    }
  } else if (t === 'N') {
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nr=r+dr, nc=c+dc;
      if (onBoard(nr,nc) && !isFriend(board[nr][nc],w)) mvs.push({ r:nr, c:nc });
    }
  } else if (t === 'K') {
    for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nr=r+dr, nc=c+dc;
      if (onBoard(nr,nc) && !isFriend(board[nr][nc],w)) mvs.push({ r:nr, c:nc });
    }
  } else {
    const dirs = t==='B' ? [[-1,-1],[-1,1],[1,-1],[1,1]] :
                 t==='R' ? [[-1,0],[1,0],[0,-1],[0,1]] :
                           [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr,dc] of dirs) {
      let nr=r+dr, nc=c+dc;
      while (onBoard(nr,nc)) {
        if (!board[nr][nc]) mvs.push({ r:nr, c:nc });
        else { if (isEnemy(board[nr][nc],w)) mvs.push({ r:nr, c:nc }); break; }
        nr+=dr; nc+=dc;
      }
    }
  }
  return mvs;
}

function isAttacked(board, r, c, byWhite) {
  const d = byWhite ? 1 : -1;
  for (const dc of [-1,1]) { const pr=r+d,pc=c+dc; if(onBoard(pr,pc)){const q=board[pr][pc];if(q&&isWhitePiece(q)===byWhite&&q.toUpperCase()==='P')return true;} }
  for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) { const nr=r+dr,nc=c+dc; if(onBoard(nr,nc)){const q=board[nr][nc];if(q&&isWhitePiece(q)===byWhite&&q.toUpperCase()==='N')return true;} }
  for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) { let nr=r+dr,nc=c+dc; while(onBoard(nr,nc)){const q=board[nr][nc];if(q){if(isWhitePiece(q)===byWhite&&(q.toUpperCase()==='B'||q.toUpperCase()==='Q'))return true;break;}nr+=dr;nc+=dc;} }
  for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) { let nr=r+dr,nc=c+dc; while(onBoard(nr,nc)){const q=board[nr][nc];if(q){if(isWhitePiece(q)===byWhite&&(q.toUpperCase()==='R'||q.toUpperCase()==='Q'))return true;break;}nr+=dr;nc+=dc;} }
  for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) { const nr=r+dr,nc=c+dc; if(onBoard(nr,nc)){const q=board[nr][nc];if(q&&isWhitePiece(q)===byWhite&&q.toUpperCase()==='K')return true;} }
  return false;
}

function findKing(board, white) {
  const k = white ? 'K' : 'k';
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (board[r][c]===k) return {r,c};
  return null;
}

export function isInCheck(board, white) {
  const kp = findKing(board, white);
  return kp ? isAttacked(board, kp.r, kp.c, !white) : false;
}

function applyRawMove(board, fromR, fromC, mv) {
  const nb = cloneBoard(board);
  const p = nb[fromR][fromC], w = isWhitePiece(p);
  if (mv.castle) {
    const br = w?7:0; nb[br][4]=null;
    if (mv.castle==='K'){nb[br][6]=p;nb[br][5]=w?'R':'r';nb[br][7]=null;}
    else{nb[br][2]=p;nb[br][3]=w?'R':'r';nb[br][0]=null;}
  } else {
    nb[mv.r][mv.c] = mv.promo ? (w?'Q':'q') : p;
    nb[fromR][fromC] = null;
    if (mv.ep) nb[fromR][mv.c] = null;
  }
  return nb;
}

export function getLegalMoves(board, r, c, ep, castling) {
  const p = board[r][c]; if (!p) return [];
  const w = isWhitePiece(p), t = p.toUpperCase();
  const legal = [];
  for (const mv of pseudoMoves(board, r, c, ep)) {
    const nb = applyRawMove(board, r, c, mv);
    if (!isInCheck(nb, w)) legal.push(mv);
  }
  if (t === 'K') {
    const br = w?7:0;
    if (r===br && c===4) {
      if (castling[w?'wK':'bK'] && !board[br][5]&&!board[br][6] && !isAttacked(board,br,4,!w)&&!isAttacked(board,br,5,!w)&&!isAttacked(board,br,6,!w))
        legal.push({ r:br, c:6, castle:'K' });
      if (castling[w?'wQ':'bQ'] && !board[br][3]&&!board[br][2]&&!board[br][1] && !isAttacked(board,br,4,!w)&&!isAttacked(board,br,3,!w)&&!isAttacked(board,br,2,!w))
        legal.push({ r:br, c:2, castle:'Q' });
    }
  }
  return legal;
}

export function getAllLegalMoves(board, white, ep, castling) {
  const all = [];
  for (let r=0; r<8; r++) for (let c=0; c<8; c++)
    if (board[r][c] && isWhitePiece(board[r][c])===white)
      for (const mv of getLegalMoves(board, r, c, ep, castling))
        all.push({ fromR:r, fromC:c, ...mv });
  return all;
}

export function applyMoveToState({ board, whiteToMove, epTarget, castling }, fromR, fromC, mv) {
  const nb = applyRawMove(board, fromR, fromC, mv);
  const p = board[fromR][fromC], t = p.toUpperCase();
  const w = isWhitePiece(p);

  const newEP = (t==='P' && Math.abs(mv.r-fromR)===2) ? { r:(fromR+mv.r)/2, c:fromC } : null;

  const nc = { ...castling };
  if (t==='K'){if(w){nc.wK=false;nc.wQ=false;}else{nc.bK=false;nc.bQ=false;}}
  if (t==='R'){if(fromR===7&&fromC===7)nc.wK=false;if(fromR===7&&fromC===0)nc.wQ=false;if(fromR===0&&fromC===7)nc.bK=false;if(fromR===0&&fromC===0)nc.bQ=false;}
  // Rook captured
  if (!mv.castle) { const cap=board[mv.r][mv.c]; if(cap&&cap.toUpperCase()==='R'){if(mv.r===7&&mv.c===7)nc.wK=false;if(mv.r===7&&mv.c===0)nc.wQ=false;if(mv.r===0&&mv.c===7)nc.bK=false;if(mv.r===0&&mv.c===0)nc.bQ=false;} }

  return { board:nb, whiteToMove:!whiteToMove, epTarget:newEP, castling:nc };
}

// ── Evaluation ────────────────────────────────────────────────────────────────
function evaluate(board) {
  let score = 0;
  for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
    const p = board[r][c]; if (!p) continue;
    const w = isWhitePiece(p), t = p.toLowerCase();
    const pst = PST[t] ? (w ? PST[t][7-r][c] : PST[t][r][c]) : 0;
    score += (w ? 1 : -1) * (PV[t] + pst);
  }
  return score;
}

// ── Search ────────────────────────────────────────────────────────────────────
let _aborted = false;
let _startTime = 0;
let _budget = 0;

function quiesce(state, alpha, beta, depth=0) {
  const { board, whiteToMove:w, epTarget:ep, castling } = state;
  const sign = w ? 1 : -1;
  const stand = sign * evaluate(board);
  if (stand >= beta) return beta;
  if (depth > 6) return stand; // limit quiescence depth
  if (stand > alpha) alpha = stand;

  const caps = getAllLegalMoves(board, w, ep, castling).filter(mv => !mv.castle && board[mv.r][mv.c]);
  caps.sort((a,b) => PV[board[b.r][b.c].toLowerCase()] - PV[board[a.r][a.c].toLowerCase()]);

  for (const mv of caps) {
    const s2 = applyMoveToState(state, mv.fromR, mv.fromC, mv);
    const score = -quiesce(s2, -beta, -alpha, depth+1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(state, depth, alpha, beta) {
  if (_aborted || Date.now()-_startTime > _budget) { _aborted = true; return 0; }
  const { board, whiteToMove:w, epTarget:ep, castling } = state;
  if (depth === 0) return quiesce(state, alpha, beta);

  const moves = getAllLegalMoves(board, w, ep, castling);
  if (!moves.length) return isInCheck(board, w) ? (-20000 - depth) : 0;

  // Move ordering: captures first by MVV-LVA, then promos
  moves.sort((a,b) => {
    const av = (!a.castle&&board[a.r][a.c]) ? PV[board[a.r][a.c].toLowerCase()] : (a.promo?800:0);
    const bv = (!b.castle&&board[b.r][b.c]) ? PV[board[b.r][b.c].toLowerCase()] : (b.promo?800:0);
    return bv - av;
  });

  for (const mv of moves) {
    if (_aborted) return 0;
    const s2 = applyMoveToState(state, mv.fromR, mv.fromC, mv);
    const score = -negamax(s2, depth-1, -beta, -alpha);
    if (_aborted) return 0;
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

export function getAIMove(state, level) {
  const { board, whiteToMove:w, epTarget:ep, castling } = state;
  const cfg = LEVELS[level-1];
  const moves = getAllLegalMoves(board, w, ep, castling);
  if (!moves.length) return null;

  if (cfg.mode === 'random') {
    const caps = moves.filter(mv => !mv.castle && board[mv.r][mv.c]);
    const pool = caps.length && Math.random()<0.65 ? caps : moves;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  if (cfg.mode === 'greedy') {
    const sign = w ? 1 : -1;
    let best = moves[0], bestScore = -Infinity;
    for (const mv of moves) {
      const s2 = applyMoveToState(state, mv.fromR, mv.fromC, mv);
      const score = sign * evaluate(s2.board);
      if (score > bestScore) { bestScore = score; best = mv; }
    }
    return best;
  }

  // Minimax with iterative deepening up to cfg.depth
  _aborted = false;
  _startTime = Date.now();
  _budget = level === 3 ? 700 : level === 4 ? 1000 : 1400;

  moves.sort((a,b) => {
    const av = (!a.castle&&board[a.r][a.c]) ? PV[board[a.r][a.c].toLowerCase()] : (a.promo?800:0);
    const bv = (!b.castle&&board[b.r][b.c]) ? PV[board[b.r][b.c].toLowerCase()] : (b.promo?800:0);
    return bv - av;
  });

  let best = moves[0];
  for (let d = 1; d <= cfg.depth; d++) {
    if (_aborted) break;
    let iterBest = moves[0], iterScore = -Infinity;
    for (const mv of moves) {
      if (_aborted) break;
      const s2 = applyMoveToState(state, mv.fromR, mv.fromC, mv);
      const score = -negamax(s2, d-1, -Infinity, Infinity);
      if (!_aborted && score > iterScore) { iterScore = score; iterBest = mv; }
    }
    if (!_aborted) best = iterBest;
  }
  return best;
}
