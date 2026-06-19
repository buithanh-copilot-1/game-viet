import React, { useState, useEffect, useRef } from 'react';
import { playSound } from '../../utils/audio';
import { RotateCcw, HelpCircle, ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

const LEVEL_DATA = [
  // Level 1: Khởi đầu (Simple straight path with bends)
  {
    name: "Mức 1: Khởi đầu",
    width: 10,
    height: 5,
    tiles: [
      [0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      [2, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 3, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
    ],
    startPos: { x: 0, y: 1 },
    goalPos: { x: 8, y: 2 }
  },
  // Level 2: Đường quanh co (Narrow bends requiring lật states)
  {
    name: "Mức 2: Đường quanh co",
    width: 9,
    height: 7,
    tiles: [
      [0, 0, 0, 1, 1, 1, 1, 0, 0],
      [2, 1, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 0, 0, 1, 1, 1],
      [0, 0, 1, 1, 1, 0, 0, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3],
      [0, 0, 0, 0, 0, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 1]
    ],
    startPos: { x: 0, y: 1 },
    goalPos: { x: 8, y: 4 }
  },
  // Level 3: Công tắc cầu nối (Soft switch & bridge)
  {
    name: "Mức 3: Cầu công tắc",
    width: 9,
    height: 6,
    tiles: [
      [2, 1, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 1, 1, 1],
      [1, 4, 1, 0, 0, 0, 1, 1, 3],
      [1, 1, 1, 6, 6, 6, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 1, 1, 1, 1, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 8, y: 2 },
    switches: [
      { x: 1, y: 2, bridges: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }] }
    ]
  },
  // Level 4: Gạch kính dễ vỡ (Fragile tiles path)
  {
    name: "Mức 4: Gạch dễ vỡ",
    width: 9,
    height: 6,
    tiles: [
      [2, 1, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 5, 5, 5, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 5, 1, 1, 1],
      [0, 0, 0, 0, 1, 5, 1, 1, 3],
      [0, 0, 0, 0, 1, 1, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 8, y: 4 }
  }
];

const GoldMotif = () => (
  <svg viewBox="0 0 32 32" style={{ width: '22px', height: '22px' }}>
    <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" strokeDasharray="2 1" />
    <circle cx="16" cy="16" r="10" fill="none" stroke="var(--color-gold)" strokeWidth="0.5" />
    <circle cx="16" cy="16" r="5" fill="none" stroke="var(--color-gold)" strokeWidth="0.8" />
    <path d="M16 8 L16 24 M8 16 L24 16 M10.3 10.3 L21.7 21.7 M10.3 21.7 L21.7 10.3" stroke="var(--color-gold)" strokeWidth="0.8" />
  </svg>
);

export default function MaTran({ onBack }) {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const level = LEVEL_DATA[currentLevelIdx];

  const [pos, setPos] = useState(level.startPos);
  const [state, setState] = useState('vertical'); // 'vertical' | 'horizontal-x' | 'horizontal-y'
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [isFalling, setIsFalling] = useState(false);
  const [isWinning, setIsWinning] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  // Puzzle mechanical states
  const [bridgeActive, setBridgeActive] = useState(false);
  const [steppedFragile, setSteppedFragile] = useState([]); // Array of strings like "x,y"
  const [brokenTiles, setBrokenTiles] = useState([]); // Array of strings like "x,y"
  
  const isTransitioning = useRef(false);

  // Sync state with level change
  useEffect(() => {
    resetLevelState();
  }, [currentLevelIdx]);

  // Bind keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showRules || gameCompleted || isFalling || isWinning) return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          e.preventDefault();
          move('up');
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          move('down');
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          move('left');
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          move('right');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pos, rot, isFalling, isWinning, showRules, gameCompleted, bridgeActive, steppedFragile, brokenTiles]);

  const resetLevelState = () => {
    setPos(level.startPos);
    setState('vertical');
    setRot({ x: 0, y: 0 });
    setIsFalling(false);
    setIsWinning(false);
    setBridgeActive(false);
    setSteppedFragile([]);
    setBrokenTiles([]);
    isTransitioning.current = false;
  };

  const move = (dir) => {
    if (isTransitioning.current || isFalling || isWinning) return;
    
    let newX = pos.x;
    let newY = pos.y;
    let newRotX = rot.x;
    let newRotY = rot.y;
    let newState = state;

    switch (state) {
      case 'vertical':
        switch (dir) {
          case 'up':
            newY -= 2;
            newRotX -= 90;
            newState = 'horizontal-y';
            break;
          case 'down':
            newY += 1;
            newRotX += 90;
            newState = 'horizontal-y';
            break;
          case 'left':
            newX -= 2;
            newRotY -= 90;
            newState = 'horizontal-x';
            break;
          case 'right':
            newX += 1;
            newRotY += 90;
            newState = 'horizontal-x';
            break;
        }
        break;
      case 'horizontal-x':
        switch (dir) {
          case 'up':
            newY -= 1;
            newRotX -= 90;
            break;
          case 'down':
            newY += 1;
            newRotX += 90;
            break;
          case 'left':
            newX -= 1;
            newRotY -= 90;
            newState = 'vertical';
            break;
          case 'right':
            newX += 2;
            newRotY += 90;
            newState = 'vertical';
            break;
        }
        break;
      case 'horizontal-y':
        switch (dir) {
          case 'up':
            newY -= 1;
            newRotX -= 90;
            newState = 'vertical';
            break;
          case 'down':
            newY += 2;
            newRotX += 90;
            newState = 'vertical';
            break;
          case 'left':
            newX -= 1;
            newRotY -= 90;
            break;
          case 'right':
            newX += 1;
            newRotY += 90;
            break;
        }
        break;
    }

    playSound('place');
    isTransitioning.current = true;

    // Record previous tiles as stepped if fragile
    const steppedKeys = [];
    if (state === 'vertical') {
      steppedKeys.push(`${pos.x},${pos.y}`);
    } else if (state === 'horizontal-x') {
      steppedKeys.push(`${pos.x},${pos.y}`, `${pos.x + 1},${pos.y}`);
    } else if (state === 'horizontal-y') {
      steppedKeys.push(`${pos.x},${pos.y}`, `${pos.x},${pos.y + 1}`);
    }
    
    steppedKeys.forEach(key => {
      const parts = key.split(',');
      const tx = parseInt(parts[0]);
      const ty = parseInt(parts[1]);
      const type = level.tiles[ty] ? level.tiles[ty][tx] : 0;
      if (type === 5) {
        setBrokenTiles(prev => [...prev, key]);
      }
    });

    // Update position, rotation and state
    setPos({ x: newX, y: newY });
    setRot({ x: newRotX, y: newRotY });
    setState(newState);

    // Validate the new position
    setTimeout(() => {
      checkNewPosition(newX, newY, newState);
    }, 180);
  };

  const checkNewPosition = (x, y, blockState) => {
    // Get all tiles occupied by the block in its new state
    const occupied = [];
    if (blockState === 'vertical') {
      occupied.push({ x, y });
    } else if (blockState === 'horizontal-x') {
      occupied.push({ x, y }, { x: x + 1, y });
    } else if (blockState === 'horizontal-y') {
      occupied.push({ x, y }, { x, y: y + 1 });
    }

    // Check if any occupied tile is out of bounds or empty / broken / closed bridge
    let falls = false;
    for (const tile of occupied) {
      const outOfBounds = tile.x < 0 || tile.x >= level.width || tile.y < 0 || tile.y >= level.height;
      const tileType = outOfBounds ? 0 : level.tiles[tile.y][tile.x];
      const isBroken = brokenTiles.includes(`${tile.x},${tile.y}`);
      const isBridge = tileType === 6;
      const isBridgeOpen = isBridge && bridgeActive;

      if (tileType === 0 || isBroken || (isBridge && !isBridgeOpen)) {
        falls = true;
        break;
      }
    }

    if (falls) {
      setIsFalling(true);
      playSound('lose');
      setTimeout(() => {
        resetLevelState();
      }, 800);
      return;
    }

    // Check if standing vertically on a fragile tile (tileType === 5)
    if (blockState === 'vertical') {
      const tileType = level.tiles[y][x];
      if (tileType === 5) {
        // Instant break and fall!
        setBrokenTiles(prev => [...prev, `${x},${y}`]);
        setIsFalling(true);
        playSound('lose');
        setTimeout(() => {
          resetLevelState();
        }, 800);
        return;
      }
    }

    // Trigger switches if any part of the block stands on a switch (tileType === 4)
    occupied.forEach(tile => {
      const tileType = level.tiles[tile.y][tile.x];
      if (tileType === 4) {
        const sw = level.switches?.find(s => s.x === tile.x && s.y === tile.y);
        if (sw) {
          setBridgeActive(true);
          playSound('score');
        }
      }
    });

    // Mark fragile tiles as stepped-on visually if we lie on them
    occupied.forEach(tile => {
      const tileType = level.tiles[tile.y][tile.x];
      if (tileType === 5) {
        setSteppedFragile(prev => [...prev, `${tile.x},${tile.y}`]);
      }
    });

    // Check goal winning condition: must be standing vertically on the goal tile (type === 3)
    if (blockState === 'vertical' && x === level.goalPos.x && y === level.goalPos.y) {
      setIsWinning(true);
      playSound('win');
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.75 }
      });

      setTimeout(() => {
        if (currentLevelIdx < LEVEL_DATA.length - 1) {
          setCurrentLevelIdx(prev => prev + 1);
        } else {
          setGameCompleted(true);
        }
      }, 1000);
      return;
    }

    // Allow next move
    isTransitioning.current = false;
  };

  const handleRestartGame = () => {
    playSound('click');
    setCurrentLevelIdx(0);
    setGameCompleted(false);
    resetLevelState();
  };

  const renderGrid = () => {
    const tilesToRender = [];
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const type = level.tiles[y][x];
        if (type === 0) continue; // Don't render empty tiles
        
        const isBroken = brokenTiles.includes(`${x},${y}`);
        const isBridge = type === 6;
        const isBridgeOpen = isBridge && bridgeActive;
        
        let tileClass = "matrix-tile";
        if (type === 2) tileClass += " start";
        if (type === 3) tileClass += " goal-tile";
        
        const isOccupying = 
          (pos.x === x && pos.y === y) ||
          (state === 'horizontal-x' && pos.x + 1 === x && pos.y === y) ||
          (state === 'horizontal-y' && pos.x === x && pos.y + 1 === y);

        if (type === 4) tileClass += ` switch-tile ${isOccupying ? 'switch-active' : ''}`;
        if (type === 5) {
          if (isBroken) tileClass += " broken";
          else if (steppedFragile.includes(`${x},${y}`)) tileClass += " fragile-stepped";
          else tileClass += " fragile-tile";
        }
        
        if (isBridge) {
          if (isBridgeOpen) tileClass += " bridge";
          else continue; // Don't render closed bridge tiles
        }

        // Flat floor 3D slab translation
        const zVal = 0;
        const shadowThickness = 4.5;
        
        tilesToRender.push(
          <div 
            key={`${x},${y}`}
            className={tileClass}
            style={{
              left: `${x * 40}px`,
              top: `${y * 40}px`,
              transform: `translateZ(${zVal}px)`,
              boxShadow: `0 ${shadowThickness}px 0 #150806, 0 8px 15px rgba(0,0,0,0.7)`
            }}
          >
            {type === 3 && <div className="goal-hole" />}
          </div>
        );
      }
    }
    return tilesToRender;
  };

  const boardWidth = level.width * 40;
  const boardHeight = level.height * 40;

  // Constant dimensions of the 3D cuboid block
  const width = 32;
  const length = 32;
  const height = 64;

  // Flat grid floor
  const cubeZVal = 0;

  // Compute transform state for rolling cube
  let cubeContainerTransform = `translateZ(${cubeZVal + (state === 'vertical' ? 32 : 16)}px)`;
  if (isFalling) {
    cubeContainerTransform = `translateZ(-250px) rotateX(140deg) rotateY(140deg)`;
  } else if (isWinning) {
    cubeContainerTransform = `translateZ(${cubeZVal - 44}px) scale(0.05)`;
  }

  // Container positioning offsets based on horizontal state
  const containerLeft = pos.x * 40 + (state === 'horizontal-x' ? 20 : 0);
  const containerTop = pos.y * 40 + (state === 'horizontal-y' ? 20 : 0);

  // Shadow dimensions and offsets
  const shadowWidth = state === 'horizontal-x' ? 64 : 24;
  const shadowLength = state === 'horizontal-y' ? 64 : 24;
  const shadowLeft = state === 'horizontal-x' ? -12 : 8;
  const shadowTop = state === 'horizontal-y' ? -12 : 8;
  const shadowTranslateZ = state === 'vertical' ? -31.5 : -15.5;

  return (
    <div className="game-container">
      {/* Header */}
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="game-title">Ma Trận Lập Phương</h1>
        <button onClick={() => setShowRules(true)} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Lobby / Board Body */}
      {gameCompleted ? (
        <div className="lobby-main" style={{ justifyContent: 'center' }}>
          <div className="lobby-hero">
            <div className="lobby-badge-container" style={{ borderStyle: 'solid', borderColor: 'var(--color-gold)' }}>
              <Trophy className="text-yellow-500 w-8 h-8" />
            </div>
            <h2 className="text-gold-gradient font-serif" style={{ fontSize: '24px' }}>Hoàn Thành Ma Trận!</h2>
            <p className="game-card-desc" style={{ textAlign: 'center', margin: '8px 0 20px' }}>
              Chúc mừng bạn đã chinh phục toàn bộ các mức cấp độ của khối lập phương lật!
            </p>
            <button onClick={handleRestartGame} className="btn-primary-action" style={{ maxWidth: '200px' }}>
              Chơi Lại Từ Đầu
            </button>
          </div>
        </div>
      ) : (
        <div className="bau-cua-main-area" style={{ flex: 1, justifyContent: 'space-between' }}>
          
          {/* Level Info Widget */}
          <div className="widget-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--color-gold-bright)' }}>
              {level.name}
            </div>
            <button onClick={resetLevelState} className="btn-secondary-action">
              Chơi Lại Mức Này
            </button>
          </div>

          {/* 3D Isometric Viewport */}
          <div className="matrix-3d-scene" style={{ minHeight: `${boardHeight + 120}px` }}>
            <div 
              className="matrix-board-3d"
              style={{
                width: `${boardWidth}px`,
                height: `${boardHeight}px`,
              }}
            >
              {/* Grid Tiles */}
              {renderGrid()}

              {/* Rolling 3D Cube */}
              <div 
                className={`cube-container-3d ${isFalling ? 'falling' : ''} ${isWinning ? 'winning' : ''}`}
                style={{
                  left: `${containerLeft}px`,
                  top: `${containerTop}px`,
                  width: '40px',
                  height: '40px',
                  transform: cubeContainerTransform
                }}
              >
                {!isFalling && (
                  <div 
                    className="cube-shadow" 
                    style={{
                      width: `${shadowWidth}px`,
                      height: `${shadowLength}px`,
                      left: `${shadowLeft}px`,
                      top: `${shadowTop}px`,
                      transform: `translateZ(${shadowTranslateZ}px)`
                    }}
                  />
                )}
                <div 
                  className="cube-3d"
                  style={{
                    width: '32px',
                    height: '32px',
                    left: '4px',
                    top: '4px',
                    transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`
                  }}
                >
                  <div className="cube-face face-front" style={{ width: '32px', height: '32px', left: '50%', top: '50%', marginLeft: '-16px', marginTop: '-16px', transform: 'rotateY(0deg) translateZ(32px)' }}><GoldMotif /></div>
                  <div className="cube-face face-back" style={{ width: '32px', height: '32px', left: '50%', top: '50%', marginLeft: '-16px', marginTop: '-16px', transform: 'rotateY(180deg) translateZ(32px)' }}><GoldMotif /></div>
                  <div className="cube-face face-left" style={{ width: '32px', height: '64px', left: '50%', top: '50%', marginLeft: '-16px', marginTop: '-32px', transform: 'rotateY(-90deg) translateZ(16px)' }}><GoldMotif /></div>
                  <div className="cube-face face-right" style={{ width: '32px', height: '64px', left: '50%', top: '50%', marginLeft: '-16px', marginTop: '-32px', transform: 'rotateY(90deg) translateZ(16px)' }}><GoldMotif /></div>
                  <div className="cube-face face-top" style={{ width: '32px', height: '64px', left: '50%', top: '50%', marginLeft: '-16px', marginTop: '-32px', transform: 'rotateX(90deg) translateZ(16px)' }}><GoldMotif /></div>
                  <div className="cube-face face-bottom" style={{ width: '32px', height: '64px', left: '50%', top: '50%', marginLeft: '-16px', marginTop: '-32px', transform: 'rotateX(-90deg) translateZ(16px)' }}><GoldMotif /></div>
                </div>
              </div>

            </div>
          </div>

          {/* D-Pad controls for mobile touch devices */}
          <div className="dpad-panel">
            <span className="copy-box" style={{ fontSize: '10px', opacity: 0.6 }}>
              Chạm phím hoặc dùng bàn phím (W, A, S, D / Phím mũi tên)
            </span>
            <div className="dpad-container">
              <div />
              <button onClick={() => move('up')} className="dpad-btn"><ChevronUp size={20} /></button>
              <div />
              <button onClick={() => move('left')} className="dpad-btn"><ChevronLeft size={20} /></button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>DPAD</div>
              <button onClick={() => move('right')} className="dpad-btn"><ChevronRight size={20} /></button>
              <div />
              <button onClick={() => move('down')} className="dpad-btn"><ChevronDown size={20} /></button>
              <div />
            </div>
          </div>

        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Ma Trận</h3>
            <div className="modal-body">
              <p>1. <strong>Mục tiêu:</strong> Điều khiển khối hộp chữ nhật 1x1x2 lật lướt qua các ô nền và dựng đứng chính xác vào chiếc lỗ ở ván đấu cuối cùng để qua màn.</p>
              <p>2. <strong>Kích thước màn chơi:</strong> Mỗi màn chơi sẽ có chiều dài - ngắn và hình dạng mê cung khác nhau, độ phức tạp tăng dần qua từng cấp độ.</p>
              <p>3. <strong>Điều khiển:</strong> Dùng bộ D-Pad ảo trên màn hình hoặc dùng bàn phím máy tính <strong>(W: Lên, S: Xuống, A: Trái, D: Phải)</strong>.</p>
              <p>4. <strong>Vực thẳm:</strong> Không được để khối hộp lật ra ngoài các ô đất hoặc chỉ có một phần tựa trên gạch, nếu không khối cờ sẽ mất thăng bằng rơi tự do.</p>
              <p>5. <strong>Gạch kính vỡ:</strong> Các viên gạch viền đỏ sẽ vỡ ngay lập tức nếu bạn dựng đứng trên chúng. Nếu lật nằm ngang, chúng sẽ vỡ sau khi bạn di chuyển đi.</p>
              <p>6. <strong>Công tắc cầu nối:</strong> Bước đè lên nút màu vàng tròn để mở rộng lối đi qua các hố vực ngăn cách.</p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => { playSound('click'); setShowRules(false); }}
                className="btn-primary-action"
              >
                Bắt Đầu Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
