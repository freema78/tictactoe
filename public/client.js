// Amanda Freeman
// Project 4: Multiplayer Tic-Tac-Toe

const socket = io();

const nameInput = document.getElementById("playerName");
const codeInput = document.getElementById("gameCode");
const joinButton = document.getElementById("joinButton");
const connectionStatus = document.getElementById("connectionStatus");
const playerStatus = document.getElementById("playerStatus");
const turnStatus = document.getElementById("turnStatus");
const winnerStatus = document.getElementById("winnerStatus");
const resetButton = document.getElementById("resetButton");
const cells = document.querySelectorAll(".cell");

let mySymbol = "";
let hasJoined = false;
let currentTurn = "X";
let gameOver = false;

joinButton.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const gameCode = codeInput.value.trim();

    if (name === "" || gameCode === "") {
        connectionStatus.textContent = "Please enter your name and a game code.";
        return;
    }

    socket.emit("joinGame", {
        name: name,
        gameCode: gameCode
    });
});

cells.forEach((cell) => {
    cell.addEventListener("click", () => {
        if (!hasJoined || mySymbol === "Spectator" || gameOver) return;

        const index = Number(cell.dataset.index);
        if (mySymbol === currentTurn && cell.textContent === "") {
            socket.emit("makeMove", index);
        }
    });
});

resetButton.addEventListener("click", () => {
    if (hasJoined && mySymbol !== "Spectator") {
        socket.emit("resetGame");
    }
});

socket.on("connect", () => {
    connectionStatus.textContent = "Connected to the game server.";
});

socket.on("disconnect", () => {
    connectionStatus.textContent = "Disconnected from the server. Refresh to reconnect.";
});

socket.on("joinError", (message) => {
    connectionStatus.textContent = message;
});

socket.on("joined", (info) => {
    hasJoined = true;
    mySymbol = info.symbol;
    connectionStatus.textContent = "Joined game: " + info.gameCode;
    playerStatus.textContent = mySymbol === "Spectator"
        ? "You are watching as a spectator."
        : "You are playing as " + mySymbol + ".";
    nameInput.disabled = true;
    codeInput.disabled = true;
    joinButton.disabled = true;
    resetButton.disabled = mySymbol === "Spectator";
});

socket.on("gameState", (game) => {
    currentTurn = game.turn;
    gameOver = game.winner !== "";

    cells.forEach((cell, index) => {
        cell.textContent = game.board[index];
        cell.disabled = !hasJoined ||
            mySymbol === "Spectator" ||
            gameOver ||
            game.board[index] !== "" ||
            mySymbol !== currentTurn;
    });

    const xName = game.players.X || "Waiting for X";
    const oName = game.players.O || "Waiting for O";
    playerStatus.textContent = "X: " + xName + " | O: " + oName;

    if (game.winner === "Draw") {
        turnStatus.textContent = "Game over.";
        winnerStatus.textContent = "It's a draw!";
    } else if (game.winner === "X" || game.winner === "O") {
        turnStatus.textContent = "Game over.";
        winnerStatus.textContent = game.message;
    } else {
        turnStatus.textContent = game.players.X && game.players.O
            ? "It is " + game.turn + "'s turn."
            : "Waiting for both players to join.";
        winnerStatus.textContent = game.message;
    }

    resetButton.disabled = !hasJoined || mySymbol === "Spectator";
});
