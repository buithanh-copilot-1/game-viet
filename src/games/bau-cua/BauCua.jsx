import { useState, useEffect } from 'react';
import { playSound } from '../../utils/audio';
import { Coins, RotateCcw, HelpCircle, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

const ANIMALS = [
  { id: 'bau', name: 'Bầu', color: '#e0a96d', svgPath: 'M24 6c-2.5 0-4.5 2-4.5 4.5S21.5 16 23 18c-5 1.5-8 5.5-8 10.5 0 6 5 10.5 9 10.5s9-4.5 9-10.5c0-5-3-9-8-10.5 1.5-2 3.5-5 3.5-7.5C28.5 8 26.5 6 24 6zm0 4c.8 0 1.5.7 1.5 1.5S24.8 13 24 13s-1.5-.7-1.5-1.5S23.2 10 24 10zm0 11c3.9 0 6.5 3.5 6.5 7.5S27.9 36 24 36s-6.5-3.5-6.5-7.5 2.6-7.5 6.5-7.5z' },
  { id: 'cua', name: 'Cua', color: '#ff5252', svgPath: 'M13 14c-1 0-2 1.5-2 3s1 3 2 3v3h-4c-2 0-3 2-3 4s2 3 4 3h1v3c0 2 2 3 4 3s4-1 4-3v-6h4v6c0 2 2 3 4 3s4-1 4-3v-3h1c2 0 4-1 4-3s-1-4-3-4h-4v-3c1 0 2-1.5 2-3s-1-3-2-3c-1.5 0-2.5 1-2.5 2.5v1.5H15.5v-1.5c0-1.5-1-2.5-2.5-2.5zm11 11c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6z' },
  { id: 'tom', name: 'Tôm', color: '#ff793f', svgPath: 'M24 5c-3 0-5 3.5-5 8v2c0 2.5-1.5 4-4 4-2 0-3 1.5-3 3.5s2 3.5 4.5 3.5c4.5 0 6-3.5 6.5-6.5h2c.5 3 2 6.5 6.5 6.5 2.5 0 4.5-1.5 4.5-3.5s-1-3.5-3-3.5c-2.5 0-4-1.5-4-4v-2c0-4.5-2-8-5-8zm-2 5c0-.6.4-1 1-1s1 .4 1 1v1c0 .6-.4 1-1 1s-1-.4-1-1v-1zm5 0c0-.6.4-1 1-1s1 .4 1 1v1c0 .6-.4 1-1 1s-1-.4-1-1v-1zM24 28c-4 0-7 2.5-7 5.5s3 5.5 7 5.5 7-2.5 7-5.5-3-5.5-7-5.5z' },
  { id: 'ca', name: 'Cá', color: '#34ace0', svgPath: 'M10 24c0-6.6 6-12 14-12 5.3 0 10 2.4 12.3 6l5.7-3.6v19.2l-5.7-3.6C34 33.6 29.3 36 24 36c-8 0-14-5.4-14-12zm7.5-3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM28 26c-1.5 0-3-1-4-2s-.5-2 1-2 2 .5 3 1.5.5 2.5 0 2.5z' },
  { id: 'ga', name: 'Gà', color: '#ffb142', svgPath: 'M25 6c-3.3 0-6 2.7-6 6 0 1.5.5 3 1.5 4L14 22c-2.2 0-4 1.8-4 4v8c0 1.1.9 2 2 2h2v4c0 1.1.9 2 2 2s2-.9 2-2v-4h8c2.2 0 4-1.8 4-4v-8l-6.5-6c1-.8 1.5-2 1.5-3.5 0-3.3-2.7-6-6-6zm-1.5 3.5c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zM18 29.5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5z' },
  { id: 'nai', name: 'Nai', color: '#a5b1c2', svgPath: 'M18 6c-1 0-2 1-2 2v2c-2.5-1-5.5.5-6.5 3-.8 2 0 4.5 1.5 5.5v5.5c0 4.4 3.6 8 8 8h10c4.4 0 8-3.6 8-8V24c1.5-1 2.3-3.5 1.5-5.5-1-2.5-4-4-6.5-3v-2c0-1-1-2-2-2h-3l1.5-3.5c.4-1-.2-2.5-1.5-2.5s-2 1-2.5 2.5L25 10.5 23 6h-5zm0 12.5c.8 0 1.5.7 1.5 1.5S18.8 21.5 18 21.5s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5zm12 0c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5z' }
];

const CHIPS = [10, 50, 100, 500];

export default function BauCua({ onBack }) {
  const [coins, setCoins] = useState(() => {
    const saved = localStorage.getItem('bau_cua_coins');
    return saved ? parseInt(saved, 10) : 1000;
  });

  const [bets, setBets] = useState({ bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 });
  const [selectedChip, setSelectedChip] = useState(10);
  const [dice, setDice] = useState(['bau', 'cua', 'tom']);
  const [rolling, setRolling] = useState(false);
  const [bowlClosed, setBowlClosed] = useState(false);
  const [hasShaken, setHasShaken] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('bau_cua_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showRules, setShowRules] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    localStorage.setItem('bau_cua_coins', coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('bau_cua_history', JSON.stringify(history));
  }, [history]);

  const totalBetAmount = Object.values(bets).reduce((a, b) => a + b, 0);

  const placeBet = (id) => {
    if (rolling) return;
    if (bowlClosed && hasShaken) return; // Cannot place bet after shaking but before opening

    if (coins < selectedChip) {
      playSound('lose');
      alert("Bạn không đủ xu để đặt cược này!");
      return;
    }

    playSound('click');
    // Starting a fresh round of betting clears the previous reveal.
    if (lastResult) setLastResult(null);
    if (outcome) setOutcome(null);
    setBets(prev => ({ ...prev, [id]: prev[id] + selectedChip }));
    setCoins(prev => prev - selectedChip);
  };

  const clearBets = () => {
    if (rolling || (bowlClosed && hasShaken)) return;
    playSound('click');
    setCoins(prev => prev + totalBetAmount);
    setBets({ bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 });
  };

  const startShake = () => {
    if (rolling) return;
    if (totalBetAmount === 0 && !bowlClosed) {
      alert("Vui lòng đặt cược trước khi lắc!");
      return;
    }

    playSound('click');
    setRolling(true);
    setBowlClosed(true);
    setHasShaken(true);
    setOutcome(null);
    setLastResult(null);

    // Play rolling loop sound synthetically
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      playSound('roll');
      shakeCount++;
      if (shakeCount > 8) clearInterval(shakeInterval);
    }, 120);

    setTimeout(() => {
      // Pick random results
      const results = [
        ANIMALS[Math.floor(Math.random() * 6)].id,
        ANIMALS[Math.floor(Math.random() * 6)].id,
        ANIMALS[Math.floor(Math.random() * 6)].id
      ];
      setDice(results);
      setRolling(false);
    }, 1500);
  };

  const openBowl = () => {
    if (rolling || !bowlClosed) return;

    setBowlClosed(false);
    
    // Calculate Payouts
    let wonAmount = 0;
    let refundAmount = 0;
    
    // Count occurrences of each symbol
    const counts = {};
    dice.forEach(d => counts[d] = (counts[d] || 0) + 1);

    Object.keys(bets).forEach(id => {
      const betAmount = bets[id];
      if (betAmount > 0) {
        if (counts[id]) {
          // Player won: gets back the bet plus (occurrences * betAmount)
          wonAmount += betAmount * counts[id];
          refundAmount += betAmount;
        }
      }
    });

    const netResult = wonAmount + refundAmount;
    if (netResult > 0) setCoins(prev => prev + netResult);

    // Net change for the player = payout received minus the stake already taken.
    const profit = netResult - totalBetAmount;
    if (totalBetAmount > 0) {
      if (profit > 0) {
        setOutcome({ won: true, text: `Chúc mừng! Bạn thắng +${profit.toLocaleString()} xu` });
        playSound('win');
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
      } else if (profit === 0) {
        setOutcome({ won: true, text: 'Hòa vốn — bạn nhận lại tiền cược.' });
        playSound('win');
      } else {
        setOutcome({ won: false, text: `Rất tiếc! Bạn thua ${profit.toLocaleString()} xu` });
        playSound('lose');
      }
    }

    // Remember the revealed dice so winning animals stay highlighted on the board
    setLastResult(dice);

    // Add to history
    setHistory(prev => [dice, ...prev.slice(0, 9)]);
    
    // Reset state
    setBets({ bau: 0, cua: 0, tom: 0, ca: 0, ga: 0, nai: 0 });
    setHasShaken(false);
  };

  const handleResetCoins = () => {
    playSound('click');
    setCoins(1000);
  };

  return (
    <div className="game-container">
      {/* Header */}
      <div className="game-top-bar">
        <button onClick={onBack} className="btn-back">
          <ArrowLeft size={18} />
        </button>
        <h1 className="game-title">Bầu Cua Tôm Cá</h1>
        <button onClick={() => setShowRules(true)} className="btn-icon-toggle">
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Main Board Layout */}
      <div className="bau-cua-main-area">
        
        {/* Wallet & Bet summary */}
        <div className="widget-panel bc-wallet-panel">
          <div className="bc-stat bc-stat-coins">
            <div className="bc-stat-icon"><Coins size={18} /></div>
            <div className="bc-stat-text">
              <div className="bc-stat-label">Số xu của bạn</div>
              <div className="bc-stat-value">{coins.toLocaleString()}</div>
            </div>
          </div>
          <div className="bc-stat bc-stat-bet">
            <div className="bc-stat-text">
              <div className="bc-stat-label">Tổng đang cược</div>
              <div className="bc-stat-value bc-bet-value">{totalBetAmount.toLocaleString()}</div>
            </div>
          </div>
          {coins === 0 && (
            <button
              onClick={handleResetCoins}
              className="btn-secondary-action bc-refill-btn"
            >
              <RotateCcw size={12} style={{ marginRight: '4px', display: 'inline' }} /> Hồi xu (1000)
            </button>
          )}
        </div>

        {/* Shaker (Lid & Plate / Bowl) */}
        <div className="widget-panel shaker-box">
          <div className="shaker-plate" style={{ animationName: rolling ? 'shake' : 'none', animationDuration: '0.6s', animationIterationCount: 'infinite' }}>
            
            {/* Opened state: Dice are visible */}
            {!bowlClosed && (
              <div className="shaker-dice-holder">
                {dice.map((dieId, idx) => {
                  const item = ANIMALS.find(a => a.id === dieId);
                  return (
                    <div key={idx} className="die-cube">
                      <svg viewBox="0 0 48 48" className="die-svg">
                        <path d={item?.svgPath} fill={item?.color} />
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Closed Bowl / Lid */}
            {bowlClosed && (
              <div className="shaker-lid">
                <div className="lid-inner-pattern">
                  <span className="lid-text">Đang Úp</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', width: '100%', justifyContent: 'center' }}>
            {(!bowlClosed || rolling) ? (
              <button 
                onClick={startShake} 
                disabled={rolling}
                className="btn-primary-action"
                style={{ maxWidth: '160px' }}
              >
                {rolling ? 'Đang Lắc...' : 'Xốc Bát'}
              </button>
            ) : (
              <button 
                onClick={openBowl}
                className="btn-primary-action"
                style={{ maxWidth: '160px', background: 'linear-gradient(135deg, #cfa12b 0%, #99741a 100%)', color: '#0a0505' }}
              >
                Mở Bát
              </button>
            )}
          </div>

          {/* Win/Loss message popup */}
          {outcome && (
            <div className={`win-loss-text-overlay ${outcome.won ? 'is-win' : 'is-lose'}`}>
              {outcome.text}
            </div>
          )}
        </div>

        {/* Chip Selection (Bets chip size) */}
        <div className="widget-panel chip-bar-panel">
          <span className="chip-bar-label">Chọn cược:</span>
          <div className="chip-container">
            {CHIPS.map(val => (
              <button
                key={val}
                onClick={() => { playSound('click'); setSelectedChip(val); }}
                className={`chip-button ${selectedChip === val ? 'selected' : ''}`}
              >
                {val}
              </button>
            ))}
          </div>
          {totalBetAmount > 0 && (
            <button onClick={clearBets} className="btn-secondary-action">
              Hủy Cược
            </button>
          )}
        </div>

        {/* 6 Grid Betting Table */}
        <div className="bau-cua-grid">
          {ANIMALS.map(animal => {
            const hasBet = bets[animal.id] > 0;
            const resultCount = lastResult ? lastResult.filter(d => d === animal.id).length : 0;
            const isWinningResult = resultCount > 0;
            return (
              <button
                key={animal.id}
                onClick={() => placeBet(animal.id)}
                disabled={rolling || (bowlClosed && hasShaken)}
                className={`bau-cua-cell ${hasBet ? 'active-bet' : ''} ${isWinningResult ? 'result-win' : ''}`}
                style={{ '--animal-color': animal.color }}
              >
                {/* Bet quantity display */}
                {hasBet && (
                  <div className="bet-badge">
                    {bets[animal.id]}
                  </div>
                )}

                {/* Result multiplier after the bowl opens */}
                {isWinningResult && (
                  <div className="result-badge">x{resultCount}</div>
                )}

                {/* Animal Icon on a coloured medallion */}
                <div className="cell-icon-holder">
                  <svg viewBox="0 0 48 48" style={{ width: '100%', height: '100%' }}>
                    <path d={animal.svgPath} fill={animal.color} />
                  </svg>
                </div>

                {/* Name */}
                <span className="cell-label">{animal.name}</span>
              </button>
            );
          })}
        </div>

        {/* History / Statistical Rolls */}
        {history.length > 0 && (
          <div className="widget-panel history-panel">
            <span className="history-title">Lịch sử lắc:</span>
            <div className="history-row">
              {history.map((roll, idx) => (
                <div key={idx} className="history-item">
                  {roll.map((dieId, subIdx) => {
                    const item = ANIMALS.find(a => a.id === dieId);
                    return (
                      <div key={subIdx} className="history-die-small">
                        <svg viewBox="0 0 48 48" style={{ width: '14px', height: '14px' }}>
                          <path d={item?.svgPath} fill={item?.color} />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rules Modal Overlay */}
      {showRules && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 className="modal-header">Luật chơi Bầu Cua</h3>
            <div className="modal-body">
              <p>1. Chọn chip cược ở thanh công cụ dưới bàn cờ.</p>
              <p>2. Chạm vào 6 ô linh vật để đặt cược (có thể đặt nhiều ô).</p>
              <p>3. Nhấn <strong>"Xốc Bát"</strong> để úp bát và xốc đĩa xúc xắc.</p>
              <p>4. Nhấn <strong>"Mở Bát"</strong> để mở kết quả và đối chiếu cược.</p>
              <p>5. Trúng linh vật nào nhận lại tiền cược + tiền thắng nhân với số lượng xúc xắc ra ô đó (x1, x2, x3).</p>
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
