import React, { useState, useEffect } from 'react';
import { playSound } from '../../utils/audio';
import { RotateCcw, HelpCircle, Users, Cpu, ArrowLeft, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function OAnQuan({ onBack }) {
  // Board Indexing:
  // Bottom Row (P1): 0, 1, 2, 3, 4
  // Right Mandarin: 5
  // Top Row (P2): 6, 7, 8, 9, 10
  // Left Mandarin: 11
  const [board, setBoard] = useState([
    { id: 0, small: 5, big: 0, isMandarin: false },
    { id: 1, small: 5, big: 0, isMandarin: false },
    { id: 2, small: 5, big: 0, isMandarin: false },
    { id: 3, small: 5, big: 0, isMandarin: false },
    { id: 4, small: 5, big: 0, isMandarin: false },
    { id: 5, small: 0, big: 1, isMandarin: true }, // Right Mandarin (1 Big = 10 pts)
    { id: 6, small: 5, big: 0, isMandarin: false },
    { id: 7, small: 5, big: 0, isMandarin: false },
    { id: 8, small: 5, big: 0, isMandarin: false },
    { id: 9, small: 5, big: 0, isMandarin: false },
    { id: 10, small: 5, big: 0, isMandarin: false },
    { id: 11, small: 0, big: 1, isMandarin: true }, // Left Mandarin
  ]);

  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [isP1Turn, setIsP1Turn] = useState(true);
  const [gameMode, setGameMode] = useState('pve'); // 'pve' (Player vs AI) or 'pvp' (Player vs Player)
  const [winner, setWinner] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingHand, setAnimatingHand] = useState(null); // { index, count }
  const [showRules, setShowRules] = useState(false);

  // AI trigger
  useEffect(() => {
    if (gameMode === 'pve' && !isP1Turn && !winner && !isAnimating) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isP1Turn, gameMode, winner, isAnimating]);

  // Check if player has no seeds and needs refilling at the start of their turn
  useEffect(() => {
    if (winner || isAnimating) return;
    
    const p1Slots = [0, 1, 2, 3, 4];
    const p2Slots = [6, 7, 8, 9, 10];
    const activeSlots = isP1Turn ? p1Slots : p2Slots;
    const totalSeeds = activeSlots.reduce((sum, idx) => sum + board[idx].small, 0);

    if (totalSeeds === 0) {
      // Must refill 1 seed to each of the 5 slots
      const refillCost = 5;
      if (isP1Turn) {
        setP1Score(prev => prev - refillCost);
      } else {
        setP2Score(prev => prev - refillCost);
      }
      
      setBoard(prev => prev.map((slot, idx) => {
        if (activeSlots.includes(idx)) {
          return { ...slot, small: 1 };
        }
        return slot;
      }));

      playSound('score');
      alert(isP1Turn ? "Bạn hết quân! Phải rút 5 xu từ điểm tích lũy để rải đều 5 ô." : "Máy hết quân! Máy tự động rải đều 5 ô (-5 điểm).");
    }
  }, [isP1Turn, isAnimating]);

  const makeAIMove = () => {
    const aiSlots = [6, 7, 8, 9, 10].filter(idx => board[idx].small > 0);
    if (aiSlots.length === 0) return;

    // AI logic: Evaluate all moves and pick the one with maximum immediate capture points
    let bestMove = null;
    let maxCapture = -1;

    aiSlots.forEach(slot => {
      [1, -1].forEach(dir => {
        const captureCount = simulateMove(slot, dir);
        if (captureCount > maxCapture) {
          maxCapture = captureCount;
          bestMove = { slot, dir };
        }
      });
    });

    if (bestMove && maxCapture >= 0) {
      executeSowing(bestMove.slot, bestMove.dir);
    } else {
      const randomSlot = aiSlots[Math.floor(Math.random() * aiSlots.length)];
      const randomDir = Math.random() > 0.5 ? 1 : -1;
      executeSowing(randomSlot, randomDir);
    }
  };

  const simulateMove = (startSlot, dir) => {
    let tempBoard = board.map(s => ({ ...s }));
    let seeds = tempBoard[startSlot].small;
    if (seeds === 0) return 0;
    
    tempBoard[startSlot].small = 0;
    let curr = startSlot;
    let captured = 0;

    while (seeds > 0) {
      curr = (curr + dir + 12) % 12;
      tempBoard[curr].small += 1;
      seeds--;

      if (seeds === 0) {
        let next = (curr + dir + 12) % 12;
        if (tempBoard[next].small > 0 && !tempBoard[next].isMandarin) {
          seeds = tempBoard[next].small;
          tempBoard[next].small = 0;
        } else if (tempBoard[next].isMandarin) {
          break;
        } else {
          let target = (next + dir + 12) % 12;
          while (tempBoard[next].small === 0 && (tempBoard[target].small > 0 || tempBoard[target].big > 0)) {
            captured += tempBoard[target].small + tempBoard[target].big * 10;
            tempBoard[target].small = 0;
            tempBoard[target].big = 0;
            
            next = (target + dir + 12) % 12;
            target = (next + dir + 12) % 12;
          }
          break;
        }
      }
    }
    return captured;
  };

  const handleSelectSlot = (idx) => {
    if (isAnimating || winner) return;
    
    if (isP1Turn && (idx < 0 || idx > 4)) return;
    if (!isP1Turn && (idx < 6 || idx > 10)) return;
    if (board[idx].small === 0) return;

    playSound('click');
    if (selectedSlot === idx) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot(idx);
    }
  };

  const executeSowing = async (startIdx, direction) => {
    setSelectedSlot(null);
    setIsAnimating(true);

    let currentBoard = board.map(s => ({ ...s }));
    let handCount = currentBoard[startIdx].small;
    currentBoard[startIdx].small = 0;
    
    setBoard(currentBoard);
    setAnimatingHand({ index: startIdx, count: handCount });
    playSound('click');
    await sleep(350);

    let currIdx = startIdx;
    
    while (handCount > 0) {
      currIdx = (currIdx + direction + 12) % 12;
      
      currentBoard[currIdx].small += 1;
      handCount -= 1;
      
      setBoard([...currentBoard]);
      setAnimatingHand({ index: currIdx, count: handCount });
      playSound('place');
      await sleep(250);

      if (handCount === 0) {
        let nextIdx = (currIdx + direction + 12) % 12;
        
        if (currentBoard[nextIdx].small > 0 && !currentBoard[nextIdx].isMandarin) {
          await sleep(400);
          handCount = currentBoard[nextIdx].small;
          currentBoard[nextIdx].small = 0;
          
          setBoard([...currentBoard]);
          setAnimatingHand({ index: nextIdx, count: handCount });
          playSound('click');
          currIdx = nextIdx;
          await sleep(350);
        } 
        else if (currentBoard[nextIdx].isMandarin) {
          await sleep(400);
          break;
        } 
        else {
          let targetIdx = (nextIdx + direction + 12) % 12;
          
          while (currentBoard[nextIdx].small === 0 && (currentBoard[targetIdx].small > 0 || currentBoard[targetIdx].big > 0)) {
            await sleep(450);
            
            const pointsCaptured = currentBoard[targetIdx].small + currentBoard[targetIdx].big * 10;
            if (isP1Turn) {
              setP1Score(prev => prev + pointsCaptured);
            } else {
              setP2Score(prev => prev + pointsCaptured);
            }
            
            currentBoard[targetIdx].small = 0;
            currentBoard[targetIdx].big = 0;
            setBoard([...currentBoard]);
            playSound('win');

            nextIdx = (targetIdx + direction + 12) % 12;
            targetIdx = (nextIdx + direction + 12) % 12;
          }
          break;
        }
      }
    }

    setAnimatingHand(null);
    setIsAnimating(false);
    
    const isGameOver = currentBoard[5].small === 0 && currentBoard[5].big === 0 &&
                       currentBoard[11].small === 0 && currentBoard[11].big === 0;

    if (isGameOver) {
      let finalP1Score = p1Score;
      let finalP2Score = p2Score;
      
      const updatedBoard = currentBoard.map((slot, idx) => {
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

      setBoard(updatedBoard);
      setP1Score(finalP1Score);
      setP2Score(finalP2Score);

      if (finalP1Score > finalP2Score) {
        setWinner('P1');
        playSound('win');
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.8 } });
      } else if (finalP2Score > finalP1Score) {
        setWinner('P2');
        playSound('lose');
      } else {
        setWinner('Draw');
      }
    } else {
      setIsP1Turn(!isP1Turn);
    }
  };

  const handleReset = () => {
    playSound('click');
    setBoard([
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
    ]);
    setP1Score(0);
    setP2Score(0);
    setIsP1Turn(true);
    setWinner(null);
    setSelectedSlot(null);
    setIsAnimating(false);
    setAnimatingHand(null);
  };

  // Helper to render seeds visually inside a slot with 3D spiral distribution
  const renderSeeds = (smallCount, bigCount, isMandarin = false) => {
    const stones = [];
    
    // Render big stones (Quan)
    for (let i = 0; i < bigCount; i++) {
      // Scatter big stones horizontally in Mandarin slot, or in center for peasant
      const offset = isMandarin 
        ? { x: (i - (bigCount - 1) / 2) * 16, y: 0 } 
        : { x: 0, y: 0 };
      stones.push(
        <div 
          key={`big-${i}`} 
          className="big-stone" 
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px)` 
          }} 
        />
      );
    }
    
    // Render small stones (Dân)
    for (let i = 0; i < smallCount; i++) {
      // Golden spiral distribution pattern
      const angle = (i * 0.95) * Math.PI; 
      const radius = Math.min(10 + Math.floor(i / 5) * 4, isMandarin ? 28 : 16);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      stones.push(
        <div 
          key={`small-${i}`} 
          className="small-stone" 
          style={{ 
            transform: `translate(${x}px, ${y}px)` 
          }} 
        />
      );
    }
    
    return (
      <div className="stone-container">
        {stones}
      </div>
    );
  };

  return (
    <div className="game-container">
      {/* Header */}
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="game-title">Ô Ăn Quan</h1>
        <button onClick={() => setShowRules(true)} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Main Container */}
      <div className="bau-cua-main-area" style={{ flex: 1, justifyContent: 'space-between' }}>
        
        {/* Game Mode and Scores */}
        <div className="widget-panel dashboard-grid">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Mode Select */}
            <div style={{ display: 'flex', gap: '4px', background: '#0a0505', padding: '3px', borderRadius: '8px', border: '1px solid rgba(207, 161, 43, 0.15)' }}>
              <button
                onClick={() => { playSound('click'); setGameMode('pve'); handleReset(); }}
                className="btn-secondary-action"
                style={{
                  background: gameMode === 'pve' ? 'rgba(207, 161, 43, 0.25)' : 'transparent',
                  borderColor: gameMode === 'pve' ? 'var(--color-gold)' : 'transparent',
                  color: gameMode === 'pve' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                  fontSize: '9px',
                  padding: '4px 8px'
                }}
              >
                <Cpu size={10} style={{ display: 'inline', marginRight: '3px', transform: 'translateY(-1px)' }} /> Đấu Máy
              </button>
              <button
                onClick={() => { playSound('click'); setGameMode('pvp'); handleReset(); }}
                className="btn-secondary-action"
                style={{
                  background: gameMode === 'pvp' ? 'rgba(207, 161, 43, 0.25)' : 'transparent',
                  borderColor: gameMode === 'pvp' ? 'var(--color-gold)' : 'transparent',
                  color: gameMode === 'pvp' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                  fontSize: '9px',
                  padding: '4px 8px'
                }}
              >
                <Users size={10} style={{ display: 'inline', marginRight: '3px', transform: 'translateY(-1px)' }} /> 2 Người
              </button>
            </div>

            {/* Turn status */}
            <div style={{ fontSize: '11px', fontWeight: '600' }}>
              {winner ? (
                <span className="text-gold-gradient" style={{ fontFamily: 'var(--font-serif)', fontSize: '12px' }}>
                  {winner === 'Draw' ? 'Trận đấu hòa!' : (winner === 'P1' ? 'Bạn thắng!' : 'Máy thắng!')}
                </span>
              ) : (
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Lượt:{' '}
                  <strong style={{ color: 'var(--color-gold-bright)' }}>
                    {isP1Turn ? 'Bạn (Dưới)' : (gameMode === 'pve' ? 'Máy (Trên)' : 'P2 (Trên)')}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Scores board */}
          <div className="vs-scoreboard">
            <div className={`vs-score-card ${!isP1Turn ? 'active' : ''}`}>
              <div className="score-card-label">ĐIỂM TRÊN</div>
              <div className="score-card-value">{p2Score}</div>
            </div>
            <div className={`vs-score-card ${isP1Turn ? 'active' : ''}`}>
              <div className="score-card-label">ĐIỂM DƯỚI</div>
              <div className="score-card-value">{p1Score}</div>
            </div>
          </div>
        </div>

        {/* Hand visualizer during sowing */}
        <div style={{ height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {animatingHand && (
            <span className="win-loss-text-overlay" style={{ position: 'static', animationName: 'bounce-subtle', fontSize: '11px' }}>
              👉 Đang rải: {animatingHand.count} sỏi
            </span>
          )}
        </div>

        {/* Bàn Cờ Ô Ăn Quan Layout */}
        <div className="o-an-quan-board-wrapper">
          <div className="o-an-quan-wooden-board">
            {/* Wooden Texture overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#3d201a_15%,transparent_15%)] bg-[length:16px_16px] opacity-10 pointer-events-none rounded-xl" />

            {/* Left Mandarin: Slot 11 */}
            <div className={`o-an-quan-mandarin-slot mandarin-left ${selectedSlot === 11 ? 'selected' : ''}`}>
              <div className="mandarin-label">QUAN</div>
              {renderSeeds(board[11].small, board[11].big, true)}
              <div className="mandarin-count">
                {board[11].small + board[11].big * 10}
              </div>
            </div>

            {/* Center Grid (10 peasant slots) */}
            <div className="o-an-quan-center-grid">
              
              {/* Row Top (P2 slots, left to right ordered visually: 10, 9, 8, 7, 6) */}
              <div className="peasant-row peasant-row-top">
                {[10, 9, 8, 7, 6].map(idx => {
                  const isSelected = selectedSlot === idx;
                  const canSelect = !isAnimating && !winner && !isP1Turn && board[idx].small > 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => canSelect && handleSelectSlot(idx)}
                      disabled={isAnimating || winner}
                      className={`peasant-cell ${canSelect ? 'selectable' : ''} ${isSelected ? 'selected' : ''}`}
                    >
                      {renderSeeds(board[idx].small, 0)}
                      <div className="peasant-count">
                        {board[idx].small}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Row Bottom (P1 slots, left to right: 0, 1, 2, 3, 4) */}
              <div className="peasant-row">
                {[0, 1, 2, 3, 4].map(idx => {
                  const isSelected = selectedSlot === idx;
                  const canSelect = !isAnimating && !winner && isP1Turn && board[idx].small > 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => canSelect && handleSelectSlot(idx)}
                      disabled={isAnimating || winner || (gameMode === 'pve' && !isP1Turn)}
                      className={`peasant-cell ${canSelect ? 'selectable' : ''} ${isSelected ? 'selected' : ''}`}
                    >
                      {renderSeeds(board[idx].small, 0)}
                      <div className="peasant-count">
                        {board[idx].small}
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Right Mandarin: Slot 5 */}
            <div className={`o-an-quan-mandarin-slot mandarin-right ${selectedSlot === 5 ? 'selected' : ''}`}>
              <div className="mandarin-label">QUAN</div>
              {renderSeeds(board[5].small, board[5].big, true)}
              <div className="mandarin-count">
                {board[5].small + board[5].big * 10}
              </div>
            </div>

            {/* Selection overlay for Direction */}
            {selectedSlot !== null && (
              <div className="direction-picker-overlay">
                <button
                  onClick={() => executeSowing(selectedSlot, -1)}
                  className="direction-btn"
                >
                  <ArrowLeftCircle size={44} />
                  <span className="direction-btn-label">Ngược chiều kim</span>
                </button>
                <div className="direction-picker-title-box">
                  <div className="direction-picker-label">Đang chọn</div>
                  <div className="direction-picker-val">Ô số {selectedSlot + 1}</div>
                  <button 
                    onClick={() => setSelectedSlot(null)}
                    className="btn-cancel-selection"
                  >
                    Hủy
                  </button>
                </div>
                <button
                  onClick={() => executeSowing(selectedSlot, 1)}
                  className="direction-btn"
                >
                  <ArrowRightCircle size={44} />
                  <span className="direction-btn-label">Thuận chiều kim</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <button
          onClick={handleReset}
          className="btn-primary-action"
          style={{ maxWidth: '440px', margin: '0 auto' }}
        >
          <RotateCcw size={16} /> Bắt đầu ván mới
        </button>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Ô Ăn Quan</h3>
            <div className="modal-body">
              <p>1. <strong>Bàn cờ:</strong> Gồm 10 ô dân (5 ô mỗi hàng) và 2 ô quan bán nguyệt hai đầu. Ô dân chứa 5 sỏi nhỏ, ô quan chứa 1 sỏi lớn (trị giá 10 điểm).</p>
              <p>2. <strong>Lượt đi:</strong> Lấy toàn bộ sỏi ở một ô dân của mình rải lần lượt vào các ô bên cạnh theo chiều chọn trước.</p>
              <p>3. <strong>Rải tiếp:</strong> Nếu ô cuối cùng rải xong:
                <br />- Gặp ô dân có sỏi &rarr; bốc lên rải tiếp.
                <br />- Gặp ô quan hoặc ô trống &rarr; dừng đi.
              </p>
              <p>4. <strong>Ăn quân (Capture):</strong> Nếu dừng đi do gặp ô trống, và ô tiếp theo sau ô trống đó có sỏi &rarr; bạn được ăn toàn bộ sỏi ô đó. Có thể ăn dồn liên tiếp dạng: trống - đầy - trống - đầy.</p>
              <p>5. <strong>Hao Dân:</strong> Nếu đến lượt mà 5 ô dân trống trơn, phải dùng 5 điểm tích lũy của mình để rải lại vào 5 ô đó trước khi đi.</p>
              <p>6. <strong>Kết thúc:</strong> Khi cả 2 ô quan trống sỏi. Sỏi ở hàng nào thuộc về người chơi bên đó. Tính tổng điểm phân định thắng thua.</p>
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
