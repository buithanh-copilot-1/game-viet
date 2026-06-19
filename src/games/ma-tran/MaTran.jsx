import { useState, useEffect, useRef } from 'react';
import { playSound } from '../../utils/audio';
import { HelpCircle, ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trophy, Lightbulb } from 'lucide-react';
import confetti from 'canvas-confetti';

const LEVEL_DATA = [
  // Level 1: Khởi đầu (Simple straight path with bends)
  {
    name: "Khởi đầu",
    hint: "Lăn khối tới ô vàng và DỰNG ĐỨNG vào đó để qua màn. Khi nằm ngang khối chiếm 2 ô.",
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
    name: "Đường quanh co",
    hint: "Lối đi hẹp: căn hướng cẩn thận để khối không lăn lệch ra ngoài mép vực.",
    width: 9,
    height: 7,
    tiles: [
      [0, 0, 0, 1, 1, 1, 1, 0, 0],
      [2, 1, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 0, 0, 1, 1, 1],
      [0, 0, 1, 1, 1, 0, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 1, 3],
      [0, 0, 0, 0, 0, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 1]
    ],
    startPos: { x: 0, y: 1 },
    goalPos: { x: 8, y: 4 }
  },
  // Level 3: Công tắc cầu nối (Soft switch & bridge)
  {
    name: "Cầu công tắc",
    hint: "Đè khối lên nút vàng tròn để mở cây cầu bắc qua hố, rồi vượt sang bờ bên kia.",
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
    name: "Gạch dễ vỡ",
    hint: "Gạch đỏ vỡ ngay nếu bạn DỰNG ĐỨNG lên. Chỉ được lăn NẰM NGANG lướt qua chúng.",
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
  },
  // Level 5: Mê lộ gấp khúc (larger open zig-zag)
  {
    name: "Mê lộ gấp khúc",
    hint: "Bản đồ rộng hơn với nhiều khúc cua. Men theo lối đi gấp khúc để tới đích.",
    width: 10,
    height: 6,
    tiles: [
      [2, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 3],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 9, y: 4 }
  },
  // Level 6: Bãi gạch đỏ (fragile-heavy)
  {
    name: "Bãi gạch đỏ",
    hint: "Nhiều bẫy gạch đỏ rải rác: luôn lăn NẰM NGANG vượt qua, tuyệt đối đừng đứng thẳng.",
    width: 10,
    height: 6,
    tiles: [
      [2, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 5, 5, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 5, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 3],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 9, y: 4 }
  },
  // Level 7: Công tắc & vực sâu (switch + bridge, longer)
  {
    name: "Công tắc & vực sâu",
    hint: "Đè nút mở cầu trước, sau đó vòng qua cầu rồi xuống đích ở phía dưới.",
    width: 10,
    height: 7,
    tiles: [
      [2, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 4, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 6, 6, 6, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 3, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 0]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 8, y: 5 },
    switches: [
      { x: 1, y: 2, bridges: [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }] }
    ]
  },
  // Level 8: Thử thách tổng hợp (switch + vertical bridge + fragile)
  {
    name: "Thử thách tổng hợp",
    hint: "Tổng hợp mọi cơ chế: mở cầu bằng nút, vượt cầu dọc, né gạch đỏ rồi dựng vào đích.",
    width: 11,
    height: 7,
    tiles: [
      [2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 4, 1, 1, 1, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 6, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 6, 0, 0, 1, 1, 1, 1],
      [0, 0, 0, 0, 6, 1, 1, 1, 5, 1, 3],
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 10, y: 5 },
    switches: [
      { x: 2, y: 2, bridges: [{ x: 4, y: 3 }, { x: 4, y: 4 }, { x: 4, y: 5 }] }
    ]
  },
  // Level 9: Hành lang chữ U (long wrap-around corridor)
  {
    name: "Hành lang chữ U",
    hint: "Hành lang vòng hình chữ U bao quanh một hố lớn ở giữa. Đi vòng theo viền tới đích.",
    width: 11,
    height: 6,
    tiles: [
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 10, y: 4 }
  },
  // Level 10: Cầu công tắc xa (switch far from its bridge)
  {
    name: "Cầu công tắc xa",
    hint: "Nút mở cầu nằm xa cây cầu. Đè nút trước, rồi quay lại vượt cầu sang khu bên phải.",
    width: 11,
    height: 7,
    tiles: [
      [2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 6, 6, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 3],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 10, y: 5 },
    switches: [
      { x: 1, y: 1, bridges: [{ x: 3, y: 2 }, { x: 4, y: 2 }] }
    ]
  },
  // Level 11: Bước qua gạch vỡ (fragile zig-zag)
  {
    name: "Bước qua gạch vỡ",
    hint: "Gạch đỏ chắn lối quanh co: lăn NẰM NGANG qua từng cụm, đừng dựng đứng lên chúng.",
    width: 10,
    height: 7,
    tiles: [
      [2, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 1, 5, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 5, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 3],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 9, y: 5 }
  },
  // Level 12: Đại mê cung (large finale combining every mechanic)
  {
    name: "Đại mê cung",
    hint: "Màn lớn nhất: mở cầu bằng nút, băng qua cầu, né gạch đỏ rồi luồn xuống dựng vào đích.",
    width: 12,
    height: 8,
    tiles: [
      [2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 1, 4, 1, 1, 1, 6, 1, 1, 1, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 0, 5, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 3],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1]
    ],
    startPos: { x: 0, y: 0 },
    goalPos: { x: 11, y: 6 },
    switches: [
      { x: 2, y: 2, bridges: [{ x: 6, y: 2 }] }
    ]
  }
];

