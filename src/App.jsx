import { useState } from 'react'
import OAnQuan from './games/o-an-quan/OAnQuan'
import BauCua from './games/bau-cua/BauCua'
import CoCaRo from './games/co-ca-ro/CoCaRo'
import MaTran from './games/ma-tran/MaTran'
import OnlineRoom from './online/OnlineRoom'
import { playSound, toggleSound, isSoundEnabled } from './utils/audio'
import { Volume2, VolumeX, Gamepad2, Info, Wifi } from 'lucide-react'

function App() {
  const [currentGame, setCurrentGame] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [onlineGameId, setOnlineGameId] = useState(null);
  const [onlineSession, setOnlineSession] = useState(null);

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

  const selectOnlineGame = (gameId) => {
    playSound('click');
    setOnlineGameId(gameId);
  };

  const leaveCurrentGame = () => {
    playSound('click');
    onlineSession?.socket?.emit('leaveRoom');
    onlineSession?.socket?.disconnect();
    setOnlineSession(null);
    setOnlineGameId(null);
    setCurrentGame(null);
  };

  const startOnlineGame = (session) => {
    setOnlineSession(session);
    setOnlineGameId(null);
    setCurrentGame(session.gameId);
  };

  if (onlineGameId) {
    return (
      <OnlineRoom
        gameId={onlineGameId}
        onCancel={() => { playSound('click'); setOnlineGameId(null); }}
        onReady={startOnlineGame}
      />
    );
  }

  if (currentGame === 'o-an-quan') {
    return <OAnQuan onBack={leaveCurrentGame} onlineSession={onlineSession} />;
  }
  if (currentGame === 'bau-cua') {
    return <BauCua onBack={leaveCurrentGame} />;
  }
  if (currentGame === 'co-ca-ro') {
    return <CoCaRo onBack={leaveCurrentGame} onlineSession={onlineSession} />;
  }
  if (currentGame === 'ma-tran') {
    return <MaTran onBack={leaveCurrentGame} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge">VN</div>
          <span className="brand-title">Folk Games</span>
        </div>

        <button onClick={handleToggleSound} className="btn-icon-toggle">
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </header>

      <main className="lobby-main">
        <div className="lobby-hero">
          <div className="lobby-badge-container">
            <Gamepad2 className="text-yellow-500 w-7 h-7" />
          </div>
          <h1 className="lobby-title">Game Dân Gian</h1>
          <p className="lobby-subtitle">Cổng trò chơi Việt Nam</p>
        </div>

        <div className="game-card-list">
          <div className="game-card-wrapper">
            <button onClick={() => selectGame('o-an-quan')} className="game-card">
              <div className="game-card-info">
                <span className="game-card-title">Ô Ăn Quan</span>
                <span className="game-card-desc">
                  Rải sỏi ăn quan chiến thuật, tính toán ăn dồn dập thắng áp đảo đối phương.
                </span>
              </div>
              <div className="game-card-art">OQ</div>
            </button>
            <button onClick={() => selectOnlineGame('o-an-quan')} className="btn-secondary-action game-card-online">
              <Wifi size={13} /> Online
            </button>
          </div>

          <button onClick={() => selectGame('bau-cua')} className="game-card">
            <div className="game-card-info">
              <span className="game-card-title">Bầu Cua Tôm Cá</span>
              <span className="game-card-desc">
                Thử tài đoán linh vật xúc xắc ngày Tết, âm thanh xốc đĩa bát lắc cực vui.
              </span>
            </div>
            <div className="game-card-art">BC</div>
          </button>

          <div className="game-card-wrapper">
            <button onClick={() => selectGame('co-ca-ro')} className="game-card">
              <div className="game-card-info">
                <span className="game-card-title">Cờ Ca Rô</span>
                <span className="game-card-desc">
                  Gomoku 5 quân thắng hàng đấu trí với Máy, 2 người cùng máy hoặc chơi online.
                </span>
              </div>
              <div className="game-card-art">XO</div>
            </button>
            <button onClick={() => selectOnlineGame('co-ca-ro')} className="btn-secondary-action game-card-online">
              <Wifi size={13} /> Online
            </button>
          </div>

          <button onClick={() => selectGame('ma-tran')} className="game-card">
            <div className="game-card-info">
              <span className="game-card-title">Ma Trận Lập Phương</span>
              <span className="game-card-desc">
                Lật khối lập phương 3D khéo léo để lọt hố đích, tránh rơi khỏi khoảng không.
              </span>
            </div>
            <div className="game-card-art">3D</div>
          </button>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-info">
          <Info size={11} /> Tối ưu cho thiết bị di động dọc
        </div>
        <div>
          © 2026 Cổng Game Dân Gian Việt Nam
        </div>
      </footer>
    </div>
  );
}

export default App
