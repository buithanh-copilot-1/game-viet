import { useState, useEffect } from 'react';
import { playSound } from '../../utils/audio';
import { Coins, RotateCcw, HelpCircle, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ANIMALS } from './animals';
import { AnimalIcon } from './AnimalIcon';
import ShakerBowl from './ShakerBowl';

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
                      <AnimalIcon id={dieId} color={item?.color} className="die-svg" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Closed Bowl / Lid */}
            {bowlClosed && (
              <div className="shaker-lid">
                <ShakerBowl />
                <span className="lid-text">Đang Úp</span>
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
                  <AnimalIcon id={animal.id} color={animal.color} style={{ width: '100%', height: '100%' }} />
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
                        <AnimalIcon id={dieId} color={item?.color} style={{ width: '14px', height: '14px' }} />
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
