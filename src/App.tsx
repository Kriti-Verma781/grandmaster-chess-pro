import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Lightbulb, RotateCcw, X, ChevronLeft, Volume2, VolumeX, Play, Users, Puzzle, GraduationCap, Undo2 } from 'lucide-react';

type PieceColor = 'white' | 'black';
type PieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

interface Piece {
  type: PieceType;
  color: PieceColor;
}

type Board = (Piece | null)[][];

interface Square {
  r: number;
  c: number;
}

interface Move {
  from: Square;
  to: Square;
}

const PIECES_MAP: Record<PieceColor, Record<PieceType, string>> = {
  white: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  black: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }
};

const HINDI_NAMES: Record<PieceType, string> = {
  k: 'RAJA', q: 'RANI', r: 'HAATHI', b: 'OONT', n: 'GHODA', p: 'PYADA'
};

const MOVE_DEFINITIONS: Record<PieceType, string> = {
  k: "The King is the most vital piece. It moves only one square in any direction. If your King is captured, the game is over.",
  q: "The Queen is the most powerful piece. It can move any number of squares in any direction—straight or diagonal.",
  r: "The Rook moves any number of squares along horizontal or vertical paths. It is excellent for controlling long ranks and files.",
  b: "The Bishop moves any number of squares diagonally. It always remains on squares of the same color it started on.",
  n: "The Knight moves in an 'L' shape: two squares in one direction and then one square perpendicular. It can jump over other pieces.",
  p: "The Pawn moves forward one square at a time (two on first move). It captures diagonally and can be promoted at the end."
};

const CONCEPT_DEFINITIONS: Record<string, { title: string; desc: string }> = {
  capturing: {
    title: "CAPTURING",
    desc: "Capturing occurs when a piece moves to a square occupied by an opponent's piece. The captured piece is then removed from the board."
  },
  notation: {
    title: "NOTATION",
    desc: "Chess notation is the language of the game. Algebraic notation uses coordinates (a-h, 1-8) to record every move made by both players."
  }
};

const FallingBackground = () => {
  const pieces = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.15] z-0">
      {Array(40).fill(null).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: -100, rotate: 0 }}
          animate={{ 
            y: '110vh', 
            rotate: 360,
          }}
          transition={{ 
            duration: Math.random() * 20 + 20, 
            repeat: Infinity, 
            ease: "linear",
            delay: Math.random() * -40
          }}
          className="absolute text-5xl text-gold-primary"
          style={{ left: `${Math.random() * 100}%` }}
        >
          {pieces[Math.floor(Math.random() * pieces.length)]}
        </motion.div>
      ))}
    </div>
  );
};

