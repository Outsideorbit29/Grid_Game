import { useEffect, useState, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MousePointer2, Users, Trophy, LogIn, Volume2, VolumeX, Eye, Flame, Shield, ArrowLeft, ChevronRight } from 'lucide-react';

// Connect to the backend
const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type BlockData = {
  owner: string;
  color: string;
  name: string;
} | null;

type Stats = {
  onlineCount: number;
  activePlayersCount: number;
};

const COLOR_PRESETS = [
  '#00F0FF', // Cyan
  '#FF2E93', // Neon Pink
  '#00FF66', // Neon Green
  '#FF8A00', // Orange
  '#B52EFF', // Purple
  '#FFE600', // Yellow
  '#00FFA3', // Mint
  '#FF003C'  // Neon Red
];

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [grid, setGrid] = useState<BlockData[]>([]);
  const [gridRows, setGridRows] = useState(30);
  const [gridCols, setGridCols] = useState(30);
  
  // Game state navigation: 'landing' | 'playing'
  const [gameState, setGameState] = useState<'landing' | 'playing'>('landing');
  
  // Player session info (null if spectating)
  const [myInfo, setMyInfo] = useState<{ id: string; color: string; name: string } | null>(null);
  const [isSpectator, setIsSpectator] = useState(true);
  
  // Stats
  const [stats, setStats] = useState<Stats>({ onlineCount: 0, activePlayersCount: 0 });
  
  // Form State
  const [nameInput, setNameInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  
  // HUD UI state
  const [hoveredBlock, setHoveredBlock] = useState<{ index: number; data: BlockData } | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Cooldown State
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // in ms
  const cooldownDuration = 2000; // 2 seconds
  const cooldownIntervalRef = useRef<number | null>(null);
  const cooldownEndTimeRef = useRef<number>(0);
  
  // Newly claimed blocks animations
  const [justClaimed, setJustClaimed] = useState<Set<number>>(new Set());

  // Synth sounds generator using Web Audio API
  const playSynthSound = (freq: number, type: 'join' | 'claim' | 'fail' | 'cooldown') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'join') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'claim') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(freq * 1.2, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'cooldown') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('init', (data) => {
      setGrid(data.grid);
      setGridRows(data.gridRows);
      setGridCols(data.gridCols);
    });

    newSocket.on('stats_update', (data: Stats) => {
      setStats(data);
    });

    newSocket.on('joined', (data) => {
      setMyInfo({ id: data.userId, color: data.color, name: data.name });
      setIsSpectator(false);
      setGameState('playing');
      playSynthSound(523.25, 'join');
    });

    newSocket.on('block_updated', (data: { index: number; block: BlockData }) => {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        newGrid[data.index] = data.block;
        return newGrid;
      });

      setJustClaimed((prev) => {
        const next = new Set(prev);
        next.add(data.index);
        return next;
      });
      
      setTimeout(() => {
        setJustClaimed((prev) => {
          const next = new Set(prev);
          next.delete(data.index);
          return next;
        });
      }, 300);
    });

    newSocket.on('error_message', (msg: string) => {
      alert(msg);
    });

    return () => {
      newSocket.disconnect();
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    };
  }, [soundEnabled]);

  const startCooldown = () => {
    cooldownEndTimeRef.current = Date.now() + cooldownDuration;
    setCooldownRemaining(cooldownDuration);

    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    
    cooldownIntervalRef.current = window.setInterval(() => {
      const remaining = cooldownEndTimeRef.current - Date.now();
      if (remaining <= 0) {
        setCooldownRemaining(0);
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
        playSynthSound(880, 'cooldown');
      } else {
        setCooldownRemaining(remaining);
      }
    }, 30);
  };

  const handleBlockClick = (index: number) => {
    if (isSpectator) {
      playSynthSound(150, 'fail');
      setGameState('landing');
      return;
    }

    if (cooldownRemaining > 0) {
      playSynthSound(100, 'fail');
      return;
    }

    if (grid[index]?.owner === myInfo?.id) {
      return;
    }

    if (socket) {
      socket.emit('claim_block', index);
      playSynthSound(659.25, 'claim');
      startCooldown();
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    if (socket) {
      socket.emit('join', {
        name: nameInput.trim(),
        color: selectedColor
      });
    }
  };

  const handleSpectate = () => {
    setIsSpectator(true);
    setMyInfo(null);
    setGameState('playing');
    playSynthSound(523.25, 'join');
  };

  // Compute leaderboard
  const leaderboard = useMemo(() => {
    const counts = new Map<string, { count: number; name: string; color: string }>();
    for (const block of grid) {
      if (block) {
        if (!counts.has(block.owner)) {
          counts.set(block.owner, { count: 0, name: block.name, color: block.color });
        }
        counts.get(block.owner)!.count++;
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [grid]);

  // Compute player's own score
  const myStats = useMemo(() => {
    if (!myInfo) return { count: 0, percentage: '0%' };
    const myCount = grid.filter(b => b?.owner === myInfo.id).length;
    const pct = ((myCount / grid.length) * 100).toFixed(1);
    return { count: myCount, percentage: `${pct}%` };
  }, [grid, myInfo]);

  // View 1: LANDING/HOME PAGE
  if (gameState === 'landing') {
    return (
      <div className="landing-page">
        <div className="landing-background-glow"></div>
        <div className="landing-container">
          
          {/* Hero Branding Section */}
          <div className="landing-hero animate-scale-up">
            <h1 className="hero-title">NeonGrid</h1>
            <p className="hero-description">
              A high-frequency collaborative multiplayer pixel canvas. Stake your claim, compete on the leaderboard, and watch updates pulse in real time.
            </p>
            
            {/* Live statistics */}
            <div className="landing-stats-row">
              <div className="landing-stat-card glass-panel">
                <Users className="stat-icon cyan-glow" size={20} />
                <div className="stat-number">{stats.onlineCount}</div>
                <div className="stat-title">Online Spectators</div>
              </div>
              <div className="landing-stat-card glass-panel">
                <Flame className="stat-icon pink-glow" size={20} />
                <div className="stat-number">{stats.activePlayersCount}</div>
                <div className="stat-title">Active Competitors</div>
              </div>
            </div>

            {/* Feature lists */}
            <div className="landing-features">
              <div className="feature-item">
                <div className="feature-indicator cyan-bg"></div>
                <div className="feature-text">
                  <strong>Instant WebSockets:</strong> Every click is synced instantly across all active boards globally.
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-indicator pink-bg"></div>
                <div className="feature-text">
                  <strong>Click Cooldowns:</strong> Enforced rate-limiting balances the fight and locks out automation.
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-indicator mint-bg"></div>
                <div className="feature-text">
                  <strong>Audio Synthesizer:</strong> Immerse yourself with retro acoustic blips indicating successful claims.
                </div>
              </div>
            </div>
          </div>

          {/* Join / Quick Registration Card */}
          <div className="landing-form-card glass-panel animate-slide-up">
            <h2 className="form-card-title">Join the Board</h2>
            <p className="form-card-subtitle">Set your identity to start paint-claiming blocks.</p>

            <form onSubmit={handleJoin} className="modal-form">
              <div className="input-group">
                <label htmlFor="player-name">Your Nickname</label>
                <input
                  id="player-name"
                  type="text"
                  placeholder="e.g. PixelWarrior"
                  maxLength={16}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                />
              </div>

              <div className="color-picker-group">
                <label>Select Grid Color</label>
                <div className="color-palette">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-pick-circle ${selectedColor === color ? 'active' : ''}`}
                      style={{ 
                        backgroundColor: color,
                        boxShadow: selectedColor === color ? `0 0 14px ${color}` : undefined 
                      }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="primary-btn">
                  Enter Arena
                </button>
                <button 
                  type="button" 
                  className="secondary-btn" 
                  onClick={handleSpectate}
                >
                  Spectate Board
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    );
  }

  // View 2: IN-GAME SCREEN (Fixed Screen-Fit Grid)
  return (
    <div className="game-screen-layout">
      
      {/* Centered Board Wrapper */}
      <div className="grid-wrapper">
        <div 
          className="grid-container" 
          style={{ 
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows: `repeat(${gridRows}, 1fr)` 
          }}
        >
          {grid.map((block, index) => {
            const isMyBlock = block?.owner === myInfo?.id;
            return (
              <div
                key={index}
                className={`block ${block ? 'claimed' : ''} ${justClaimed.has(index) ? 'just-claimed' : ''}`}
                style={{
                  backgroundColor: block ? block.color : undefined,
                  boxShadow: block ? `0 0 8px ${block.color}, inset 0 0 6px rgba(255, 255, 255, 0.2)` : undefined,
                  borderColor: isMyBlock ? '#ffffff' : undefined
                }}
                onClick={() => handleBlockClick(index)}
                onMouseEnter={() => setHoveredBlock({ index, data: block })}
                onMouseLeave={() => setHoveredBlock(null)}
              ></div>
            );
          })}
        </div>
      </div>

      {/* Floating HUD Panels */}
      <div className="hud-container">
        {/* Header & Session Profile Panel */}
        <div className="glass-panel header-panel">
          <div className="header-top">
            <button className="back-home-btn" onClick={() => setGameState('landing')}>
              <ArrowLeft size={16} /> Home
            </button>
            <div className="media-controls">
              <button 
                className="icon-button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Disable Sounds' : 'Enable Sounds'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>
          </div>
          
          <div className="user-profile-bar">
            {isSpectator ? (
              <button className="join-btn-hud animate-pulse-glow" onClick={() => setGameState('landing')}>
                <LogIn size={14} /> Join Game
              </button>
            ) : (
              <div className="user-info">
                <div className="color-swatch" style={{ backgroundColor: myInfo?.color }}></div>
                <span className="profile-name">{myInfo?.name}</span>
                <span className="player-badge">Player</span>
              </div>
            )}
          </div>
        </div>

        {/* Global Live Stats Panel */}
        <div className="glass-panel stats-panel">
          <div className="stat-row">
            <div className="stat-label"><Users size={14} /> Online</div>
            <div className="stat-value">{stats.onlineCount}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label"><Eye size={14} /> Active Players</div>
            <div className="stat-value">{stats.activePlayersCount}</div>
          </div>
          {!isSpectator && (
            <>
              <div className="divider" />
              <div className="stat-row">
                <div className="stat-label">Your Blocks</div>
                <div className="stat-value text-glowing" style={{ color: myInfo?.color }}>{myStats.count}</div>
              </div>
              <div className="stat-row">
                <div className="stat-label">Ownership</div>
                <div className="stat-value">{myStats.percentage}</div>
              </div>
            </>
          )}
        </div>

        {/* Responsive Collapsible Leaderboard */}
        <div className="glass-panel leaderboard-panel">
          <button className="leaderboard-header-toggle" onClick={() => setShowLeaderboard(!showLeaderboard)}>
            <div className="toggle-label">
              <Trophy size={14} /> Leaderboard
            </div>
            <ChevronRight size={16} className={`chevron-icon ${showLeaderboard ? 'rotated' : ''}`} />
          </button>
          
          {showLeaderboard && (
            <div className="leaderboard-content animate-slide-down">
              {leaderboard.length === 0 ? (
                <div className="empty-state">No blocks claimed yet.</div>
              ) : (
                <ul className="leaderboard-list">
                  {leaderboard.map((user, i) => (
                    <li key={i} className="leaderboard-item">
                      <div className="leaderboard-item-name">
                        <span className="rank">#{i + 1}</span>
                        <div className="leaderboard-color" style={{ backgroundColor: user.color }}></div>
                        <span className="lb-name" style={{ fontWeight: user.name === myInfo?.name ? 600 : 400 }}>
                          {user.name} {user.name === myInfo?.name && '(You)'}
                        </span>
                      </div>
                      <span className="leaderboard-score">{user.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cooldown Overlay */}
      {cooldownRemaining > 0 && (
        <div className="cooldown-wrapper">
          <div className="cooldown-hud glass-panel">
            <span className="cooldown-text">RECHARGING</span>
            <div className="cooldown-bar-container">
              <div 
                className="cooldown-bar-fill" 
                style={{ 
                  width: `${(cooldownRemaining / cooldownDuration) * 100}%`,
                  backgroundColor: myInfo?.color || '#00F0FF',
                  boxShadow: `0 0 10px ${myInfo?.color || '#00F0FF'}`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Hover Tooltip */}
      {hoveredBlock && hoveredBlock.data && (
        <div className="hover-tooltip glass-panel animate-fade-in">
          <div className="tooltip-color-swatch" style={{ backgroundColor: hoveredBlock.data.color }}></div>
          <div className="tooltip-details">
            <span className="tooltip-owner">{hoveredBlock.data.name}</span>
            <span className="tooltip-pos">Index: {hoveredBlock.index}</span>
          </div>
        </div>
      )}

      {/* Spectator Indicator at Screen Bottom */}
      {isSpectator && (
        <div className="spectator-hud glass-panel animate-slide-up">
          <span>You are currently spectating</span>
          <button className="join-now-btn" onClick={() => setGameState('landing')}>
            Join Game
          </button>
        </div>
      )}

      {/* Action Instructions */}
      <div className="controls-help">
        <div className="control-item">
          <MousePointer2 size={14} /> Click to claim
        </div>
        <div className="control-item">
          <Shield size={14} /> 2s cooldown between clicks
        </div>
      </div>
    </div>
  );
}
