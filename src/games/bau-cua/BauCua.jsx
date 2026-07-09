import { useState } from 'react';
import { playSound } from '../../utils/audio';
import { RotateCcw, HelpCircle, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ANIMALS } from './animals';

const CHIPS = [
  { value: 10,  label: '10',  dataVal: '10'  },
  { value: 50,  label: '50',  dataVal: '50'  },
  { value: 100, label: '100', dataVal: '100' },
  { value: 500, label: '500', dataVal: '500' },
];

export default function BauCua({ onBack }) {
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('bau_cua_coins');
    return saved ? parseInt(saved, 10) : 1000;
  });
  const [bets, setBets]           = useState({});
  const [selectedChip, setSelectedChip] = useState(50);
  const [dice, setDice]           = useState(['bau', 'cua', 'tom']);
  const [rolling, setRolling]     = useState(false);
  const [resultLine, setResultLine] = useState({ text: 'Chọn con vật rồi đặt cược!', cls: '' });
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory]     = useState(() => {
    const saved = localStorage.getItem('bau_cua_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showRules, setShowRules] = useState(false);
  const save = (newCoins, newHistory) => {
    localStorage.setItem('bau_cua_coins', String(newCoins));
    if (newHistory) localStorage.setItem('bau_cua_history', JSON.stringify(newHistory));
  };

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  const placeBet = (id) => {
    if (rolling) return;
    if (coins < selectedChip) {
      playSound('lose');
      setResultLine({ text: 'Không đủ xu cho mức cược này.', cls: 'lose' });
      return;
    }
    playSound('click');
    setLastResult(null);
    setBets(prev => ({ ...prev, [id]: (prev[id] || 0) + selectedChip }));
    setCoins(prev => {
      const next = prev - selectedChip;
      save(next);
      return next;
    });
  };

  const clearBets = () => {
    if (rolling) return;
    playSound('click');
    setCoins(prev => {
      const next = prev + totalBet;
      save(next);
      return next;
    });
    setBets({});
    setLastResult(null);
    setResultLine({ text: 'Đã hoàn lại toàn bộ cược.', cls: '' });
  };

  const shake = () => {
    if (rolling) return;
    if (totalBet === 0) {
      setResultLine({ text: 'Hãy đặt ít nhất một cược trước khi lắc.', cls: '' });
      return;
    }
    playSound('click');
    setRolling(true);
    setLastResult(null);
    setResultLine({ text: 'Đang lắc…', cls: '' });

    const spinInterval = setInterval(() => {
      playSound('roll');
      setDice([
        ANIMALS[Math.floor(Math.random() * 6)].id,
        ANIMALS[Math.floor(Math.random() * 6)].id,
        ANIMALS[Math.floor(Math.random() * 6)].id,
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(spinInterval);
      const roll = Array.from({ length: 3 }, () => ANIMALS[Math.floor(Math.random() * 6)].id);
      setDice(roll);
      setRolling(false);
      setLastResult(roll);
      settle(roll);
    }, 1200);
  };

  const settle = (roll) => {
    const counts = {};
    roll.forEach(k => { counts[k] = (counts[k] || 0) + 1; });

    let winnings = 0;
    Object.entries(bets).forEach(([id, stake]) => {
      if (counts[id]) winnings += stake + stake * counts[id];
    });

    const currentBets = { ...bets };
    setBets({});

    setCoins(prev => {
      const next = prev + winnings;
      const newHistory = [roll, ...history.slice(0, 9)];
      setHistory(newHistory);
      save(next, newHistory);
      return next;
    });

    const names = roll.map(k => ANIMALS.find(a => a.id === k).name).join(' · ');
    const hadBets = Object.values(currentBets).some(v => v > 0);
    if (winnings > 0) {
      const profit = winnings - Object.values(currentBets).reduce((a, b) => a + b, 0);
      const msg = profit > 0
        ? `${names} — Thắng +${profit.toLocaleString()} xu! 🎉`
        : `${names} — Hòa vốn!`;
      setResultLine({ text: msg, cls: 'win' });
      playSound('win');
      confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
    } else if (hadBets) {
      setResultLine({ text: `${names} — Chúc may mắn lần sau.`, cls: 'lose' });
      playSound('lose');
    }
  };

  const handleReset = () => {
    playSound('click');
    const next = 1000;
    setBets({});
    setLastResult(null);
    setHistory([]);
    setResultLine({ text: 'Ví đã được nạp lại. Chúc may mắn!', cls: '' });
    setCoins(next);
    save(next, []);
  };

  return (
    <div className="game-container">
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back"><ArrowLeft size={18} /></button>
        <h1 className="game-title">Bầu Cua Tôm Cá</h1>
        <button onClick={() => setShowRules(true)} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      <div className="bau-cua-main-area">

        {/* Purse */}
        <div className="bc-purse">
          <div>
            <div className="bc-purse-label">Số dư</div>
            <div className="bc-purse-amount">{coins.toLocaleString()} xu</div>
          </div>
          {totalBet > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div className="bc-purse-label">Đang cược</div>
              <div className="bc-purse-amount" style={{ color: '#7e1522' }}>{totalBet.toLocaleString()} xu</div>
            </div>
          )}
          {coins === 0 && (
            <button onClick={handleReset} className="bc-refill-btn">
              <RotateCcw size={12} style={{ marginRight: 4 }} /> Nạp lại
            </button>
          )}
        </div>

        {/* Lacquer tray: grid + dice */}
        <div className="bc-tray">

          {/* 3×2 betting grid */}
          <div className="bau-cua-grid">
            {ANIMALS.map(animal => {
              const betAmt = bets[animal.id] || 0;
              const resultCount = lastResult ? lastResult.filter(d => d === animal.id).length : 0;
              return (
                <button
                  key={animal.id}
                  onClick={() => placeBet(animal.id)}
                  disabled={rolling}
                  className={`bau-cua-cell ${betAmt > 0 ? 'active-bet' : ''} ${resultCount > 0 ? 'result-win' : ''}`}
                >
                  {betAmt > 0 && <div className="bet-badge">{betAmt.toLocaleString()}</div>}
                  {resultCount > 0 && <div className="result-badge">x{resultCount}</div>}
                  <span className="cell-emoji">{animal.emoji}</span>
                  <span className="cell-label">{animal.name}</span>
                  <span className={`cell-bet-line ${betAmt === 0 ? 'empty' : ''}`}>
                    {betAmt > 0 ? `${betAmt.toLocaleString()} xu` : 'Đặt cược'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dice + shake */}
          <div className="bc-bowl-area">
            <div className="bc-dice-row">
              {dice.map((id, i) => {
                const animal = ANIMALS.find(a => a.id === id);
                return (
                  <div key={i} className={`bc-die ${rolling ? 'rolling' : ''}`}>
                    {animal?.emoji}
                  </div>
                );
              })}
            </div>

            <button className="bc-shake-btn" onClick={shake} disabled={rolling}>
              {rolling ? 'Đang lắc…' : 'Lắc xúc xắc 🎲'}
            </button>

            <div className={`bc-result-line ${resultLine.cls}`}>{resultLine.text}</div>
          </div>
        </div>

        {/* Chip selector */}
        <div className="bc-chip-row">
          {CHIPS.map(c => (
            <button
              key={c.value}
              data-val={c.dataVal}
              onClick={() => { playSound('click'); setSelectedChip(c.value); }}
              className={`bc-chip ${selectedChip === c.value ? 'selected' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="bc-controls-row">
          {totalBet > 0 && (
            <button onClick={clearBets} className="bc-ghost-btn">Xóa cược</button>
          )}
          {coins <= 0 && (
            <button onClick={handleReset} className="bc-ghost-btn">
              <RotateCcw size={12} style={{ marginRight: 4 }} />Nạp lại 1000 xu
            </button>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="bc-history">
            <div className="bc-history-title">Kết quả gần đây</div>
            <div className="bc-history-list">
              {history.map((roll, i) => (
                <span
                  key={i}
                  className="bc-history-roll"
                  title={roll.map(k => ANIMALS.find(a => a.id === k).name).join(' · ')}
                >
                  {roll.map(k => ANIMALS.find(a => a.id === k).emoji).join('')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Bầu Cua</h3>
            <div className="modal-body">
              <p>1. Chọn mức cược ở hàng chip bên dưới.</p>
              <p>2. Nhấn vào ô linh vật để đặt cược (có thể đặt nhiều ô).</p>
              <p>3. Nhấn <strong>"Lắc xúc xắc"</strong> để quay 3 con xúc xắc.</p>
              <p>4. Trúng linh vật → nhận lại tiền cược + thưởng nhân số lần xuất hiện (x1, x2, x3).</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => { playSound('click'); setShowRules(false); }} className="btn-primary-action">
                Đồng Ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
