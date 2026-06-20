import { useEffect, useRef, useState } from 'react';
import { playSound } from '../../utils/audio';
import { RotateCcw, HelpCircle, Users, Cpu, ArrowLeft, Wifi, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BOARD_SIZE, LEVELS, checkWinAt } from './aiEngine';

const createEmptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
const checkWin = checkWinAt;
const TURN_TIME_LIMIT = 300; // 5 minutes per human turn, PvE only
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function CoCaRo({ onBack, onlineSession }) {
  const isOnline = Boolean(onlineSession);
  const [board, setBoard] = useState(() => onlineSession?.initialState?.board || createEmptyBoard());
  const [isXNext, setIsXNext] = useState(onlineSession?.initialState?.isXNext ?? true);
  const [gameMode, setGameMode] = useState('pve');
  const [difficulty, setDifficulty] = useState(2); // level id, see LEVELS in aiEngine.js
  const [humanSymbol, setHumanSymbol] = useState(() => (Math.random() < 0.5 ? 'X' : 'O'));
  const [aiThinking, setAiThinking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
  const [timedOut, setTimedOut] = useState(false);
  const [winner, setWinner] = useState(onlineSession?.initialState?.winner || null);
  const [winningLine, setWinningLine] = useState(onlineSession?.initialState?.winningLine || []);
  const [showRules, setShowRules] = useState(false);
  const [lastMove, setLastMove] = useState(onlineSession?.initialState?.lastMove || null);
  const [onlineMeta, setOnlineMeta] = useState({
    playerRole: onlineSession?.playerRole,
    players: onlineSession?.players || [],
    roomCode: onlineSession?.roomCode,
  });
  const lastMoveKey = useRef('');
  const previousWinner = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    const worker = new Worker(new URL('./aiWorker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!isOnline) return;

    const applyRoomState = (payload) => {
      if (payload.gameId !== 'co-ca-ro') return;

      setOnlineMeta({
        playerRole: payload.playerRole,
        players: payload.players || [],
        roomCode: payload.roomCode,
      });
      setBoard(payload.state.board);
      setIsXNext(payload.state.isXNext);
      setWinner(payload.state.winner);
      setWinningLine(payload.state.winningLine || []);
      setLastMove(payload.state.lastMove || null);

      const moveKey = payload.state.lastMove ? `${payload.state.lastMove.row}-${payload.state.lastMove.col}` : '';
      if (moveKey && moveKey !== lastMoveKey.current) {
        playSound('place');
        lastMoveKey.current = moveKey;
      }

      if (!previousWinner.current && payload.state.winner && payload.state.winner !== 'Draw') {
        const mySymbol = payload.playerRole === 'P1' ? 'X' : 'O';
        playSound(payload.state.winner === mySymbol ? 'win' : 'lose');
        if (payload.state.winner === mySymbol) {
          confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
        }
      }
      previousWinner.current = payload.state.winner;
    };

    applyRoomState({
      gameId: onlineSession.gameId,
      roomCode: onlineSession.roomCode,
      playerRole: onlineSession.playerRole,
      players: onlineSession.players,
      state: onlineSession.initialState,
    });

    onlineSession.socket.on('roomState', applyRoomState);
    return () => {
      onlineSession.socket.off('roomState', applyRoomState);
    };
  }, [isOnline, onlineSession]);

  const aiSymbol = humanSymbol === 'X' ? 'O' : 'X';
  const currentSymbol = isXNext ? 'X' : 'O';

  useEffect(() => {
    if (!isOnline && gameMode === 'pve' && currentSymbol === aiSymbol && !winner) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isXNext, gameMode, winner, aiSymbol]);

  // 5-minute thinking clock per human turn, PvE only (the AI always answers in under
  // its own time budget, so it never needs to be timed).
  const isHumanTurnTimed = !isOnline && gameMode === 'pve' && !winner && currentSymbol === humanSymbol;

  useEffect(() => {
    if (!isHumanTurnTimed) return;
    setTimeLeft(TURN_TIME_LIMIT);
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isHumanTurnTimed]);

  useEffect(() => {
    if (isHumanTurnTimed && timeLeft === 0) {
      setTimedOut(true);
      setWinner(aiSymbol);
      playSound('lose');
    }
  }, [timeLeft, isHumanTurnTimed, aiSymbol]);

  const onlineCurrentRole = isXNext ? 'P1' : 'P2';
  const isWaitingOnline = isOnline && onlineMeta.players.length < 2;
  const isMyOnlineTurn = isOnline && onlineMeta.playerRole === onlineCurrentRole;

  // Friendly names for the two sides so each player card is unambiguous.
  const playerLabels = (() => {
    if (isOnline) {
      const iAmX = onlineMeta.playerRole === 'P1';
      return { x: iAmX ? 'Bạn' : 'Đối thủ', o: iAmX ? 'Đối thủ' : 'Bạn' };
    }
    if (gameMode === 'pve') {
      return humanSymbol === 'X' ? { x: 'Bạn', o: 'Máy' } : { x: 'Máy', o: 'Bạn' };
    }
    return { x: 'Người 1', o: 'Người 2' };
  })();
  const turnActive = !winner && !isWaitingOnline;

  const handleCellClick = (row, col) => {
    if (board[row][col] || winner) return;

    if (isOnline) {
      if (isWaitingOnline || !isMyOnlineTurn) return;
      onlineSession.socket.emit('makeMove', {
        roomCode: onlineMeta.roomCode,
        move: { row, col },
      }, (response) => {
        if (!response?.ok && response?.error) alert(response.error);
      });
      return;
    }

    if (gameMode === 'pve' && currentSymbol !== humanSymbol) return;
    placePiece(row, col);
  };

  const placePiece = (row, col) => {
    const symbol = isXNext ? 'X' : 'O';
    const newBoard = board.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? symbol : c))
    );

    setBoard(newBoard);
    setLastMove({ row, col });
    playSound('place');

    const winResult = checkWin(newBoard, row, col, symbol);
    if (winResult) {
      setWinner(symbol);
      setWinningLine(winResult);
      playSound(gameMode === 'pve' && symbol === aiSymbol ? 'lose' : 'win');
      if (!(gameMode === 'pve' && symbol === aiSymbol)) {
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
      }
    } else if (checkDraw(newBoard)) {
      setWinner('Draw');
    } else {
      setIsXNext(!isXNext);
    }
  };

  const checkDraw = (currentBoard) => currentBoard.every(row => row.every(cell => cell !== null));

  // AI moves run in a Web Worker (aiWorker.js) so the harder levels' minimax
  // search never blocks the UI thread, even when it takes the better part of
  // a second to think.
  const aiRequestRef = useRef(0);

  const makeAIMove = () => {
    const worker = workerRef.current;
    if (!worker) return;

    aiRequestRef.current += 1;
    const requestId = aiRequestRef.current;
    setAiThinking(true);

    const handleMessage = (event) => {
      if (event.data.requestId !== requestId) return;
      worker.removeEventListener('message', handleMessage);
      if (aiRequestRef.current !== requestId) return; // game was reset while thinking
      setAiThinking(false);
      if (event.data.move) placePiece(event.data.move.row, event.data.move.col);
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ board, level: difficulty, aiPlayer: aiSymbol, humanPlayer: humanSymbol, requestId });
  };

  const isCellInWinningLine = (r, c) => winningLine.some(cell => cell.row === r && cell.col === c);

  const resetGame = () => {
    playSound('click');
    if (isOnline) {
      onlineSession.socket.emit('resetRoom', { roomCode: onlineMeta.roomCode }, (response) => {
        if (!response?.ok && response?.error) alert(response.error);
      });
      return;
    }

    aiRequestRef.current += 1; // invalidate any AI move still being computed
    setAiThinking(false);
    setBoard(createEmptyBoard());
    setIsXNext(true);
    setWinner(null);
    setWinningLine([]);
    setLastMove(null);
    setHumanSymbol(Math.random() < 0.5 ? 'X' : 'O');
    setTimeLeft(TURN_TIME_LIMIT);
    setTimedOut(false);
  };

  const renderStatus = () => {
    if (isWaitingOnline) return <span style={{ color: 'var(--color-gold)' }}>Chờ người chơi thứ 2...</span>;
    if (winner === 'Draw') return <span style={{ color: 'var(--color-gold)' }}>Hòa nhau!</span>;
    if (!isOnline && gameMode === 'pve' && aiThinking) {
      return <span style={{ color: 'var(--color-text-secondary)' }}>Máy đang suy nghĩ...</span>;
    }
    if (winner) {
      let label;
      if (isOnline) {
        label = winner === (onlineMeta.playerRole === 'P1' ? 'X' : 'O') ? 'Bạn thắng!' : 'Đối thủ thắng!';
      } else if (timedOut) {
        label = `Hết giờ! Máy (${aiSymbol}) thắng!`;
      } else if (gameMode === 'pve') {
        label = winner === aiSymbol ? `Máy (${aiSymbol}) thắng!` : `Bạn (${humanSymbol}) thắng!`;
      } else {
        label = `Người chơi ${winner} thắng!`;
      }
      return <span className="text-gold-gradient" style={{ fontFamily: 'var(--font-serif)', fontSize: '14px' }}>{label}</span>;
    }

    return (
      <span style={{ color: 'var(--color-text-secondary)' }}>
        Lượt:{' '}
        <strong className={isXNext ? 'caro-piece x-piece' : 'caro-piece o-piece'} style={{ fontSize: '14px' }}>
          {isXNext ? 'X' : 'O'}
        </strong>
      </span>
    );
  };

  return (
    <div className="game-container">
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="game-title">Cờ Ca Rô</h1>
        <button onClick={() => setShowRules(true)} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      <div className="bau-cua-main-area" style={{ flex: 1, justifyContent: 'space-between' }}>
        <div className="widget-panel caro-status-panel">
          <div className="caro-control-row">
            {isOnline ? (
              <div className="online-game-badge">
                <Wifi size={13} /> Phòng {onlineMeta.roomCode} · {onlineMeta.playerRole === 'P1' ? 'Bạn là X' : 'Bạn là O'}
              </div>
            ) : (
              <div className="seg-switch">
                <button
                  onClick={() => { playSound('click'); setGameMode('pve'); resetGame(); }}
                  className={`seg-btn ${gameMode === 'pve' ? 'active' : ''}`}
                >
                  <Cpu size={12} /> Đấu Máy
                </button>
                <button
                  onClick={() => { playSound('click'); setGameMode('pvp'); resetGame(); }}
                  className={`seg-btn ${gameMode === 'pvp' ? 'active' : ''}`}
                >
                  <Users size={12} /> 2 Người
                </button>
              </div>
            )}
          </div>

          {!isOnline && gameMode === 'pve' && (
            <div className="difficulty-row">
              <span className="difficulty-label">Độ khó máy</span>
              <div className="seg-switch difficulty-switch">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => { playSound('click'); setDifficulty(lvl.id); resetGame(); }}
                    className={`seg-btn ${difficulty === lvl.id ? 'active' : ''}`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isHumanTurnTimed && (
            <div className={`caro-timer ${timeLeft <= 30 ? 'low' : ''}`}>
              <Timer size={14} /> Bạn còn: {formatTime(timeLeft)}
            </div>
          )}

          <div className="caro-players">
            <div className={`caro-player-card ${turnActive && isXNext ? 'active' : ''}`}>
              <span className="caro-player-mark x-piece">X</span>
              <span className="caro-player-name">{playerLabels.x}</span>
            </div>
            <span className="caro-vs">VS</span>
            <div className={`caro-player-card ${turnActive && !isXNext ? 'active' : ''}`}>
              <span className="caro-player-mark o-piece">O</span>
              <span className="caro-player-name">{playerLabels.o}</span>
            </div>
          </div>

          <div className={`caro-status-line ${winner ? 'is-over' : ''}`}>
            {renderStatus()}
          </div>
        </div>

        <div className="caro-grid-container">
          <div
            className={`caro-board ${turnActive ? (isXNext ? 'next-x' : 'next-o') : ''}`}
            style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
          >
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isLast = lastMove && lastMove.row === rIdx && lastMove.col === cIdx;
                const isWinning = isCellInWinningLine(rIdx, cIdx);

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    disabled={!!winner || (isOnline ? isWaitingOnline || !isMyOnlineTurn : (gameMode === 'pve' && currentSymbol !== humanSymbol))}
                    className={`caro-cell ${isWinning ? 'winning-cell' : ''}`}
                  >
                    {!cell && <span className="caro-cell-dot" />}
                    {!cell && <span className="caro-ghost" />}
                    {cell === 'X' && <span className="caro-piece x-piece">X</span>}
                    {cell === 'O' && <span className="caro-piece o-piece">O</span>}
                    {isLast && !isWinning && <span className="caro-last-move-border" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <button onClick={resetGame} className="btn-primary-action" style={{ maxWidth: '380px', margin: '0 auto' }}>
          <RotateCcw size={16} /> Chơi lại ván mới
        </button>
      </div>

      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Cờ Ca Rô</h3>
            <div className="modal-body">
              <p>1. Trò chơi diễn ra trên bàn cờ gỗ 15 x 15.</p>
              <p>2. Một người chơi cầm quân <strong>X</strong>, người kia cầm quân <strong>O</strong>.</p>
              <p>3. Người chơi thay phiên nhau đặt quân vào một ô trống.</p>
              <p>4. Tạo thành một hàng liên tiếp gồm 5 quân theo hàng dọc, hàng ngang hoặc đường chéo để thắng.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => { playSound('click'); setShowRules(false); }} className="btn-primary-action">
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
