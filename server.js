// Amanda Freeman
// Project 4: Multiplayer Tic-Tac-Toe 

const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const PUBLIC_DIR = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
    let requestedPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
    let filePath = path.join(PUBLIC_DIR, requestedPath);

    // Do not allow requests to leave the public folder.
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404);
            res.end("File not found");
            return;
        }

        const extension = path.extname(filePath);
        const contentTypes = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "text/javascript"
        };

        res.writeHead(200, {
            "Content-Type": contentTypes[extension] || "text/plain"
        });
        res.end(data);
    });
});

const io = new Server(server);
const games = {};

function makeGame() {
    return {
        board: Array(9).fill(""),
        players: { X: null, O: null },
        turn: "X",
        winner: "",
        message: "Waiting for players to join."
    };
}

function publicGameState(game) {
    return {
        board: game.board,
        players: {
            X: game.players.X ? game.players.X.name : "",
            O: game.players.O ? game.players.O.name : ""
        },
        turn: game.turn,
        winner: game.winner,
        message: game.message
    };
}

function sendGameState(room) {
    const game = games[room];
    if (game) {
        io.to(room).emit("gameState", publicGameState(game));
    }
}

function checkWinner(board) {
    const winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const line of winningLines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return "";
}

io.on("connection", (socket) => {
    socket.on("joinGame", ({ name, gameCode }) => {
        name = String(name || "Player").trim().slice(0, 20);
        gameCode = String(gameCode || "").trim().toUpperCase().slice(0, 12);

        if (!gameCode) {
            socket.emit("joinError", "Please enter a game code.");
            return;
        }

        if (socket.data.room) {
            socket.emit("joinError", "You have already joined a game.");
            return;
        }

        if (!games[gameCode]) {
            games[gameCode] = makeGame();
        }

        const game = games[gameCode];
        let symbol = "";

        if (!game.players.X) {
            symbol = "X";
        } else if (!game.players.O) {
            symbol = "O";
        }

        socket.data.room = gameCode;
        socket.data.symbol = symbol;
        socket.data.name = name;
        socket.join(gameCode);

        if (symbol) {
            game.players[symbol] = { id: socket.id, name: name };
            game.message = name + " joined as " + symbol + ".";
        } else {
            game.message = name + " joined as a spectator.";
        }

        socket.emit("joined", {
            symbol: symbol || "Spectator",
            gameCode: gameCode
        });

        sendGameState(gameCode);
    });

    socket.on("makeMove", (index) => {
        const room = socket.data.room;
        const symbol = socket.data.symbol;

        if (!room || !symbol || !games[room]) return;

        const game = games[room];
        if (game.winner || game.board[index] || game.turn !== symbol) return;

        game.board[index] = symbol;

        const winner = checkWinner(game.board);
        if (winner) {
            game.winner = winner;
            game.message = game.players[winner].name + " wins!";
        } else if (game.board.every(cell => cell !== "")) {
            game.winner = "Draw";
            game.message = "The game is a draw!";
        } else {
            game.turn = game.turn === "X" ? "O" : "X";
            game.message = "It is " + game.turn + "'s turn.";
        }

        sendGameState(room);
    });

    socket.on("resetGame", () => {
        const room = socket.data.room;
        if (!room || !socket.data.symbol || !games[room]) return;

        const game = games[room];
        game.board = Array(9).fill("");
        game.turn = "X";
        game.winner = "";
        game.message = "The game has been reset.";
        sendGameState(room);
    });

    socket.on("disconnect", () => {
        const room = socket.data.room;
        const symbol = socket.data.symbol;

        if (!room || !games[room]) return;

        const game = games[room];
        if (symbol && game.players[symbol] &&
            game.players[symbol].id === socket.id) {
            game.players[symbol] = null;
            game.message = symbol + " left. A new player can take that spot.";
        }

        const roomSockets = io.sockets.adapter.rooms.get(room);
        if (!roomSockets || roomSockets.size === 0) {
            delete games[room];
        } else {
            sendGameState(room);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {console.log(`Server running on port ${PORT}`);} );

