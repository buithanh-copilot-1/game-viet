import React, { useState, useEffect } from 'react';
import { playSound } from '../../utils/audio';
import { RotateCcw, HelpCircle, Users, Cpu, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

const BOARD_SIZE = 12; // 12x12 is perfect for mobile screens

export default function CoCaRo({ onBack }) {
  const [board, setBoard] = useState(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
  const [isXNext, setIsXNext] = useState(true);
  const [gameMode, setGameMode] = useState('pve'); // 'pve' (Player vs AI) or 'pvp' (Player vs Player)
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [lastMove, setLastMove] = useState(null); // Keep track of the last placed piece coordinate {row, col}

  // Effect to trigger AI move if gameMode is PvE and it's O's turn
  useEffect(() => {
    if (gameMode === 'pve' && !isXNext && !winner) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isXNext, gameMode, winner]);

  const handleCellClick = (row, col) => {
    if (board[row][col] || winner) return;
    if (gameMode === 'pve' && !isXNext) return; // Ignore clicks during computer turn

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
        confetti({
          particleCount: 50,
          spread: 40,
          origin: { y: 0.8 }
        });
      }
    } else if (checkDraw(newBoard)) {
      setWinner('Draw');
    } else {
      setIsXNext(!isXNext);
    }
  };

  const checkDraw = (currentBoard) => {
    return currentBoard.every(row => row.every(cell => cell !== null));
  };

  // Check 5 in a row in all directions from the current placed piece
  const checkWin = (currentBoard, row, col, player) => {
    const directions = [
      { dr: 0, dc: 1 },  // Horizontal
      { dr: 1, dc: 0 },  // Vertical
      { dr: 1, dc: 1 },  // Main Diagonal
      { dr: 1, dc: -1 }  // Anti-Diagonal
    ];

    for (let i = 0; i < directions.length; i++) {
      const { dr, dc } = directions[i];
      let line = [{ row, col }];

      // Count positive direction
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        line.push({ row: r, col: c });
        r += dr;
        c += dc;
      }

      // Count negative direction
      r = row - dr;
      c = col - dc;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        line.push({ row: r, col: c });
        r -= dr;
        c -= dc;
      }

      if (line.length >= 5) {
        return line;
      }
    }
    return null;
  };

  // Heuristic Evaluation AI
  const makeAIMove = () => {
    let bestScore = -Infinity;
    let bestMoves = [];

    // Analyze every cell on the board
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === null) {
          // Evaluate score for AI (O) and Player (X)
          const attackScore = evaluateSpot(board, r, c, 'O');
          const defenseScore = evaluateSpot(board, r, c, 'X');
          
          // Combine scores (Offense vs Defense weighting)
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
      // Pick a random move among the equal best choices
      const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      placePiece(move.row, move.col);
    }
  };

  // Heuristic evaluation for a specific empty spot
  const evaluateSpot = (currentBoard, row, col, player) => {
    const opponent = player === 'X' ? 'O' : 'X';
    const directions = [
      { dr: 0, dc: 1 },  // Horizontal
      { dr: 1, dc: 0 },  // Vertical
      { dr: 1, dc: 1 },  // Main Diagonal
      { dr: 1, dc: -1 }  // Anti-Diagonal
    ];

    let totalScore = 0;

    for (let i = 0; i < directions.length; i++) {
      const { dr, dc } = directions[i];
      let count = 0;
      let openEnds = 0;

      // Positive check
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        count++;
        r += dr;
        c += dc;
      }
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === null) {
        openEnds++;
      }

      // Negative check
      r = row - dr;
      c = col - dc;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
        count++;
        r -= dr;
        c -= dc;
      }
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === null) {
        openEnds++;
      }

      // Assign scores based on consecutive pieces and blocking status
      if (count >= 4) {
        totalScore += 10000;
      } else if (count === 3) {
        if (openEnds === 2) totalScore += 1200;
        else if (openEnds === 1) totalScore += 300;
      } else if (count === 2) {
        if (openEnds === 2) totalScore += 150;
        else if (openEnds === 1) totalScore += 30;
      } else if (count === 1) {
        if (openEnds === 2) totalScore += 10;
        else if (openEnds === 1) totalScore += 2;
      }
    }

    return totalScore;
  };

  const isCellInWinningLine = (r, c) => {
    return winningLine.some(cell => cell.row === r && cell.col === c);
  };

  const resetGame = () => {
    playSound('click');
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setIsXNext(true);
    setWinner(null);
    setWinningLine([]);
    setLastMove(null);
  };

  return (
    <div className="game-container">
      {/* Header */}
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="game-title">Cờ Ca Rô</h1>
        <button onClick={() => setShowRules(true)} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Main Panel */}
      <div className="bau-cua-main-area" style={{ flex: 1, justifyContent: 'space-between' }}>
        
        {/* Game Settings & Turn Display */}
        <div className="widget-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Game Mode Selection */}
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

          {/* Turn status */}
          <div style={{ fontSize: '13px', fontWeight: '600' }}>
            {winner ? (
              winner === 'Draw' ? (
                <span style={{ color: 'var(--color-gold)' }}>Hòa nhau!</span>
              ) : (
                <span className="text-gold-gradient" style={{ fontFamily: 'var(--font-serif)', fontSize: '14px' }}>
                  {winner === 'X' ? 'Người chơi X' : (gameMode === 'pve' ? 'Máy (O)' : 'Người chơi O')} Thắng!
                </span>
              )
            ) : (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                Lượt:{' '}
                <strong className={isXNext ? 'caro-piece x-piece' : 'caro-piece o-piece'} style={{ fontSize: '14px' }}>
                  {isXNext ? 'X' : 'O'}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Board container */}
        <div className="caro-grid-container">
          <div 
            className="caro-board"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
            }}
          >
            {/* Traditional diagonal line motif on background board */}
            <div className="absolute inset-0 bg-[radial-gradient(#3d201a_10%,transparent_10%)] bg-[length:12px_12px] opacity-10 pointer-events-none rounded-xl" />

            {board.map((row, rIdx) => 
              row.map((cell, cIdx) => {
                const isLast = lastMove && lastMove.row === rIdx && lastMove.col === cIdx;
                const isWinning = isCellInWinningLine(rIdx, cIdx);

                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => handleCellClick(rIdx, cIdx)}
                    disabled={!!winner || (gameMode === 'pve' && !isXNext)}
                    className={`caro-cell ${isWinning ? 'winning-cell' : ''}`}
                  >
                    {/* Tiny target marker for visual guidance on touch devices */}
                    {!cell && (
                      <span className="caro-cell-dot" />
                    )}

                    {/* Cell Pieces (X / O) */}
                    {cell === 'X' && (
                      <span className={`caro-piece x-piece`}>
                        X
                      </span>
                    )}
                    {cell === 'O' && (
                      <span className={`caro-piece o-piece`}>
                        O
                      </span>
                    )}

                    {/* Last Move Glowing Highlight */}
                    {isLast && !isWinning && (
                      <span className="caro-last-move-border" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={resetGame}
          className="btn-primary-action"
          style={{ maxWidth: '380px', margin: '0 auto' }}
        >
          <RotateCcw size={16} /> Chơi lại ván mới
        </button>
      </div>

      {/* Rules modal */}
      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Cờ Ca Rô</h3>
            <div className="modal-body">
              <p>1. Trò chơi diễn ra trên bàn cờ gỗ $12 \times 12$.</p>
              <p>2. Một người chơi cầm quân <strong>X (màu đỏ)</strong>, người kia (hoặc máy) cầm quân <strong>O (màu xanh)</strong>.</p>
              <p>3. Người chơi thay phiên nhau đặt quân vào một ô trống.</p>
              <p>4. <strong>Mục tiêu:</strong> Tạo thành một hàng liên tiếp gồm 5 quân của mình theo hàng dọc, hàng ngang hoặc đường chéo.</p>
              <p>5. Người đầu tiên đạt được 5 quân liên tiếp sẽ giành chiến thắng.</p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => { playSound('click'); setShowRules(false); }}
                className="btn-primary-action"
              >
                Đồng Ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
