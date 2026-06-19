import { useState } from 'react';
import { ArrowLeft, Link, LogIn, Plus } from 'lucide-react';
import { io } from 'socket.io-client';
import { playSound } from '../utils/audio';

const GAME_LABELS = {
  'co-ca-ro': 'Cờ Ca Rô',
  'o-an-quan': 'Ô Ăn Quan',
};

const getOnlineServerUrl = () => {
  if (import.meta.env.VITE_ONLINE_SERVER_URL) {
    return import.meta.env.VITE_ONLINE_SERVER_URL;
  }

  const { protocol, hostname, port } = window.location;
  if (port && port !== '3000') {
    return `${protocol}//${hostname}:3000`;
  }

  return window.location.origin;
};

export default function OnlineRoom({ gameId, onCancel, onReady }) {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const serverUrl = getOnlineServerUrl();

  const connectSocket = () => io(serverUrl, {
    transports: ['websocket', 'polling'],
  });

  const handleSocketError = (socket) => {
    socket.on('connect_error', () => {
      setStatus('Không kết nối được realtime server. Hãy chạy npm run server.');
      setIsBusy(false);
      socket.disconnect();
    });
  };

  const enterRoom = (socket, response) => {
    if (!response?.ok) {
      setStatus(response?.error || 'Không thể vào phòng.');
      setIsBusy(false);
      socket.disconnect();
      return;
    }

    playSound('click');
    onReady({
      socket,
      serverUrl,
      gameId: response.gameId || gameId,
      roomCode: response.roomCode,
      playerRole: response.playerRole,
      players: response.players || [],
      initialState: response.state,
    });
  };

  const createRoom = () => {
    setIsBusy(true);
    setStatus('Đang tạo phòng...');
    const socket = connectSocket();
    handleSocketError(socket);
    socket.emit('createRoom', { gameId }, (response) => enterRoom(socket, response));
  };

  const joinRoom = () => {
    const normalizedCode = roomCode.trim();
    if (!normalizedCode) {
      setStatus('Nhập mã phòng trước nhé.');
      return;
    }

    setIsBusy(true);
    setStatus('Đang vào phòng...');
    const socket = connectSocket();
    handleSocketError(socket);
    socket.emit('joinRoom', { roomCode: normalizedCode }, (response) => enterRoom(socket, response));
  };

  return (
    <div className="game-container">
      <div className="game-top-bar">
        <button onClick={onCancel} className="btn-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="game-title">{GAME_LABELS[gameId]} Online</h1>
        <span className="online-server-dot" title={serverUrl} />
      </div>

      <main className="online-room-panel">
        <div className="online-room-card">
          <div className="online-room-heading">
            <Link size={24} />
            <div>
              <h2>Chơi cùng bạn bè</h2>
              <p>Tạo phòng rồi gửi mã cho người thứ 2.</p>
            </div>
          </div>

          <button onClick={createRoom} disabled={isBusy} className="btn-primary-action">
            <Plus size={16} /> Tạo phòng mới
          </button>

          <div className="online-room-divider">
            <span>hoặc</span>
          </div>

          <div className="online-join-row">
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="online-room-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="Mã phòng"
            />
            <button onClick={joinRoom} disabled={isBusy} className="btn-secondary-action online-join-btn">
              <LogIn size={14} /> Vào
            </button>
          </div>

          {status && <div className="online-room-status">{status}</div>}
        </div>
      </main>
    </div>
  );
}