export default function App() {
  const [screen, setScreen] = useState<'loading' | 'home' | 'side-select' | 'learn' | 'piece-detail' | 'puzzles' | 'game'>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  console.log("App rendering, screen:", screen);
  const [gameMode, setGameMode] = useState<'ai' | 'pvp'>('ai');
  const [playerColor, setPlayerColor] = useState<PieceColor>('white');
  const [board, setBoard] = useState<Board>([]);
  const [turn, setTurn] = useState<PieceColor>('white');
  const [selectedSq, setSelectedSq] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [hintsLeft, setHintsLeft] = useState(5);
  const [activeHint, setActiveHint] = useState<Move | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [detailPiece, setDetailPiece] = useState<PieceType | null>(null);
  const [detailConcept, setDetailConcept] = useState<string | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [history, setHistory] = useState<Board[]>([]);
  const [modal, setModal] = useState<{ type: 'quit' | 'reset' | 'win' | null }>({ type: null });

  const audioCtx = useRef<AudioContext | null>(null);
  const gameMusic = useRef<HTMLAudioElement | null>(null);
  const bgGain = useRef<GainNode | null>(null);

  useEffect(() => {
    if (screen === 'loading') {
      const duration = 5000; // 5 seconds
      const interval = 50;
      const step = (interval / duration) * 100;
      
      const timer = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => setScreen('home'), 200);
            return 100;
          }
          return prev + step;
        });
      }, interval);
      return () => clearInterval(timer);
    }
  }, [screen]);

  useEffect(() => {
    if (!gameMusic.current) {
      gameMusic.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      gameMusic.current.loop = true;
      gameMusic.current.volume = 0.15;
    }

    const shouldPlayMusic = soundEnabled && screen !== 'loading' && (screen !== 'game' || !hasMoved);
    
    const playMusic = async () => {
      if (!gameMusic.current) return;
      if (shouldPlayMusic) {
        if (gameMusic.current.paused) {
          try {
            await gameMusic.current.play();
          } catch (err) {
            const handleInteraction = async () => {
              try {
                if (gameMusic.current && gameMusic.current.paused) {
                  await gameMusic.current.play();
                }
                window.removeEventListener('click', handleInteraction);
                window.removeEventListener('touchstart', handleInteraction);
              } catch (e) {}
            };
            window.addEventListener('click', handleInteraction);
            window.addEventListener('touchstart', handleInteraction);
          }
        }
      } else {
        if (!gameMusic.current.paused) {
          gameMusic.current.pause();
        }
      }
    };

    playMusic();
  }, [screen, hasMoved, soundEnabled]);

  const initAudio = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (soundEnabled) {
        bgGain.current = audioCtx.current.createGain();
        bgGain.current.connect(audioCtx.current.destination);
        bgGain.current.gain.setValueAtTime(0, audioCtx.current.currentTime);
        bgGain.current.gain.linearRampToValueAtTime(0.04, audioCtx.current.currentTime + 2);
        const osc = audioCtx.current.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, audioCtx.current.currentTime);
        osc.connect(bgGain.current);
        osc.start();
      }
    } else if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
  }, [soundEnabled]);

  const playSfx = useCallback((type: 'move' | 'capture' | 'start' | 'win' | 'click') => {
    if (!soundEnabled || !audioCtx.current) return;
    const now = audioCtx.current.currentTime;
    const g = audioCtx.current.createGain();
    g.connect(audioCtx.current.destination);
    const o = audioCtx.current.createOscillator();
    if (type === 'move') {
      o.type = 'sine';
      o.frequency.setValueAtTime(440, now);
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    } else if (type === 'capture') {
      o.type = 'triangle';
      o.frequency.setValueAtTime(200, now);
      g.gain.setValueAtTime(0.6, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    } else if (type === 'click') {
      o.type = 'sine';
      o.frequency.setValueAtTime(800, now);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    } else if (type === 'start') {
      o.type = 'square';
      o.frequency.setValueAtTime(250, now);
      o.frequency.linearRampToValueAtTime(500, now + 0.3);
      g.gain.setValueAtTime(0.05, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    } else if (type === 'win') {
      o.type = 'sine';
      o.frequency.setValueAtTime(523, now);
      o.frequency.linearRampToValueAtTime(1046, now + 0.5);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    }
    o.connect(g);
    o.start();
    o.stop(now + 0.6);
  }, [soundEnabled]);

  const getMoves = useCallback((r: number, c: number, b: Board): Square[] => {
    const p = b[r][c];
    if (!p) return [];
    const m: Square[] = [];
    const d = p.color === 'white' ? -1 : 1;

    if (p.type === 'p') {
      if (!b[r + d]?.[c]) m.push({ r: r + d, c });
      if (b[r + d]?.[c + 1]?.color && b[r + d][c + 1]?.color !== p.color) m.push({ r: r + d, c: c + 1 });
      if (b[r + d]?.[c - 1]?.color && b[r + d][c - 1]?.color !== p.color) m.push({ r: r + d, c: c - 1 });
      // Initial double move
      if ((p.color === 'white' && r === 6) || (p.color === 'black' && r === 1)) {
        if (!b[r + d]?.[c] && !b[r + 2 * d]?.[c]) m.push({ r: r + 2 * d, c });
      }
    } else {
      const dirs: Record<string, number[][]> = {
        r: [[0, 1], [0, -1], [1, 0], [-1, 0]],
        b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
        n: [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]],
        q: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
        k: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      };
      dirs[p.type].forEach(dir => {
        let nr = r + dir[0], nc = c + dir[1];
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (!b[nr][nc]) m.push({ r: nr, c: nc });
          else {
            if (b[nr][nc]?.color !== p.color) m.push({ r: nr, c: nc });
            break;
          }
          if (p.type === 'n' || p.type === 'k') break;
          nr += dir[0];
          nc += dir[1];
        }
      });
    }
    return m;
  }, []);

  const resetBoard = useCallback(() => {
    const newBoard: Board = Array(8).fill(null).map(() => Array(8).fill(null));
    const layout: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let i = 0; i < 8; i++) {
      newBoard[0][i] = { type: layout[i], color: 'black' };
      newBoard[1][i] = { type: 'p', color: 'black' };
      newBoard[6][i] = { type: 'p', color: 'white' };
      newBoard[7][i] = { type: layout[i], color: 'white' };
    }
    setBoard(newBoard);
    setTurn('white');
    setSelectedSq(null);
    setValidMoves([]);
    setActiveHint(null);
    setIsGameOver(false);
    setWinner(null);
    setHasMoved(false);
    setHistory([]);
  }, []);

  const undoMove = useCallback(() => {
    if (history.length === 0 || isGameOver) return;
    
    if (gameMode === 'ai') {
      // Only allow undoing the user's move BEFORE the AI responds
      if (turn === 'black') {
        setBoard(prev => {
          const lastState = history[history.length - 1];
          setHistory(h => h.slice(0, -1));
          setTurn('white');
          return lastState;
        });
      }
      // If it's the user's turn (turn === 'white'), the computer has already moved.
      // We do nothing here because "computer ki giti undo nhi honi chahiye".
    } else {
      // 2-player mode: undo 1 step at a time
      setBoard(prev => {
        const lastState = history[history.length - 1];
        setHistory(h => h.slice(0, -1));
        setTurn(t => t === 'white' ? 'black' : 'white');
        return lastState;
      });
    }
  }, [history, isGameOver, gameMode, turn]);

  const executeMove = useCallback((fr: number, fc: number, tr: number, tc: number) => {
    setBoard(prev => {
      setHistory(h => [...h, prev.map(row => [...row])]);
      const newBoard = prev.map(row => [...row]);
      const p = newBoard[fr][fc];
      const target = newBoard[tr][tc];

      if (target) playSfx('capture');
      else playSfx('move');

      if (target?.type === 'k') {
        setIsGameOver(true);
        setWinner(p!.color);
        setModal({ type: 'win' });
        playSfx('win');
        if (p!.color === 'white') setCurrentLevel(l => l + 1);
      }

      newBoard[tr][tc] = p;
      newBoard[fr][fc] = null;
      return newBoard;
    });

    setHasMoved(true);
    setTurn(t => t === 'white' ? 'black' : 'white');
    setSelectedSq(null);
    setValidMoves([]);
    setActiveHint(null);
  }, [playSfx]);

  const aiMove = useCallback(() => {
    const moves: Move[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.color === 'black') {
          getMoves(r, c, board).forEach(m => moves.push({ from: { r, c }, to: m }));
        }
      }
    }
    if (moves.length) {
      const m = moves[Math.floor(Math.random() * moves.length)];
      executeMove(m.from.r, m.from.c, m.to.r, m.to.c);
    }
  }, [board, executeMove, getMoves]);

  useEffect(() => {
    if (!isGameOver && gameMode === 'ai' && turn === 'black') {
      const timer = setTimeout(aiMove, 2000);
      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, isGameOver, aiMove]);

  const handleSqClick = (r: number, c: number) => {
    if (isGameOver) return;
    initAudio();
    const move = validMoves.find(m => m.r === r && m.c === c);
    if (selectedSq && move) {
      executeMove(selectedSq.r, selectedSq.c, r, c);
    } else if (board[r][c]?.color === turn) {
      setSelectedSq({ r, c });
      setValidMoves(getMoves(r, c, board));
    } else {
      setSelectedSq(null);
      setValidMoves([]);
    }
  };

  const startGame = (mode: 'ai' | 'pvp', side: PieceColor = 'white') => {
    setGameMode(mode);
    setPlayerColor(side);
    setHintsLeft(5);
    setScreen('game');
    playSfx('start');
    resetBoard();
  };

  const useHint = () => {
    if (hintsLeft <= 0 || turn !== 'white' || isGameOver) return;
    const allMoves: Move[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.color === 'white') {
          getMoves(r, c, board).forEach(m => allMoves.push({ from: { r, c }, to: m }));
        }
      }
    }
    if (allMoves.length) {
      setHintsLeft(h => h - 1);
      setActiveHint(allMoves[Math.floor(Math.random() * allMoves.length)]);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
    if (bgGain.current && audioCtx.current) {
      bgGain.current.gain.linearRampToValueAtTime(soundEnabled ? 0 : 0.04, audioCtx.current.currentTime + 0.5);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative bg-bg-dark">
      {screen === 'home' && <FallingBackground />}
      <div className="w-full max-w-[500px] h-full relative bg-[radial-gradient(circle,#1a1a1a_0%,#000000_100%)] overflow-hidden shadow-2xl z-10">
      <AnimatePresence mode="wait">
        {screen === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-10 bg-black z-50"
          >
            <motion.div 
              className="flex items-end mb-12 relative"
              animate={{ 
                y: [0, -15, 0],
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <div className="text-[120px] leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.5)] text-white translate-x-[15px] z-[2]">♔</div>
              <div className="text-[120px] leading-none drop-shadow-[0_0_35px_rgba(212,175,55,0.7)] text-gold-primary scale-75 translate-x-[-15px] z-[1]">♕</div>
            </motion.div>
            <h2 className="text-gold-primary text-2xl font-bold tracking-[4px] mb-6 animate-pulse">LOADING...</h2>
            <div className="w-full max-w-[300px]">
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden border border-[#333]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-gold-dark to-gold-light"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gold-primary/40 text-[10px] tracking-widest uppercase">Chess Club</span>
                <span className="text-gold-primary text-xs font-mono">{Math.round(loadingProgress)}%</span>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center z-10"
          >
            <div className="flex items-end gap-[-15px] mb-1 relative z-20">
              <div className="text-[80px] leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] text-white translate-x-[10px] z-[2]">♔</div>
              <div className="text-[80px] leading-none drop-shadow-[0_0_25px_rgba(212,175,55,0.6)] text-gold-primary scale-75 translate-x-[-10px] z-[1]">♕</div>
            </div>
            <h1 className="text-4xl font-bold text-gold-primary tracking-[4px] my-4">CHESS CLUB</h1>
            <div className="flex flex-col gap-3 w-[85%]">
              <button onClick={() => { playSfx('click'); initAudio(); startGame('ai'); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3.5 rounded-lg font-bold cursor-pointer flex items-center justify-center gap-2.5 uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95">
                <Play size={20} /> PLAY VS COMPUTER
              </button>
              <button onClick={() => { playSfx('click'); initAudio(); setScreen('side-select'); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3.5 rounded-lg font-bold cursor-pointer flex items-center justify-center gap-2.5 uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95">
                <Users size={20} /> 2 PLAYERS
              </button>
              <button onClick={() => { playSfx('click'); initAudio(); setScreen('puzzles'); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3.5 rounded-lg font-bold cursor-pointer flex items-center justify-center gap-2.5 uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95">
                <Puzzle size={20} /> PUZZLES
              </button>
              <button onClick={() => { playSfx('click'); initAudio(); setScreen('learn'); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3.5 rounded-lg font-bold cursor-pointer flex items-center justify-center gap-2.5 uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95">
                <GraduationCap size={20} /> LEARN CHESS
              </button>
              <button onClick={() => { playSfx('click'); initAudio(); toggleSound(); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3.5 rounded-lg font-bold cursor-pointer flex items-center justify-center gap-2.5 uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95">
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />} SOUND: {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'side-select' && (
          <motion.div
            key="side-select"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-5 z-20"
          >
            <h2 className="text-2xl text-gold-primary tracking-widest mb-6">CHOOSE YOUR SIDE</h2>
            <div className="flex flex-col gap-3 w-[85%]">
              <button onClick={() => { playSfx('click'); startGame('pvp', 'white'); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3.5 rounded-lg font-bold cursor-pointer uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95">WHITE PLAYER</button>
              <button onClick={() => { playSfx('click'); startGame('pvp', 'black'); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3.5 rounded-lg font-bold cursor-pointer uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95">BLACK PLAYER</button>
              <button onClick={() => { playSfx('click'); setScreen('home'); }} className="bg-[#333] text-white border-none p-3.5 rounded-lg font-bold cursor-pointer uppercase transition-all hover:bg-gold-primary hover:text-black active:bg-gold-primary active:text-black active:scale-95 mt-2.5">GO BACK</button>
            </div>
          </motion.div>
        )}

        {screen === 'learn' && (
          <motion.div
            key="learn"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 bg-black flex flex-col p-5 overflow-y-auto z-20"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-gold-primary text-xl font-bold">LEARN CHESS</h2>
              <button onClick={() => { playSfx('click'); setScreen('home'); }} className="bg-bg-card text-gold-primary border border-gold-dark px-4 py-1.5 rounded-lg text-sm font-bold">BACK</button>
            </div>

            <div className="bg-[#111] border border-[#333] p-4 rounded-xl mb-5">
              <h3 className="text-gold-primary border-b border-[#333] pb-1.5 mb-2.5 text-center text-sm font-bold uppercase">Piece Movements</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {(['k', 'q', 'r', 'b', 'n', 'p'] as PieceType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => { playSfx('click'); setDetailPiece(type); setDetailConcept(null); setScreen('piece-detail'); }}
                    className="bg-[#1a1a1a] border border-gold-dark text-white p-2.5 rounded-lg text-center cursor-pointer text-[0.85rem] hover:bg-gold-primary hover:text-black transition-all"
                  >
                    <span className="text-2xl block mb-1">{PIECES_MAP.white[type]}</span>
                    {type === 'k' ? 'KING' : type === 'q' ? 'QUEEN' : type === 'r' ? 'ROOK' : type === 'b' ? 'BISHOP' : type === 'n' ? 'KNIGHT' : 'PAWN'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111] border border-[#333] p-4 rounded-xl mb-5">
              <h3 className="text-gold-primary border-b border-[#333] pb-1.5 mb-2.5 text-center text-sm font-bold uppercase">Basic Concepts</h3>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => { playSfx('click'); setDetailConcept('capturing'); setDetailPiece(null); setScreen('piece-detail'); }}
                  className="bg-[#1a1a1a] border border-gold-dark text-white p-3 rounded-lg text-center cursor-pointer text-[0.85rem] font-bold hover:bg-gold-primary hover:text-black transition-all uppercase"
                >
                  Capturing
                </button>
                <button
                  onClick={() => { playSfx('click'); setDetailConcept('notation'); setDetailPiece(null); setScreen('piece-detail'); }}
                  className="bg-[#1a1a1a] border border-gold-dark text-white p-3 rounded-lg text-center cursor-pointer text-[0.85rem] font-bold hover:bg-gold-primary hover:text-black transition-all uppercase"
                >
                  Notation
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'piece-detail' && (detailPiece || detailConcept) && (
          <motion.div
            key="piece-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black flex flex-col p-5 z-30"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-gold-primary text-lg font-bold uppercase">
                {detailPiece ? `${detailPiece === 'k' ? 'KING' : detailPiece === 'q' ? 'QUEEN' : detailPiece === 'r' ? 'ROOK' : detailPiece === 'b' ? 'BISHOP' : detailPiece === 'n' ? 'KNIGHT' : 'PAWN'} (${HINDI_NAMES[detailPiece]})` : CONCEPT_DEFINITIONS[detailConcept!].title}
              </h2>
              <button onClick={() => { playSfx('click'); setScreen('learn'); }} className="bg-bg-card text-gold-primary border border-gold-dark px-4 py-1.5 rounded-lg hover:bg-gold-primary hover:text-black transition-all"><X size={18} /></button>
            </div>
            <div className="aspect-square w-full my-4 bg-gold-dark p-1.5 relative">
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                {Array(64).fill(null).map((_, i) => {
                  const r = Math.floor(i / 8);
                  const c = i % 8;
                  
                  let isPossible = false;
                  let pieceToShow = null;

                  if (detailPiece) {
                    isPossible = getMoves(4, 4, (() => {
                      const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
                      b[4][4] = { type: detailPiece, color: 'white' };
                      return b;
                    })()).some(m => m.r === r && m.c === c);
                    if (r === 4 && c === 4) pieceToShow = PIECES_MAP.white[detailPiece];
                  } else if (detailConcept === 'capturing') {
                    if (r === 4 && c === 4) pieceToShow = PIECES_MAP.white.r;
                    if (r === 2 && c === 4) pieceToShow = PIECES_MAP.black.p;
                  } else if (detailConcept === 'notation') {
                    // Show some coordinates or a piece at a specific square
                    if (r === 7 && c === 0) pieceToShow = 'a1';
                    if (r === 0 && c === 7) pieceToShow = 'h8';
                  }

                  return (
                    <div key={i} className={`flex justify-center items-center relative ${(r + c) % 2 === 0 ? 'bg-light-sq' : 'bg-dark-sq'}`}>
                      {pieceToShow && <span className={`${detailConcept === 'notation' ? 'text-xs font-bold text-black/50' : 'text-4xl text-white drop-shadow-md'}`}>{pieceToShow}</span>}
                      {isPossible && <div className="absolute w-[15px] h-[15px] bg-green-400/40 rounded-full pointer-events-none" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-[#111] p-4 rounded-lg border border-[#333] leading-relaxed text-sm text-[#ccc] font-medium">
              {detailPiece ? MOVE_DEFINITIONS[detailPiece] : CONCEPT_DEFINITIONS[detailConcept!].desc}
            </div>
          </motion.div>
        )}

        {screen === 'puzzles' && (
          <motion.div
            key="puzzles"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 bg-black flex flex-col p-5 z-20"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gold-primary text-xl font-bold">PUZZLES</h2>
              <button onClick={() => { playSfx('click'); setScreen('home'); }} className="bg-bg-card text-gold-primary border border-gold-dark px-4 py-1.5 rounded-lg font-bold">BACK</button>
            </div>
            <div className="grid grid-cols-5 gap-2.5 overflow-y-auto p-2.5 flex-grow">
              {Array(300).fill(null).map((_, i) => {
                const level = i + 1;
                const isLocked = level > currentLevel;
                return (
                  <button
                    key={level}
                    disabled={isLocked}
                    onClick={() => { playSfx('click'); startGame('ai'); }}
                    className={`bg-bg-card border border-gold-dark text-gold-primary aspect-square flex flex-col items-center justify-center rounded-lg font-bold transition-all ${isLocked ? 'opacity-50 grayscale cursor-default' : 'active:scale-95 cursor-pointer'}`}
                  >
                    <span className="text-lg">{level}</span>
                    {isLocked && <span className="text-xs">🔒</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {screen === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col p-5 z-10"
          >
            <div className="text-center font-bold text-gold-primary my-2.5 uppercase">{turn}'S TURN</div>
            <div className="aspect-square w-full mb-4 bg-gold-dark p-1.5 relative shadow-xl">
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                {board.map((row, r) => row.map((p, c) => {
                  const isSelected = selectedSq?.r === r && selectedSq?.c === c;
                  const isValid = validMoves.some(m => m.r === r && m.c === c);
                  const isHint = activeHint && ((activeHint.from.r === r && activeHint.from.c === c) || (activeHint.to.r === r && activeHint.to.c === c));

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleSqClick(r, c)}
                      className={`flex justify-center items-center relative cursor-pointer text-4xl ${(r + c) % 2 === 0 ? 'bg-light-sq' : 'bg-dark-sq'} ${isSelected ? 'bg-white/45' : ''}`}
                    >
                      {isValid && <div className="w-3 h-3 bg-white/40 rounded-full" />}
                      {isHint && <div className="absolute w-5 h-5 border-[3px] border-hint-dot rounded-full animate-pulse-custom pointer-events-none" />}
                      {p && (
                        <motion.span
                          layoutId={`piece-${r}-${c}`}
                          className={`select-none z-[5] ${p.color === 'white' ? 'text-white drop-shadow-[0_3px_2px_rgba(0,0,0,0.8)]' : 'text-black drop-shadow-[0_0_3px_rgba(212,175,55,1)] drop-shadow-[0_2px_1px_rgba(212,175,55,0.8)]'}`}
                          style={{ textShadow: p.color === 'black' ? '1px 1px 0px rgba(212,175,55,0.4)' : '2px 2px 0px rgba(0,0,0,0.2)' }}
                        >
                          {PIECES_MAP[p.color][p.type]}
                        </motion.span>
                      )}
                    </div>
                  );
                }))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2.5 mt-auto">
              <button onClick={() => { playSfx('click'); setModal({ type: 'quit' }); }} className="bg-bg-card text-gold-primary border border-gold-dark p-2 text-[0.7rem] rounded-lg font-bold uppercase transition-all hover:bg-gold-primary hover:text-black active:scale-95">QUIT</button>
              <button onClick={() => { playSfx('click'); useHint(); }} className="bg-bg-card text-gold-primary border border-gold-dark p-2 text-[0.7rem] rounded-lg font-bold uppercase transition-all hover:bg-gold-primary hover:text-black active:scale-95 flex items-center justify-center gap-1">
                <Lightbulb size={12} /> HINT (<span id="hint-count">{hintsLeft}</span>)
              </button>
              <button 
                onClick={() => { playSfx('click'); undoMove(); }} 
                className="bg-bg-card text-gold-primary border border-gold-dark p-2 text-[0.7rem] rounded-lg font-bold uppercase transition-all hover:bg-gold-primary hover:text-black active:scale-95 flex items-center justify-center gap-1"
              >
                <Undo2 size={12} /> UNDO
              </button>
              <button onClick={() => { playSfx('click'); setModal({ type: 'reset' }); }} className="bg-bg-card text-gold-primary border border-gold-dark p-2 text-[0.7rem] rounded-lg font-bold uppercase transition-all hover:bg-gold-primary hover:text-black active:scale-95 flex items-center justify-center gap-1">
                <RotateCcw size={12} /> RESET
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {modal.type && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 z-[200] flex justify-center items-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-bg-card border-2 border-gold-primary p-6 w-[85%] max-w-[350px] rounded-xl text-center relative"
            >
              {modal.type === 'win' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                  {Array(50).fill(null).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-gold-primary rounded-full animate-fall"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: '-10px',
                        animationDuration: `${Math.random() * 2 + 1}s`,
                        animationDelay: `${Math.random() * 2}s`
                      }}
                    />
                  ))}
                </div>
              )}
              <h3 className="text-gold-primary text-xl font-bold mb-2.5 uppercase">
                {modal.type === 'win' ? 'CONGRATULATIONS! 🎉' : 'ARE YOU SURE?'}
              </h3>
              <p className="mb-6 text-[#ccc]">
                {modal.type === 'win' ? (
                  <>
                    <span className="text-2xl text-gold-light font-bold block mb-2">{winner?.toUpperCase()} WINS!</span>
                    The King has been defeated.
                  </>
                ) : modal.type === 'quit' ? 'Do you want to quit the game?' : 'Reset the chess board?'}
              </p>
              <div className="flex gap-2.5">
                {modal.type === 'win' ? (
                  <button onClick={() => { playSfx('click'); setModal({ type: null }); setScreen('home'); }} className="bg-gradient-to-b from-gold-light to-gold-dark text-black border-none p-3 rounded-lg font-bold w-full uppercase">HOME SCREEN</button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        playSfx('click');
                        if (modal.type === 'quit') { setScreen('home'); }
                        else { resetBoard(); }
                        setModal({ type: null });
                      }}
                      className="bg-gradient-to-b from-gold-light to-gold-dark text-black border-none p-3 rounded-lg font-bold flex-1 uppercase"
                    >
                      YES
                    </button>
                    <button onClick={() => { playSfx('click'); setModal({ type: null }); }} className="bg-bg-card text-gold-primary border border-gold-dark p-3 rounded-lg font-bold flex-1 uppercase">NO</button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

