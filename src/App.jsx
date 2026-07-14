import { useState, useEffect, useRef } from 'react'
import OAnQuan from './games/o-an-quan/OAnQuan'
import BauCua from './games/bau-cua/BauCua'
import CoCaRo from './games/co-ca-ro/CoCaRo'
import MaTran from './games/ma-tran/MaTran'
import CoVua from './games/co-vua/CoVua'
import OnlineRoom from './online/OnlineRoom'
import { playSound, toggleSound, isSoundEnabled, toggleMusic, isMusicEnabled, startMusic } from './utils/audio'
import { Volume2, VolumeX, Music, Gamepad2, Info, Wifi, ChevronRight } from 'lucide-react'

const GAMES = [
  {
    id: 'o-an-quan', art: 'OQ', accent: '#cfa12b', online: true,
    title: 'Ô Ăn Quan',
    desc: 'Rải sỏi ăn quan chiến thuật, tính toán ăn dồn dập áp đảo đối phương.',
    tags: ['Đấu máy · 3 mức', '2 người', 'Online'],
  },
  {
    id: 'bau-cua', art: 'BC', accent: '#ff5252', online: false,
    title: 'Bầu Cua Tôm Cá',
    desc: 'Đoán linh vật xúc xắc ngày Tết, xốc đĩa lắc bát cực vui.',
    tags: ['May rủi', 'Cược xu'],
  },
  {
    id: 'co-ca-ro', art: 'XO', accent: '#4dc3ff', online: true,
    title: 'Cờ Ca Rô',
    desc: 'Gomoku 5 quân thắng hàng, đấu trí với máy hoặc bạn bè.',
    tags: ['Đấu máy · 3 mức', '2 người', 'Online'],
  },
  {
    id: 'ma-tran', art: '3D', accent: '#9b6dff', online: false,
    title: 'Ma Trận Lập Phương',
    desc: 'Lật khối 3D khéo léo để lọt hố đích, tránh rơi khỏi khoảng không.',
    tags: ['Giải đố 3D', '12 màn'],
  },
  {
    id: 'co-vua', art: '♛', accent: '#cfa12b', online: false,
    title: 'Cờ Vua',
    desc: 'Chiếu hết vua đối phương với chiến thuật đỉnh cao, đấu máy 5 cấp độ.',
    tags: ['Đấu máy · 5 cấp', '2 người'],
  },
];

function App() {
  const [currentGame, setCurrentGame] = useState(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [musicOn, setMusicOn] = useState(isMusicEnabled());
  const [onlineGameId, setOnlineGameId] = useState(null);
  const [onlineSession, setOnlineSession] = useState(null);
  const musicStarted = useRef(false);

  // Start music on first user interaction (browsers require gesture before audio)
  useEffect(() => {
    const start = () => {
      if (!musicStarted.current && isMusicEnabled()) {
        musicStarted.current = true;
        startMusic();
      }
    };
    document.addEventListener('click', start, { once: true });
    return () => document.removeEventListener('click', start);
  }, []);

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) playSound('click');
  };

  const handleToggleMusic = () => {
    const newState = toggleMusic();
    setMusicOn(newState);
    if (newState) musicStarted.current = true;
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
  if (currentGame === 'co-vua') {
    return <CoVua onBack={leaveCurrentGame} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-badge">VN</div>
          <span className="brand-title">Folk Games</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleToggleMusic} className="btn-icon-toggle"
            title={musicOn ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
            style={{ opacity: musicOn ? 1 : 0.35 }}>
            <Music size={18} />
          </button>
          <button onClick={handleToggleSound} className="btn-icon-toggle">
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
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
          {GAMES.map((game) => (
            <div key={game.id} className="game-card-wrapper" style={{ '--card-accent': game.accent }}>
              <button onClick={() => selectGame(game.id)} className="game-card">
                <div className="game-card-art">{game.art}</div>
                <div className="game-card-info">
                  <span className="game-card-title">{game.title}</span>
                  <span className="game-card-desc">{game.desc}</span>
                  <div className="game-card-tags">
                    {game.tags.map((tag) => (
                      <span key={tag} className="game-tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={20} className="game-card-arrow" />
              </button>
              {game.online && (
                <button
                  onClick={() => selectOnlineGame(game.id)}
                  className="game-card-online"
                >
                  <Wifi size={12} /> Online
                </button>
              )}
            </div>
          ))}
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
