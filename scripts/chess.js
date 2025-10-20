// scripts/chess.js

document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const boardEl = document.getElementById('board');
    const statusEl = document.getElementById('status');
    const movesEl = document.getElementById('moves');
    const fenEl = document.getElementById('fen');
    const pgnEl = document.getElementById('pgn');
    const newBtn = document.getElementById('newBtn');
    const undoBtn = document.getElementById('undoBtn');
    const flipBtn = document.getElementById('flipBtn');
    const vsComputer = document.getElementById('vsComputer');
    const aiMode = document.getElementById('aiMode');
    const fullscreenBtn = document.getElementById('chessFullscreen');

    // Game state
    let game = new Chess();
    let boardFlipped = false;
    let selectedSquare = null;
    let moveHistory = [];

    // Initialize the game
    function initGame() {
        renderBoard();
        setupEventListeners();
        updateUI();
    }

    /** Return a unicode character for a piece object from chess.js */
    function getPieceUnicode(piece) {
        const unicodePieces = {
            p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚',
            P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔'
        };
        const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        return unicodePieces[key] || '';
    }

    function renderBoard() {
        boardEl.innerHTML = '';
        const board = game.board();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const fileIndex = boardFlipped ? 7 - c : c;
                const rankIndex = boardFlipped ? r : r;
                const fileChar = 'abcdefgh'[boardFlipped ? 7 - c : c];
                const rankChar = String(8 - r);
                const square = `${fileChar}${rankChar}`;

                const piece = boardFlipped ? board[7 - r][7 - c] : board[r][c];

                const squareEl = document.createElement('div');
                squareEl.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                squareEl.dataset.square = square;

                if (piece) {
                    const pieceEl = document.createElement('div');
                    pieceEl.className = 'piece';

                    // Add color class for better styling
                    if (piece.color === 'w') {
                        pieceEl.classList.add('white');
                    } else {
                        pieceEl.classList.add('black');
                    }

                    pieceEl.textContent = getPieceUnicode(piece);
                    pieceEl.setAttribute('aria-label', `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`);
                    squareEl.appendChild(pieceEl);
                }

                squareEl.addEventListener('click', () => onSquareClick(square));
                boardEl.appendChild(squareEl);
            }
        }



        // Highlight selected square and legal moves
        if (selectedSquare) {
            const legal = game.moves({ square: selectedSquare, verbose: true }).map(m => m.to);
            for (const el of boardEl.children) {
                if (el.dataset.square === selectedSquare) el.classList.add('selected');
                if (legal.includes(el.dataset.square)) el.classList.add('highlight');
            }
        }
    }

    function onSquareClick(square) {
        if (selectedSquare) {
            const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move) {
                moveHistory.push(move);
                selectedSquare = null;
                updateUI();
                if (vsComputer.checked && !game.game_over()) {
                    setTimeout(makeComputerMove, 250);
                }
                return;
            } else {
                const piece = game.get(square);
                if (piece && piece.color === game.turn()) {
                    selectedSquare = square;
                } else {
                    selectedSquare = null;
                }
                renderBoard();
                return;
            }
        }

        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            selectedSquare = square;
            renderBoard();
        } else {
            selectedSquare = null;
            renderBoard();
        }
    }

    function updateUI() {
        renderBoard();
        fenEl.textContent = game.fen();
        pgnEl.textContent = game.pgn();
        statusEl.textContent = getStatus();

        // Update move history
        const history = game.history({ verbose: true });
        movesEl.innerHTML = '';
        if (history.length) {
            const ol = document.createElement('ol');
            ol.style.paddingLeft = '18px';
            for (let i = 0; i < history.length; i += 2) {
                const li = document.createElement('li');
                const white = history[i];
                const black = history[i + 1];
                li.textContent = `${white ? white.san : ''}${black ? ' — ' + black.san : ''}`;
                ol.appendChild(li);
            }
            movesEl.appendChild(ol);
        }
    }

    function getStatus() {
        if (game.in_checkmate()) return 'Checkmate — ' + (game.turn() === 'w' ? 'Black' : 'White') + ' wins';
        if (game.in_stalemate()) return 'Stalemate — draw';
        if (game.in_threefold_repetition()) return 'Draw — threefold repetition';
        if (game.insufficient_material()) return 'Draw — insufficient material';
        if (game.in_check()) return (game.turn() === 'w' ? 'White' : 'Black') + ' to move — in check';
        return (game.turn() === 'w' ? 'White' : 'Black') + ' to move';
    }

    /* ---------- Simple AI ---------- */
    function makeComputerMove() {
        if (game.game_over()) return;
        const possible = game.moves();
        if (!possible.length) return;

        const mode = aiMode.value;
        if (mode === 'random') {
            const m = possible[Math.floor(Math.random() * possible.length)];
            game.move(m);
            moveHistory.push({ san: m });
            updateUI();
            return;
        }

        const best = minimaxRoot(2, true);
        if (best) {
            game.move(best);
            moveHistory.push({ san: best });
            updateUI();
        }
    }

    function minimaxRoot(depth, isMax) {
        const moves = game.moves();
        let bestMove = null;
        let bestValue = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            game.move(move);
            const value = minimax(depth - 1, -Infinity, Infinity, !isMax);
            game.undo();
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        return bestMove;
    }

    function minimax(depth, alpha, beta, isMax) {
        if (depth === 0) return evaluateBoard();

        const moves = game.moves();
        if (isMax) {
            let maxEval = -Infinity;
            for (let i = 0; i < moves.length; i++) {
                game.move(moves[i]);
                const evalScore = minimax(depth - 1, alpha, beta, false);
                game.undo();
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let i = 0; i < moves.length; i++) {
                game.move(moves[i]);
                const evalScore = minimax(depth - 1, alpha, beta, true);
                game.undo();
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    function evaluateBoard() {
        const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        let total = 0;
        const b = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = b[r][c];
                if (!piece) continue;
                const val = values[piece.type] || 0;
                total += piece.color === 'w' ? val : -val;
            }
        }
        return total;
    }

    // Set up event listeners
    function setupEventListeners() {
        newBtn.onclick = () => {
            game = new Chess();
            selectedSquare = null;
            moveHistory = [];
            updateUI();
        };

        undoBtn.onclick = () => {
            if (game.history().length > 0) game.undo();
            if (game.history().length > 0) game.undo();
            selectedSquare = null;
            updateUI();
        };

        flipBtn.onclick = () => {
            boardFlipped = !boardFlipped;
            renderBoard();
        };

        // Fullscreen button
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'u' || e.key === 'U') undoBtn.click();
            if (e.key === 'n' || e.key === 'N') newBtn.click();
            if (e.key === 'f' || e.key === 'F') toggleFullscreen();
            if (e.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen();
            }
        });
    }

    // Fullscreen functions
    function toggleFullscreen() {
        const container = document.querySelector('.chess-container');

        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            } else if (container.msRequestFullscreen) {
                container.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    function handleFullscreenChange() {
        const isFullscreen = !!document.fullscreenElement;
        fullscreenBtn.innerHTML = isFullscreen ? '⛷' : '⛶';

        // Re-render board to ensure proper scaling
        setTimeout(() => {
            renderBoard();
        }, 100);
    }

    // Update the board rendering to handle dynamic sizing
    function updateBoardSize() {
        const board = document.getElementById('board');
        const container = board.parentElement;
        const isFullscreen = !!document.fullscreenElement;

        if (isFullscreen) {
            // In fullscreen, use viewport-based sizing
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calculate optimal board size based on available space
            const availableWidth = viewportWidth * 0.8;
            const availableHeight = viewportHeight * 0.8;
            const boardSize = Math.min(availableWidth, availableHeight, 800);

            board.style.width = `${boardSize}px`;
            board.style.height = `${boardSize}px`;
        } else {
            // In normal mode, use CSS variables
            board.style.width = '';
            board.style.height = '';
        }

        // Update piece font size based on current board size
        const squares = board.querySelectorAll('.square');
        const squareSize = board.clientWidth / 8;
        const pieceSize = squareSize * 0.6;

        squares.forEach(square => {
            const piece = square.querySelector('.piece');
            if (piece) {
                piece.style.fontSize = `${pieceSize}px`;
            }
        });
    }

    // Call this when window resizes or fullscreen changes
    window.addEventListener('resize', updateBoardSize);
    document.addEventListener('fullscreenchange', updateBoardSize);

    // Initialize the game
    initGame();
    updateBoardSize(); // Set initial size
});