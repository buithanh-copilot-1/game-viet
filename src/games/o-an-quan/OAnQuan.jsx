import { useEffect, useRef, useState } from 'react';
import { playSound } from '../../utils/audio';
import { RotateCcw, HelpCircle, Users, Cpu, ArrowLeft, ArrowLeftCircle, ArrowRightCircle, Wifi } from 'lucide-react';
import confetti from 'canvas-confetti';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createInitialBoard = () => [
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

export default function OAnQuan({ onBack, onlineSession }) {
  const isOnline = Boolean(onlineSession);
  const [board, setBoard] = useState(() => onlineSession?.initialState?.board || createInitialBoard());
  const [p1Score, setP1Score] = useState(onlineSession?.initialState?.p1Score || 0);
  const [p2Score, setP2Score] = useState(onlineSession?.initialState?.p2Score || 0);
  const [isP1Turn, setIsP1Turn] = useState(onlineSession?.initialState?.isP1Turn ?? true);
  const [gameMode, setGameMode] = useState('pve');
  const [winner, setWinner] = useState(onlineSession?.initialState?.winner || null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingHand, setAnimatingHand] = useState(null);
  const [showRules, setShowRules] = useState(false);
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
      if (payload.gameId !== 'o-an-quan') return;

      setOnlineMeta({
        playerRole: payload.playerRole,
        players: payload.players || [],
        roomCode: payload.roomCode,
      });
      setBoard(payload.state.board);
      setP1Score(payload.state.p1Score);
      setP2Score(payload.state.p2Score);
      setIsP1Turn(payload.state.isP1Turn);
      setWinner(payload.state.winner);
      setSelectedSlot(null);
      setIsAnimating(false);
      setAnimatingHand(null);

      const moveKey = payload.state.lastMove
        ? `${payload.state.lastMove.slot}-${payload.state.lastMove.direction}-${payload.state.p1Score}-${payload.state.p2Score}`
        : '';
      if (moveKey && moveKey !== lastMoveKey.current) {
        playSound('place');
        lastMoveKey.current = moveKey;
      }

      if (!previousWinner.current && payload.state.winner && payload.state.winner !== 'Draw') {
        playSound(payload.state.winner === payload.playerRole ? 'win' : 'lose');
        if (payload.state.winner === payload.playerRole) {
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.8 } });
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
    if (!isOnline && gameMode === 'pve' && !isP1Turn && !winner && !isAnimating) {
      const timer = setTimeout(() => {
        makeAIMove();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isP1Turn, gameMode, winner, isAnimating]);

  useEffect(() => {
    if (isOnline || winner || isAnimating) return;

    const p1Slots = [0, 1, 2, 3, 4];
    const p2Slots = [6, 7, 8, 9, 10];
    const activeSlots = isP1Turn ? p1Slots : p2Slots;
    const totalSeeds = activeSlots.reduce((sum, idx) => sum + board[idx].small, 0);

    if (totalSeeds === 0) {
      const refillCost = 5;
      if (isP1Turn) setP1Score(prev => prev - refillCost);
      else setP2Score(prev => prev - refillCost);

      setBoard(prev => prev.map((slot, idx) => (
        activeSlots.includes(idx) ? { ...slot, small: 1 } : slot
      )));

      playSound('score');
      alert(isP1Turn
        ? 'Bạn hết quân! Phải rút 5 điểm để rải đều 5 ô.'
        : 'Máy hoặc P2 hết quân! Tự động rải đều 5 ô (-5 điểm).');
    }
  }, [isOnline, isP1Turn, isAnimating, winner, board]);

  const onlineCurrentRole = isP1Turn ? 'P1' : 'P2';
  const isWaitingOnline = isOnline && onlineMeta.players.length < 2;
  const isMyOnlineTurn = isOnline && onlineMeta.playerRole === onlineCurrentRole;

  // Friendly labels so each side of the board is unambiguous.
  const sideLabels = (() => {
    if (isOnline) {
      const iAmTop = onlineMeta.playerRole === 'P2';
      return { top: iAmTop ? 'Bạn' : 'Đối thủ', bottom: iAmTop ? 'Đối thủ' : 'Bạn' };
    }
    if (gameMode === 'pve') return { top: 'Máy', bottom: 'Bạn' };
    return { top: 'Người 2', bottom: 'Người 1' };
  })();
  const selectedSeeds = selectedSlot !== null ? board[selectedSlot].small : 0;

  const makeAIMove = () => {
    const aiSlots = [6, 7, 8, 9, 10].filter(idx => board[idx].small > 0);
    if (aiSlots.length === 0) return;

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
    const tempBoard = board.map(s => ({ ...s }));
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

  const canInteractWithSlot = (idx) => {
    if (isAnimating || winner) return false;
    if (isOnline && (isWaitingOnline || !isMyOnlineTurn)) return false;
    if (isP1Turn && (idx < 0 || idx > 4)) return false;
    if (!isP1Turn && (idx < 6 || idx > 10)) return false;
    if (!isOnline && gameMode === 'pve' && !isP1Turn) return false;
    return board[idx].small > 0;
  };

  const handleSelectSlot = (idx) => {
    if (!canInteractWithSlot(idx)) return;

    playSound('click');
    setSelectedSlot(selectedSlot === idx ? null : idx);
  };

  const handleDirectionChoice = (direction) => {
    if (selectedSlot === null) return;

    if (isOnline) {
      const slot = selectedSlot;
      setSelectedSlot(null);
      onlineSession.socket.emit('makeMove', {
        roomCode: onlineMeta.roomCode,
        move: { slot, direction },
      }, (response) => {
        if (!response?.ok && response?.error) alert(response.error);
      });
      return;
    }

    executeSowing(selectedSlot, direction);
  };

  const executeSowing = async (startIdx, direction) => {
    setSelectedSlot(null);
    setIsAnimating(true);

    const currentBoard = board.map(s => ({ ...s }));
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
        } else if (currentBoard[nextIdx].isMandarin) {
          await sleep(400);
          break;
        } else {
          let targetIdx = (nextIdx + direction + 12) % 12;

          while (currentBoard[nextIdx].small === 0 && (currentBoard[targetIdx].small > 0 || currentBoard[targetIdx].big > 0)) {
            await sleep(450);
            const pointsCaptured = currentBoard[targetIdx].small + currentBoard[targetIdx].big * 10;
            if (isP1Turn) setP1Score(prev => prev + pointsCaptured);
            else setP2Score(prev => prev + pointsCaptured);

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

    const isGameOver = currentBoard[5].small === 0 && currentBoard[5].big === 0
      && currentBoard[11].small === 0 && currentBoard[11].big === 0;

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
    if (isOnline) {
      onlineSession.socket.emit('resetRoom', { roomCode: onlineMeta.roomCode }, (response) => {
        if (!response?.ok && response?.error) alert(response.error);
      });
      return;
    }

    setBoard(createInitialBoard());
    setP1Score(0);
    setP2Score(0);
    setIsP1Turn(true);
    setWinner(null);
    setSelectedSlot(null);
    setIsAnimating(false);
    setAnimatingHand(null);
  };

  const renderSeeds = (smallCount, bigCount, isMandarin = false) => {
    const stones = [];

    for (let i = 0; i < bigCount; i++) {
      const offset = isMandarin ? { x: (i - (bigCount - 1) / 2) * 16, y: 0 } : { x: 0, y: 0 };
      stones.push(
        <div
          key={`big-${i}`}
          className="big-stone"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        />
      );
    }

    for (let i = 0; i < smallCount; i++) {
      const angle = (i * 0.95) * Math.PI;
      const radius = Math.min(10 + Math.floor(i / 5) * 4, isMandarin ? 28 : 16);
      stones.push(
        <div
          key={`small-${i}`}
          className="small-stone"
          style={{ transform: `translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)` }}
        />
      );
    }

    return <div className="stone-container">{stones}</div>;
  };

  const renderWinnerStatus = () => {
    if (isWaitingOnline) return 'Chờ người chơi thứ 2...';
    if (winner === 'Draw') return 'Trận đấu hòa!';
    if (winner) {
      if (isOnline) return winner === onlineMeta.playerRole ? 'Bạn thắng!' : 'Đối thủ thắng!';
      return winner === 'P1' ? 'Bạn thắng!' : (gameMode === 'pve' ? 'Máy thắng!' : 'P2 thắng!');
    }
    if (isOnline) {
      if (isMyOnlineTurn) return 'Lượt của bạn';
      return isP1Turn ? 'Lượt P1 (Dưới)' : 'Lượt P2 (Trên)';
    }
    return isP1Turn ? 'Bạn (Dưới)' : (gameMode === 'pve' ? 'Máy (Trên)' : 'P2 (Trên)');
  };

  return (
    <div className="game-container">
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="game-title">Ô Ăn Quan</h1>
        <button onClick={() => setShowRules(true)} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      <div className="bau-cua-main-area" style={{ flex: 1, justifyContent: 'space-between' }}>
        <div className="widget-panel oaq-status-panel">
          <div className="oaq-control-row">
            {isOnline ? (
              <div className="online-game-badge">
                <Wifi size={13} /> Phòng {onlineMeta.roomCode} · {onlineMeta.playerRole === 'P1' ? 'Bạn ở dưới' : 'Bạn ở trên'}
              </div>
            ) : (
              <div className="oaq-mode-switch">
                <button
                  onClick={() => { playSound('click'); setGameMode('pve'); handleReset(); }}
                  className={`oaq-mode-btn ${gameMode === 'pve' ? 'active' : ''}`}
                >
                  <Cpu size={12} /> Đấu Máy
                </button>
                <button
                  onClick={() => { playSound('click'); setGameMode('pvp'); handleReset(); }}
                  className={`oaq-mode-btn ${gameMode === 'pvp' ? 'active' : ''}`}
                >
                  <Users size={12} /> 2 Người
                </button>
              </div>
            )}
          </div>

          <div className={`oaq-turn-banner ${winner ? 'is-over' : (!isWaitingOnline && isP1Turn ? 'turn-bottom' : 'turn-top')}`}>
            <span className="oaq-turn-dot" />
            <span className="oaq-turn-text">{renderWinnerStatus()}</span>
          </div>

          <div className="vs-scoreboard">
            <div className={`vs-score-card ${!isP1Turn && !winner ? 'active' : ''}`}>
              <div className="score-card-label">{sideLabels.top} · Hàng trên</div>
              <div className="score-card-value">{p2Score}</div>
            </div>
            <div className={`vs-score-card ${isP1Turn && !winner ? 'active' : ''}`}>
              <div className="score-card-label">{sideLabels.bottom} · Hàng dưới</div>
              <div className="score-card-value">{p1Score}</div>
            </div>
          </div>
        </div>

        <div className="oaq-hint-bar">
          {animatingHand ? (
            <span className="oaq-hint oaq-hint-sowing">
              Đang rải {animatingHand.count} sỏi…
            </span>
          ) : isWaitingOnline ? (
            <span className="oaq-hint">Đang chờ người chơi thứ 2 vào phòng…</span>
          ) : winner ? (
            <span className="oaq-hint">Ván đã kết thúc — bấm “Ván mới” để chơi lại.</span>
          ) : selectedSlot !== null ? (
            <span className="oaq-hint oaq-hint-active">Chọn hướng rải sỏi bên dưới ▾</span>
          ) : (isOnline && !isMyOnlineTurn) || (!isOnline && gameMode === 'pve' && !isP1Turn) ? (
            <span className="oaq-hint">Đang chờ đối thủ đi…</span>
          ) : (
            <span className="oaq-hint oaq-hint-active">Chạm vào một ô bên bạn để chọn quân ⤵</span>
          )}
        </div>

        <div className="o-an-quan-board-wrapper">
          <div className={`oaq-side-tag oaq-side-top ${!isP1Turn && !winner ? 'active' : ''}`}>
            {sideLabels.top} · hàng trên
          </div>

          <div className="o-an-quan-wooden-board">
            <div className={`o-an-quan-mandarin-slot mandarin-left ${selectedSlot === 11 ? 'selected' : ''}`}>
              <div className="mandarin-label">QUAN</div>
              {renderSeeds(board[11].small, board[11].big, true)}
              <div className="mandarin-count">{board[11].small + board[11].big * 10}</div>
            </div>

            <div className="o-an-quan-center-grid">
              <div className="peasant-row peasant-row-top">
                {[10, 9, 8, 7, 6].map(idx => {
                  const isSelected = selectedSlot === idx;
                  const canSelect = canInteractWithSlot(idx);
                  const isEmpty = board[idx].small === 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectSlot(idx)}
                      disabled={!canSelect}
                      className={`peasant-cell side-top ${canSelect ? 'selectable' : ''} ${isSelected ? 'selected' : ''} ${isEmpty ? 'is-empty' : ''}`}
                    >
                      {renderSeeds(board[idx].small, 0)}
                      <div className="peasant-count">{board[idx].small}</div>
                    </button>
                  );
                })}
              </div>

              <div className="peasant-row">
                {[0, 1, 2, 3, 4].map(idx => {
                  const isSelected = selectedSlot === idx;
                  const canSelect = canInteractWithSlot(idx);
                  const isEmpty = board[idx].small === 0;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectSlot(idx)}
                      disabled={!canSelect}
                      className={`peasant-cell side-bottom ${canSelect ? 'selectable' : ''} ${isSelected ? 'selected' : ''} ${isEmpty ? 'is-empty' : ''}`}
                    >
                      {renderSeeds(board[idx].small, 0)}
                      <div className="peasant-count">{board[idx].small}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`o-an-quan-mandarin-slot mandarin-right ${selectedSlot === 5 ? 'selected' : ''}`}>
              <div className="mandarin-label">QUAN</div>
              {renderSeeds(board[5].small, board[5].big, true)}
              <div className="mandarin-count">{board[5].small + board[5].big * 10}</div>
            </div>

            {selectedSlot !== null && (
              <div className="direction-picker-overlay">
                <div className="direction-picker-title-box">
                  <div className="direction-picker-label">Bạn đang cầm</div>
                  <div className="direction-picker-val">{selectedSeeds} sỏi</div>
                  <div className="direction-picker-hint">Chọn hướng rải:</div>
                </div>
                <div className="direction-picker-buttons">
                  <button onClick={() => handleDirectionChoice(-1)} className="direction-btn">
                    <ArrowLeftCircle size={40} />
                    <span className="direction-btn-label">Ngược chiều kim</span>
                  </button>
                  <button onClick={() => handleDirectionChoice(1)} className="direction-btn">
                    <ArrowRightCircle size={40} />
                    <span className="direction-btn-label">Thuận chiều kim</span>
                  </button>
                </div>
                <button onClick={() => setSelectedSlot(null)} className="btn-cancel-selection">
                  Hủy chọn
                </button>
              </div>
            )}
          </div>

          <div className={`oaq-side-tag oaq-side-bottom ${isP1Turn && !winner ? 'active' : ''}`}>
            {sideLabels.bottom} · hàng dưới
          </div>
        </div>

        <button onClick={handleReset} className="btn-primary-action" style={{ maxWidth: '440px', margin: '0 auto' }}>
          <RotateCcw size={16} /> Bắt đầu ván mới
        </button>
      </div>

      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Ô Ăn Quan</h3>
            <div className="modal-body">
              <p>1. Bàn cờ gồm 10 ô dân và 2 ô quan. Mỗi ô dân có 5 sỏi, mỗi ô quan có 1 sỏi lớn.</p>
              <p>2. Đến lượt, chọn một ô dân bên mình rồi chọn hướng rải.</p>
              <p>3. Nếu gặp ô dân còn sỏi, bốc lên rải tiếp; gặp ô quan hoặc ô trống thì dừng.</p>
              <p>4. Nếu sau ô trống là ô có sỏi, bạn ăn toàn bộ sỏi ở ô đó và có thể ăn liên tiếp.</p>
              <p>5. Khi hai ô quan hết sỏi, cộng điểm hai bên để phân định thắng thua.</p>
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