export default function MaTran({ onBack }) {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const level = LEVEL_DATA[currentLevelIdx];

  const [pos, setPos] = useState(level.startPos);
  const [state, setState] = useState('vertical'); // 'vertical' | 'horizontal-x' | 'horizontal-y'
  const [rot, setRot] = useState({ x: 0, y: 0 });
  // While the brick tips over its contact edge: { dir, fromPos, fromState, phase }.
  // phase 'start' renders the brick at its old resting pose (pivot 0°); 'roll'
  // animates the 90° tip-over toward the new pose. null when at rest.
  const [roll, setRoll] = useState(null);
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
    setRoll(null);
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

    // Begin the edge-pivot roll: keep drawing the brick at its current resting
    // pose while a CSS keyframe animation tips it 90° over the contact edge
    // towards `dir`. The animation starts deterministically the moment the
    // pivot element renders, so there is no transition "kick-off" stutter.
    const fromPos = { x: pos.x, y: pos.y };
    const fromState = state;
    setRot({ x: newRotX, y: newRotY });
    setRoll({ dir, fromPos, fromState });

    // When the tip-over finishes, commit the new resting pose/position and
    // clear the roll (the tipped brick already matches the new pose, so the
    // swap is seamless), then validate the landing. Matches the 220ms CSS
    // animation with a tiny buffer so we never commit mid-animation.
    setTimeout(() => {
      setPos({ x: newX, y: newY });
      setState(newState);
      setRoll(null);
      checkNewPosition(newX, newY, newState);
    }, 225);
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

        // Continuous floor: cells butt together seamlessly (the top face fills
        // its whole 40×40 cell with no gap/rounding) and grid lines are drawn
        // on top. Real 3D thickness comes from side walls rendered ONLY on the
        // outer boundary edges (where there is no walkable neighbour), so the
        // whole walkable area reads as one carved slab, not stacked cubes.
        const T = 12; // slab thickness (px)
        const isFilled = (tx, ty) =>
          ty >= 0 && ty < level.height && tx >= 0 && tx < level.width &&
          level.tiles[ty][tx] !== 0 &&
          !(level.tiles[ty][tx] === 6 && !bridgeActive); // closed bridge = gap
        const wallS = !isFilled(x, y + 1); // south boundary
        const wallE = !isFilled(x + 1, y); // east boundary
        const wallN = !isFilled(x, y - 1); // north boundary
        const wallW = !isFilled(x - 1, y); // west boundary

        tilesToRender.push(
          <div
            key={`${x},${y}`}
            className={`matrix-tile-slab ${isBroken ? 'broken' : ''}`}
            style={{ left: `${x * 40}px`, top: `${y * 40}px` }}
          >
            <div className={tileClass} style={{ transform: 'translateZ(0px)' }}>
              {type === 3 && <div className="goal-hole" />}
            </div>
            {wallS && (
              <div className="matrix-tile-side side-south"
                style={{ height: `${T}px`, transform: 'translateY(40px) rotateX(-90deg)', transformOrigin: 'top' }} />
            )}
            {wallE && (
              <div className="matrix-tile-side side-east"
                style={{ width: `${T}px`, transform: 'translateX(40px) rotateY(90deg)', transformOrigin: 'left' }} />
            )}
            {wallN && (
              <div className="matrix-tile-side side-north"
                style={{ height: `${T}px`, transform: 'rotateX(-90deg)', transformOrigin: 'top' }} />
            )}
            {wallW && (
              <div className="matrix-tile-side side-west"
                style={{ width: `${T}px`, transform: 'rotateY(90deg)', transformOrigin: 'left' }} />
            )}
          </div>
        );
      }
    }
    return tilesToRender;
  };

  const boardWidth = level.width * 40;
  const boardHeight = level.height * 40;

  // ---- 3D cuboid geometry ----
  // The brick is a FIXED 1×1×2 cuboid in its own local frame:
  //   X span = 32 (W), Y span = 32 (D), Z span = 64 (H, tall).
  // Orientation is produced ONLY by the accumulated rotation (rot.x / rot.y),
  // never by resizing the faces. `state` is used solely to position/lift the
  // container so the resting brick sits flush on the tile(s).
  // Brick fills a full tile (40) so its contact edges line up exactly with the
  // grid. This makes the edge-pivot roll land precisely on the next cell with
  // no settle/snap at the end of the animation.
  const W = 40; // local X
  const D = 40; // local Y
  const H = 80; // local Z (height when standing) = two tiles tall

  // cube-3d wrapper is a zero-size point at the container center; faces are
  // placed relative to it. We center the wrapper inside the 40px container.
  const pivotLeft = 20;
  const pivotTop = 20;

  // Fixed brick faces. Tall axis (H) runs along world Z (up) so the brick
  // STANDS at rest. The 4 walls are first laid down with rotateX(90deg) so
  // their CSS height maps onto Z, then spun around Z to face each side.
  //   - front/back walls: 32 wide (X) × 64 tall (Z), normal along ±Y
  //   - left/right walls : 32 wide (Y) × 64 tall (Z), normal along ±X
  //   - top/bottom caps  : 32 (X) × 32 (Y), normal along ±Z
  const cubeFaces = [
    { name: 'front',  w: W, h: H, transform: `rotateX(90deg) translateZ(${D / 2}px)` },
    { name: 'back',   w: W, h: H, transform: `rotateX(90deg) rotateY(180deg) translateZ(${D / 2}px)` },
    { name: 'right',  w: D, h: H, transform: `rotateX(90deg) rotateY(90deg)  translateZ(${W / 2}px)` },
    { name: 'left',   w: D, h: H, transform: `rotateX(90deg) rotateY(-90deg) translateZ(${W / 2}px)` },
    { name: 'top',    w: W, h: D, transform: `translateZ(${H / 2}px)` },
    { name: 'bottom', w: W, h: D, transform: `rotateX(180deg) translateZ(${H / 2}px)` },
  ];

  // Resting geometry for any (pos, state): where the container sits, how high
  // its centre rides, the brick's pose, and the ground-shadow footprint.
  //   vertical     → standing (long Z axis up),   centre 32 above the tile
  //   horizontal-x → lying along world X,         centre 16 above the tile
  //   horizontal-y → lying along world Y,         centre 16 above the tile
  const restGeometry = (p, s) => {
    let pose = 'rotateX(0deg) rotateY(0deg)';
    if (s === 'horizontal-x') pose = 'rotateY(90deg)';
    else if (s === 'horizontal-y') pose = 'rotateX(90deg)';
    // Half-extents of the brick's bounding box in this rest state.
    const hx = s === 'horizontal-x' ? 40 : 20;
    const hy = s === 'horizontal-y' ? 40 : 20;
    const hz = s === 'vertical' ? 40 : 20;
    return {
      left: p.x * 40 + (s === 'horizontal-x' ? 20 : 0),
      top: p.y * 40 + (s === 'horizontal-y' ? 20 : 0),
      lift: hz,
      pose,
      hx, hy, hz,
    };
  };

  // During a roll, the brick is drawn at its OLD resting pose and tipped over
  // the contact edge; otherwise it is drawn at the committed (pos, state).
  const drawPos = roll ? roll.fromPos : pos;
  const drawState = roll ? roll.fromState : state;
  const geo = restGeometry(drawPos, drawState);

  // The stone floor's top face sits at Z=0 (its 12px thickness extrudes
  // downward), so the brick rests directly on the Z=0 board plane.
  const FLOOR_TOP = 0;
  const cubeRotation = geo.pose;
  const cubeLift = geo.lift;
  const containerLeft = geo.left;
  const containerTop = geo.top;

  let cubeContainerTransform = `translateZ(${FLOOR_TOP + cubeLift}px)`;
  if (isFalling) {
    cubeContainerTransform = `translateZ(-250px) rotateX(140deg) rotateY(140deg)`;
  } else if (isWinning) {
    cubeContainerTransform = `translateZ(-44px) scale(0.05)`;
  }

  // The pivot layer tips the brick 90° about the contact edge in the direction
  // of travel. transform-origin is placed at that bottom edge (in the container's
  // 40×40 local box, with Z=0 at the tile surface = -cubeLift from the centre).
  // Edge per direction (looking down on the board, before iso tilt):
  //   right → east edge,  left → west edge,  down → south edge,  up → north edge
  // Pivot about the brick's true contact edge: cube centre is at container
  // (20, 20); the edge is half-extent away in the travel direction, at the
  // stone surface (z = -lift below the centre).
  const c = 20; // cube centre in the 40×40 container
  let pivotOrigin = '50% 50%';
  let pivotAnimation = 'none';
  if (roll) {
    const z0 = -cubeLift;
    switch (roll.dir) {
      case 'right': pivotOrigin = `${c + geo.hx}px ${c}px ${z0}px`; pivotAnimation = 'roll-right'; break;
      case 'left':  pivotOrigin = `${c - geo.hx}px ${c}px ${z0}px`; pivotAnimation = 'roll-left';  break;
      case 'down':  pivotOrigin = `${c}px ${c + geo.hy}px ${z0}px`; pivotAnimation = 'roll-down';  break;
      case 'up':    pivotOrigin = `${c}px ${c - geo.hy}px ${z0}px`; pivotAnimation = 'roll-up';    break;
    }
  }

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
          
          {/* Level Info + per-level guidance */}
          <div className="widget-panel matrix-level-panel">
            <div className="matrix-level-head">
              <div className="matrix-level-title">
                <span className="matrix-level-counter">Màn {currentLevelIdx + 1}/{LEVEL_DATA.length}</span>
                <span className="matrix-level-name">{level.name}</span>
              </div>
              <button onClick={resetLevelState} className="btn-secondary-action">
                Chơi Lại
              </button>
            </div>
            <div className="matrix-hint">
              <Lightbulb size={14} className="matrix-hint-icon" />
              <span>{level.hint}</span>
            </div>
          </div>

          {/* 3D Isometric Viewport */}
          <div className="matrix-3d-scene" style={{ minHeight: `${boardHeight + 120}px` }}>
            <div className="matrix-board-wrapper">
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
                  <div
                    className="cube-pivot"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '40px',
                      height: '40px',
                      transformStyle: 'preserve-3d',
                      WebkitTransformStyle: 'preserve-3d',
                      transformOrigin: pivotOrigin,
                      animation: roll
                        ? `${pivotAnimation} 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`
                        : 'none'
                    }}
                  >
                  <div
                    className="cube-3d"
                    style={{
                      width: '0px',
                      height: '0px',
                      left: `${pivotLeft}px`,
                      top: `${pivotTop}px`,
                      transform: cubeRotation
                    }}
                  >
                    {cubeFaces.map((f) => (
                      <div
                        key={f.name}
                        className={`cube-face face-${f.name}`}
                        style={{
                          width: `${f.w}px`,
                          height: `${f.h}px`,
                          left: '50%',
                          top: '50%',
                          marginLeft: `${-f.w / 2}px`,
                          marginTop: `${-f.h / 2}px`,
                          transform: f.transform
                        }}
                      />
                    ))}
                  </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* D-Pad controls for mobile touch devices */}
          <div className="dpad-panel">
            <span className="dpad-hint">
              Chạm phím mũi tên hoặc dùng bàn phím (W A S D / Phím mũi tên)
            </span>
            <div className="dpad-cross">
              <button onClick={() => move('up')} className="dpad-key dpad-up" aria-label="Lên">
                <ChevronUp size={28} />
              </button>
              <button onClick={() => move('left')} className="dpad-key dpad-left" aria-label="Trái">
                <ChevronLeft size={28} />
              </button>
              <div className="dpad-hub" aria-hidden="true" />
              <button onClick={() => move('right')} className="dpad-key dpad-right" aria-label="Phải">
                <ChevronRight size={28} />
              </button>
              <button onClick={() => move('down')} className="dpad-key dpad-down" aria-label="Xuống">
                <ChevronDown size={28} />
              </button>
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
