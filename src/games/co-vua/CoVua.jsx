import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { playSound } from '../../utils/audio';
import { ArrowLeft, HelpCircle, RotateCcw, FlipHorizontal2, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  createInitialBoard, getLegalMoves, getAllLegalMoves,
  isInCheck, isWhitePiece, applyMoveToState, LEVELS,
} from './chessEngine';

const UNICODE = {
  K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',
  k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟',
};
const INIT_CASTLING = { wK:true, wQ:true, bK:true, bQ:true };
const TURN_LIMIT = 300;

const formatTime = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

/** Find king position for the side to move after a state update */
function findKing(board, white) {
  const k = white ? 'K' : 'k';
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === k) return { r, c };
  return null;
}

export default function CoVua({ onBack }) {
  const [board, setBoard] = useState(createInitialBoard);
  const [whiteToMove, setWhiteToMove] = useState(true);
  const [epTarget, setEpTarget] = useState(null);
  const [castling, setCastling] = useState(INIT_CASTLING);
  const [gameStatus, setGameStatus] = useState('play');

  const [selected, setSelected] = useState(null);
  const [legalCache, setLegalCache] = useState([]);
  const [lastFrom, setLastFrom] = useState(null);
  const [lastTo, setLastTo] = useState(null);
  // Stored in state so render never calls isInCheck
  const [checkingKing, setCheckingKing] = useState(null);

  const [flipped, setFlipped] = useState(false);
  const [difficulty, setDifficulty] = useState(2);
  const [gameMode, setGameMode] = useState('pve');

  const [scoreW, setScoreW] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_LIMIT);

  const stateRef = useRef(null);
  const workerRef = useRef(null);
  const reqId = useRef(0);

  useEffect(() => {
    stateRef.current = { board, whiteToMove, epTarget, castling };
  }, [board, whiteToMove, epTarget, castling]);

  useEffect(() => {
    const w = new Worker(new URL('./chessWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = w;
    w.onmessage = ({ data }) => {
      if (data.requestId !== reqId.current) return;
      if (data.move && stateRef.current) {
        const { fromR, fromC, ...mv } = data.move;
        commitMove(stateRef.current, fromR, fromC, mv);
      }
      setAiThinking(false);
    };
    return () => w.terminate();
  }, []);

  const isHumanTurn = gameMode === 'pve' && whiteToMove && gameStatus === 'play';
  useEffect(() => {
    if (!isHumanTurn) return;
    setTimeLeft(TURN_LIMIT);
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [isHumanTurn]);

  useEffect(() => {
    if (isHumanTurn && timeLeft === 0) {
      setTimedOut(true);
      setGameStatus('black_wins');
      setScoreB(s => s + 1);
      playSound('lose');
    }
  }, [timeLeft, isHumanTurn]);

  useEffect(() => {
    if (gameStatus !== 'play') return;
    if (!(gameMode === 'pve' && !whiteToMove)) return;
    const cur = stateRef.current;
    setAiThinking(true);
    const id = ++reqId.current;
    // Short delay lets React flush the move visually before heavy worker compute
    setTimeout(() => {
      workerRef.current?.postMessage({ state: cur, level: difficulty, requestId: id });
    }, 60);
  }, [whiteToMove, gameMode, gameStatus, difficulty]);

  const commitMove = useCallback((state, fromR, fromC, mv) => {
    const newState = applyMoveToState(state, fromR, fromC, mv);
    setBoard(newState.board);
    setWhiteToMove(newState.whiteToMove);
    setEpTarget(newState.epTarget);
    setCastling(newState.castling);
    setLastFrom({ r: fromR, c: fromC });
    setLastTo({ r: mv.r, c: mv.c });
    setSelected(null);
    setLegalCache([]);

    // Compute check/end-state once here, not on every render
    const moves = getAllLegalMoves(newState.board, newState.whiteToMove, newState.epTarget, newState.castling);
    if (!moves.length) {
      setCheckingKing(null);
      if (isInCheck(newState.board, newState.whiteToMove)) {
        const winner = newState.whiteToMove ? 'black_wins' : 'white_wins';
        setGameStatus(winner);
        if (winner === 'white_wins') {
          setScoreW(s => s + 1); playSound('win');
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        } else {
          setScoreB(s => s + 1); playSound('lose');
        }
      } else {
        setGameStatus('stalemate');
      }
    } else {
      // Store check position so render never has to call isInCheck
      if (isInCheck(newState.board, newState.whiteToMove)) {
        setCheckingKing(findKing(newState.board, newState.whiteToMove));
      } else {
        setCheckingKing(null);
      }
      playSound('click');
    }
  }, []);

  const handleSquareClick = useCallback((r, c) => {
    if (gameStatus !== 'play' || aiThinking) return;
    if (gameMode === 'pve' && !whiteToMove) return;

    const p = board[r][c];
    const humanPiece = gameMode === 'pve'
      ? isWhitePiece(p)
      : (whiteToMove ? isWhitePiece(p) : (!isWhitePiece(p) && !!p));

    if (selected) {
      const mv = legalCache.find(m => {
        const tc = m.castle ? (m.castle === 'K' ? 6 : 2) : m.c;
        const tr = m.castle ? (whiteToMove ? 7 : 0) : m.r;
        return tr === r && tc === c;
      });
      if (mv) { playSound('click'); commitMove(stateRef.current, selected.r, selected.c, mv); return; }
      if (p && humanPiece) {
        setSelected({ r, c });
        setLegalCache(getLegalMoves(board, r, c, epTarget, castling));
        return;
      }
      setSelected(null); setLegalCache([]); return;
    }
    if (p && humanPiece) {
      setSelected({ r, c });
      setLegalCache(getLegalMoves(board, r, c, epTarget, castling));
    }
  }, [board, selected, legalCache, whiteToMove, gameStatus, aiThinking, gameMode, epTarget, castling, commitMove]);

  const newGame = useCallback(() => {
    playSound('click');
    reqId.current++;
    setBoard(createInitialBoard());
    setWhiteToMove(true);
    setEpTarget(null);
    setCastling(INIT_CASTLING);
    setGameStatus('play');
    setSelected(null); setLegalCache([]);
    setLastFrom(null); setLastTo(null);
    setCheckingKing(null);
    setAiThinking(false);
    setTimedOut(false);
    setTimeLeft(TURN_LIMIT);
  }, []);

  // Precompute valid-move squares as a Set: O(1) lookup in render instead of O(n) per square
  const validSquares = useMemo(() => {
    const s = new Set();
    for (const m of legalCache) {
      const tr = m.castle ? (whiteToMove ? 7 : 0) : m.r;
      const tc = m.castle ? (m.castle === 'K' ? 6 : 2) : m.c;
      s.add(`${tr}-${tc}`);
    }
    return s;
  }, [legalCache, whiteToMove]);

  const isHumanTurnActive = gameMode === 'pve' && whiteToMove && gameStatus === 'play';
  const isAiTurnActive    = gameMode === 'pve' && !whiteToMove && gameStatus === 'play';

  let statusText = '';
  if (gameStatus === 'white_wins')     statusText = timedOut ? 'Hết giờ — Đen thắng!' : 'Trắng thắng! 🎉';
  else if (gameStatus === 'black_wins') statusText = gameMode === 'pve' ? 'Máy thắng! Cố lên!' : 'Đen thắng! 🎉';
  else if (gameStatus === 'stalemate')  statusText = 'Hòa — Pat!';
  else if (aiThinking)                  statusText = 'Máy đang suy nghĩ...';
  else statusText = whiteToMove ? 'Lượt của Trắng ♟' : 'Lượt của Đen ♟';

  return (
    <div className="game-container">
      {/* ── Header ── */}
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back"><ArrowLeft size={18} /></button>
        <h1 className="game-title">Cờ Vua</h1>
        <button onClick={() => { playSound('click'); setShowRules(true); }} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      {/* ── Score panel ── */}
      <div className="widget-panel cv-score-panel">
        <div className="caro-control-row">
          <div className="seg-switch">
            {[['pve', '🤖 vs Máy'], ['2p', '👥 2 Người']].map(([m, label]) => (
              <button key={m} className={`seg-btn ${gameMode === m ? 'active' : ''}`}
                onClick={() => { playSound('click'); setGameMode(m); newGame(); }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="vs-scoreboard">
          <div className={`vs-score-card ${isAiTurnActive ? 'active' : ''}`}>
            <div className="score-card-label">
              <span className="cv-stone cv-stone-b" style={{ width: 10, height: 10, display: 'inline-block', marginRight: 5, verticalAlign: 'middle' }} />
              {gameMode === 'pve' ? 'Máy AI' : 'Người 2'}
            </div>
            <div className="score-card-value">{scoreB}</div>
            <div className="cv-card-sub">
              {isAiTurnActive ? 'Đang suy nghĩ...' : gameStatus === 'black_wins' ? '🏆 Thắng' : 'Đang chờ'}
            </div>
          </div>

          <div className={`vs-score-card ${isHumanTurnActive ? 'active' : ''}`}>
            <div className="score-card-label">
              <span className="cv-stone cv-stone-w" style={{ width: 10, height: 10, display: 'inline-block', marginRight: 5, verticalAlign: 'middle' }} />
              {gameMode === 'pve' ? 'Bạn' : 'Người 1'}
            </div>
            <div className="score-card-value">{scoreW}</div>
            {isHumanTurnActive ? (
              <div className={`cv-timer-sm ${timeLeft <= 30 ? 'cv-timer-low' : ''}`}>
                <Timer size={10} /> {formatTime(timeLeft)}
              </div>
            ) : (
              <div className="cv-card-sub">
                {gameStatus === 'white_wins' ? '🏆 Thắng' : 'Đang chờ'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Board ── */}
      <div className="cv-board-outer">
        <div className="cv-ranks">
          {Array.from({ length: 8 }, (_, vi) => {
            const rank = flipped ? vi + 1 : 8 - vi;
            return <div key={vi} className="cv-rank-label">{rank}</div>;
          })}
        </div>
        <div className="cv-board-frame">
          <div className="cv-chess-board">
            {Array.from({ length: 64 }, (_, i) => {
              const vi = i >> 3;          // Math.floor(i / 8)
              const vj = i & 7;           // i % 8
              const r = flipped ? 7 - vi : vi;
              const c = flipped ? 7 - vj : vj;
              const light = (r + c) % 2 === 0;
              const p     = board[r][c];
              const isSel   = selected?.r === r && selected?.c === c;
              const isLastF = lastFrom?.r === r && lastFrom?.c === c;
              const isLastT = lastTo?.r   === r && lastTo?.c   === c;
              const isChk   = checkingKing?.r === r && checkingKing?.c === c;
              const isVm    = validSquares.has(`${r}-${c}`);
              const hasP    = !!p;

              let cls = 'cv-sq ' + (light ? 'cv-sq-l' : 'cv-sq-d');
              if (isSel) cls += ' cv-sq-sel';
              else if (isLastF || isLastT) cls += ' cv-sq-last';
              if (isChk) cls += ' cv-sq-chk';
              if (isVm)  cls += ' cv-sq-vm' + (hasP ? ' cv-sq-vm-occ' : '');

              return (
                <div key={i} className={cls} onClick={() => handleSquareClick(r, c)}>
                  {p && <span className={isWhitePiece(p) ? 'cv-piece-w' : 'cv-piece-b'}>{UNICODE[p]}</span>}
                  {vi === 7 && <span className="cv-coord-file">{'abcdefgh'[c]}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Status ── */}
      <div className={`cv-status-msg ${gameStatus === 'white_wins' ? 'cv-msg-win' : gameStatus === 'black_wins' ? 'cv-msg-lose' : gameStatus === 'stalemate' ? 'cv-msg-draw' : ''}`}>
        {statusText}
      </div>

      {/* ── Difficulty ── */}
      {gameMode === 'pve' && (
        <div className="difficulty-row">
          <span className="difficulty-label">Độ khó</span>
          <div className="seg-switch difficulty-switch">
            {LEVELS.map(l => (
              <button key={l.id} className={`seg-btn ${difficulty === l.id ? 'active' : ''}`}
                onClick={() => { playSound('click'); setDifficulty(l.id); }}>
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="cv-actions">
        <button onClick={newGame} className="btn-primary-action" style={{ flex: 1 }}>
          <RotateCcw size={14} style={{ marginRight: 6 }} /> Chơi Lại
        </button>
        <button onClick={() => { playSound('click'); setFlipped(f => !f); }} className="btn-secondary-action cv-flip-btn">
          <FlipHorizontal2 size={14} />
        </button>
      </div>

      {/* ── Rules modal ── */}
      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Cờ Vua</h3>
            <div className="modal-body">
              <p>1. <strong>Mục tiêu:</strong> Chiếu hết (Checkmate) vua đối phương.</p>
              <p>2. Nhấp vào quân cờ để chọn, các ô hợp lệ sẽ được đánh dấu.</p>
              <p>3. Nhấp vào ô đánh dấu để di chuyển quân.</p>
              <p>4. <strong>Nhập thành:</strong> Di chuyển vua sang phải/trái 2 ô (nếu đủ điều kiện).</p>
              <p>5. <strong>Phong cấp:</strong> Tốt đến hàng cuối tự động thành Hậu.</p>
              <p>6. Trong chế độ vs Máy bạn có <strong>5 phút</strong> mỗi lượt — hết giờ thua.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => { playSound('click'); setShowRules(false); }} className="btn-primary-action">
                Đồng Ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
