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

  const makeAIMove = () => {
    let bestScore = -Infinity;
    let bestMoves = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) {
          const attackScore = evaluateSpot(board, r, c, 'O');
          const defenseScore = evaluateSpot(board, r, c, 'X');
          const totalScore = attackScore + defenseScore * 1.15;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMoves = [{ row: r, col: c }];
          } else if (totalScore === bestScore) {
            bestMoves.push({ row: r, col: c });
          }
        }
      }
    }

    if (bestMoves.length > 0) {
      const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      placePiece(move.row, move.col);
    }
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
        <div className="widget-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          {isOnline ? (
            <div className="online-game-badge">
              <Wifi size={13} /> Phòng {onlineMeta.roomCode} - {onlineMeta.playerRole === 'P1' ? 'Bạn là X' : 'Bạn là O'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', background: '#0a0505', padding: '4px', borderRadius: '8px', border: '1px solid rgba(207, 161, 43, 0.15)' }}>
              <button
                onClick={() => { playSound('click'); setGameMode('pve'); resetGame(); }}
                className="btn-secondary-action"
                style={{
                  background: gameMode === 'pve' ? 'rgba(207, 161, 43, 0.25)' : 'transparent',
                  borderColor: gameMode === 'pve' ? 'var(--color-gold)' : 'transparent',
                  color: gameMode === 'pve' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)'
                }}
              >
                <Cpu size={12} style={{ display: 'inline', marginRight: '4px', transform: 'translateY(-1px)' }} /> Đấu Máy
              </button>
              <button
                onClick={() => { playSound('click'); setGameMode('pvp'); resetGame(); }}
                className="btn-secondary-action"
                style={{
                  background: gameMode === 'pvp' ? 'rgba(207, 161, 43, 0.25)' : 'transparent',
                  borderColor: gameMode === 'pvp' ? 'var(--color-gold)' : 'transparent',
                  color: gameMode === 'pvp' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)'
                }}
              >
                <Users size={12} style={{ display: 'inline', marginRight: '4px', transform: 'translateY(-1px)' }} /> 2 Người
              </button>
            </div>
          )}

          <div style={{ fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>
            {renderStatus()}
          </div>
        </div>

        <div className="caro-grid-container">
          <div className="caro-board" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}>
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
