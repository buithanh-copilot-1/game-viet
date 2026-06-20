import { useEffect, useRef, useState } from 'react';
import { playSound } from '../../utils/audio';
import { RotateCcw, HelpCircle, Users, Cpu, ArrowLeft, Wifi } from 'lucide-react';
import confetti from 'canvas-confetti';

const BOARD_SIZE = 12;
const createEmptyBoard = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

export default function CoCaRo({ onBack, onlineSession }) {
  const isOnline = Boolean(onlineSession);
  const [board, setBoard] = useState(() => onlineSession?.initialState?.board || createEmptyBoard());
  const [isXNext, setIsXNext] = useState(onlineSession?.initialState?.isXNext ?? true);
  const [gameMode, setGameMode] = useState('pve');
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
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

  useEffect(() => {
    if (!isOnline && gameMode === 'pve' && !isXNext && !winner) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isXNext, gameMode, winner]);

  const onlineCurrentRole = isXNext ? 'P1' : 'P2';
  const isWaitingOnline = isOnline && onlineMeta.players.length < 2;
  const isMyOnlineTurn = isOnline && onlineMeta.playerRole === onlineCurrentRole;

  // Friendly names for the two sides so each player card is unambiguous.
  const playerLabels = (() => {
    if (isOnline) {
      const iAmX = onlineMeta.playerRole === 'P1';
      return { x: iAmX ? 'Bạn' : 'Đối thủ', o: iAmX ? 'Đối thủ' : 'Bạn' };
    }
    if (gameMode === 'pve') return { x: 'Bạn', o: 'Máy' };
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

    if (gameMode === 'pve' && !isXNext) return;
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
      playSound(gameMode === 'pve' && symbol === 'O' ? 'lose' : 'win');
      if (!(gameMode === 'pve' && symbol === 'O')) {
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
      }
    } else if (checkDraw(newBoard)) {
      setWinner('Draw');
    } else {
      setIsXNext(!isXNext);
    }
  };

  const checkDraw = (currentBoard) => currentBoard.every(row => row.every(cell => cell !== null));

  const checkWin = (currentBoard, row, col, player) => {
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

      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        line.push({ row: r, col: c });
        r += dr;
        c += dc;
      }

      r = row - dr;
      c = col - dc;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        line.push({ row: r, col: c });
        r -= dr;
        c -= dc;
      }

      if (line.length >= 5) return line;
    }
    return null;
  };

  // Per-difficulty AI tuning. Higher defenseWeight = blocks the player harder;
  // blunderChance = probability the AI ignores its best move and plays a weaker
  // (but still on-board) one, which is what makes "Dễ" feel beatable.
  const AI_SETTINGS = {
    easy: { defenseWeight: 0.8, blunderChance: 0.5 },
    medium: { defenseWeight: 1.15, blunderChance: 0.0 },
    hard: { defenseWeight: 1.6, blunderChance: 0.0 },
  };

  const makeAIMove = () => {
    const settings = AI_SETTINGS[difficulty] || AI_SETTINGS.medium;
    const scored = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) {
          const attackScore = evaluateSpot(board, r, c, 'O');
          const defenseScore = evaluateSpot(board, r, c, 'X');
          scored.push({ row: r, col: c, score: attackScore + defenseScore * settings.defenseWeight });
        }
      }
    }

    if (scored.length === 0) return;
    scored.sort((a, b) => b.score - a.score);

    // On easy, sometimes pick a deliberately sub-optimal move from the middle of
    // the pack so the machine is fun to beat instead of unbeatable.
    let pool;
    if (settings.blunderChance > 0 && Math.random() < settings.blunderChance) {
      const weak = scored.slice(Math.min(3, scored.length - 1), Math.min(12, scored.length));
      pool = weak.length ? weak : scored;
    } else {
      const best = scored[0].score;
      pool = scored.filter((m) => m.score === best);
    }

    const move = pool[Math.floor(Math.random() * pool.length)];
    placePiece(move.row, move.col);
  };

  const evaluateSpot = (currentBoard, row, col, player) => {
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: -1 },
    ];
    let totalScore = 0;

    for (const { dr, dc } of directions) {
      let count = 0;
      let openEnds = 0;
      let r = row + dr;
      let c = col + dc;

      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      }
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === null) openEnds++;

      r = row - dr;
      c = col - dc;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        count++;
        r -= dr;
        c -= dc;
      }
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === null) openEnds++;

      if (count >= 4) totalScore += 10000;
      else if (count === 3) totalScore += openEnds === 2 ? 1200 : (openEnds === 1 ? 300 : 0);
      else if (count === 2) totalScore += openEnds === 2 ? 150 : (openEnds === 1 ? 30 : 0);
      else if (count === 1) totalScore += openEnds === 2 ? 10 : (openEnds === 1 ? 2 : 0);
    }

    return totalScore;
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

    setBoard(createEmptyBoard());
    setIsXNext(true);
    setWinner(null);
    setWinningLine([]);
    setLastMove(null);
  };

  const renderStatus = () => {
    if (isWaitingOnline) return <span style={{ color: 'var(--color-gold)' }}>Chờ người chơi thứ 2...</span>;
    if (winner === 'Draw') return <span style={{ color: 'var(--color-gold)' }}>Hòa nhau!</span>;
    if (winner) {
      const label = isOnline
        ? (winner === (onlineMeta.playerRole === 'P1' ? 'X' : 'O') ? 'Bạn thắng!' : 'Đối thủ thắng!')
        : `${winner === 'X' ? 'Người chơi X' : (gameMode === 'pve' ? 'Máy (O)' : 'Người chơi O')} thắng!`;
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
                {[
                  { id: 'easy', label: 'Dễ' },
                  { id: 'medium', label: 'Vừa' },
                  { id: 'hard', label: 'Khó' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { playSound('click'); setDifficulty(d.id); resetGame(); }}
                    className={`seg-btn ${difficulty === d.id ? 'active' : ''}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
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
                    disabled={!!winner || (isOnline ? isWaitingOnline || !isMyOnlineTurn : (gameMode === 'pve' && !isXNext))}
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
              <p>1. Trò chơi diễn ra trên bàn cờ gỗ 12 x 12.</p>
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
