import { useState } from 'react'
import OAnQuan from './games/o-an-quan/OAnQuan'
import BauCua from './games/bau-cua/BauCua'
import CoCaRo from './games/co-ca-ro/CoCaRo'
import MaTran from './games/ma-tran/MaTran'
import { playSound, toggleSound, isSoundEnabled } from './utils/audio'
import { Volume2, VolumeX, Gamepad2, Info } from 'lucide-react'

function App() {
  const [currentGame, setCurrentGame] = useState(null); // null, 'o-an-quan', 'bau-cua', 'co-ca-ro', 'ma-tran'
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) {
      playSound('click');
    }
  };

  const selectGame = (gameId) => {
    playSound('click');
    setCurrentGame(gameId);
  };

  // Render sub-game screen
  if (currentGame === 'o-an-quan') {
    return <OAnQuan onBack={() => { playSound('click'); setCurrentGame(null); }} />;
  }
  if (currentGame === 'bau-cua') {
    return <BauCua onBack={() => { playSound('click'); setCurrentGame(null); }} />;
  }
  if (currentGame === 'co-ca-ro') {
    return <CoCaRo onBack={() => { playSound('click'); setCurrentGame(null); }} />;
  }
  if (currentGame === 'ma-tran') {
    return <MaTran onBack={() => { playSound('click'); setCurrentGame(null); }} />;
  }

  // Render Lobby screen
  return (
    <div className="app-container">
      
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge">VN</div>
          <span className="brand-title">Folk Games</span>
        </div>
        
        {/* Sound Toggle */}
        <button onClick={handleToggleSound} className="btn-icon-toggle">
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </header>

      {/* Main Brand Title */}
      <main className="lobby-main">
        
        <div className="lobby-hero">
          {/* Decorative Dong Son style badge */}
          <div className="lobby-badge-container">
            <Gamepad2 className="text-yellow-500 w-7 h-7" />
          </div>
          <h1 className="lobby-title">Game Dân Gian</h1>
          <p className="lobby-subtitle">Cổng trò chơi Việt Nam</p>
        </div>

        {/* Game selector list */}
        <div className="game-card-list">
          
          {/* Game 1: Ô ăn quan */}
          <button onClick={() => selectGame('o-an-quan')} className="game-card">
            <div className="game-card-info">
              <span className="game-card-title">Ô Ăn Quan</span>
              <span className="game-card-desc">
                Rải sỏi ăn quan chiến thuật, tính toán ăn dồn dập thắng áp đảo đối phương.
              </span>
            </div>
            <div className="game-card-art">🪨</div>
          </button>

          {/* Game 2: Bầu cua tôm cá */}
          <button onClick={() => selectGame('bau-cua')} className="game-card">
            <div className="game-card-info">
              <span className="game-card-title">Bầu Cua Tôm Cá</span>
              <span className="game-card-desc">
                Thử tài đoán linh vật xúc xắc ngày Tết, âm thanh xốc đĩa bát lắc cực vui.
              </span>
            </div>
            <div className="game-card-art">🎲</div>
          </button>

          {/* Game 3: Cờ ca rô */}
          <button onClick={() => selectGame('co-ca-ro')} className="game-card">
            <div className="game-card-info">
              <span className="game-card-title">Cờ Ca Rô</span>
              <span className="game-card-desc">
                Gomoku 5 quân thẳng hàng đấu trí đỉnh cao với Máy (AI) hoặc chế độ 2 người.
              </span>
            </div>
            <div className="game-card-art">❌</div>
          </button>

          {/* Game 4: Ma Trận Lập Phương */}
          <button onClick={() => selectGame('ma-tran')} className="game-card">
            <div className="game-card-info">
              <span className="game-card-title">Ma Trận Lập Phương</span>
              <span className="game-card-desc">
                Lật khối lập phương 3D khéo léo để lọt hố đích, tránh rơi khỏi khoảng không.
              </span>
            </div>
            <div className="game-card-art">📦</div>
          </button>

        </div>

      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-info">
          <Info size={11} /> Tối ưu cho thiết bị di động dọc (Portrait Mode)
        </div>
        <div>
          © 2026 Cổng Game Dân Gian Việt Nam
        </div>
      </footer>

    </div>
  );
}

export default App
