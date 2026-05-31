const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const ROUNDS_DIR = path.join(__dirname, "rounds");
const DATA_DIR = path.join(__dirname, "data");
const SAVE_FILE = path.join(DATA_DIR, "game-state.json");
const SAVES_DIR = path.join(DATA_DIR, "saves");
const FAVORITES_FILE = path.join(DATA_DIR, "favorites.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let nextTeamId = 1;
let timerInterval = null;
let favoriteRoundIds = [];

const DEFAULT_SETTINGS = {
  hotkeys: {
    timerToggle: "Space",
    timerReset: "KeyR",
    hideAll: "KeyH",
    revealAll: "",
    finishWin: "KeyG",
    finishLoss: "KeyV",
	activeErrorPlus: "KeyF",
  activeErrorMinus: "KeyD"
  }
};
let appSettings = getDefaultSettings();

const DEFAULT_TEAM_COLORS = [
  "#2563eb", // Blau
  "#16a34a", // Grün
  "#ca8a04", // Gelb/Gold
  "#ea580c", // Orange
  "#dc2626"  // Rot
];

let gameState = {
  teams: [],
  currentRound: null,
  revealed: [],
  activeTeamId: null,
  playedRoundIds: [],
  history: [],
  answerCounter: null,
  timer: {
    duration: 300,
    remaining: 300,
    running: false
  }
};

function getRoundFiles() {
  if (!fs.existsSync(ROUNDS_DIR)) {
    fs.mkdirSync(ROUNDS_DIR);
  }

  return fs
    .readdirSync(ROUNDS_DIR)
    .filter(file => file.endsWith(".json"));
}

function readRoundFile(filename) {
  const filePath = path.join(ROUNDS_DIR, filename);
  const rawData = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(rawData);

  const rawItems = Array.isArray(data.items) ? data.items : [];

  return {
    id: filename.replace(".json", ""),
    filename,
    title: data.title || "Unbenannte Runde",
    subtitle: data.subtitle || "",
    source: data.source || "",
    notes: data.notes || "",
    items: rawItems
      .map(normalizeRoundItem)
      .filter(item => item.text.length > 0)
  };
}

function normalizeRoundItem(item) {
  if (typeof item === "string") {
    return {
      text: item.trim(),
      info: ""
    };
  }

  if (item && typeof item === "object") {
    return {
      text: String(item.text || "").trim(),
      info: String(item.info || "").trim()
    };
  }

  return {
    text: "",
    info: ""
  };
}

function parseItemsText(itemsText) {
  return String(itemsText || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const parts = line.split("|");
      const text = parts.shift().trim();
      const info = parts.join("|").trim();

      return {
        text,
        info
      };
    })
    .filter(item => item.text.length > 0);
}

function getRoundsList() {
  return getRoundFiles()
    .map((filename, index) => {
      const round = readRoundFile(filename);

      return {
        id: round.id,
        filename: round.filename,
        title: round.title,
        subtitle: round.subtitle,
        itemCount: round.items.length,
        played: gameState.playedRoundIds.includes(round.id),
        favorite: isRoundFavorite(round.id),
        originalIndex: index
      };
    })
    .sort((a, b) => {
      if (a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1;
      }

      return a.originalIndex - b.originalIndex;
    })
    .map(({ originalIndex, ...round }) => round);
}

function slugify(value) {
  const slug = String(value || "runde")
    .toLowerCase()
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug || "runde";
}

function makeUniqueRoundFilename(title) {
  if (!fs.existsSync(ROUNDS_DIR)) {
    fs.mkdirSync(ROUNDS_DIR);
  }

  const slug = slugify(title);
  let filename = `${slug}.json`;
  let counter = 2;

  while (fs.existsSync(path.join(ROUNDS_DIR, filename))) {
    filename = `${slug}-${counter}.json`;
    counter += 1;
  }

  return filename;
}

function getRoundFilenameById(roundId) {
  const id = String(roundId || "");

  return getRoundFiles().find(filename => {
    return filename.replace(/\.json$/, "") === id;
  }) || null;
}

function ensureDataDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }

  if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR);
  }
}

function getDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function normalizeHotkeyCode(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
}

function sanitizeHotkeys(hotkeys) {
  const defaults = DEFAULT_SETTINGS.hotkeys;
  const cleanHotkeys = {};

  Object.keys(defaults).forEach(actionId => {
    if (hotkeys && Object.prototype.hasOwnProperty.call(hotkeys, actionId)) {
      cleanHotkeys[actionId] = normalizeHotkeyCode(hotkeys[actionId]);
    } else {
      cleanHotkeys[actionId] = defaults[actionId];
    }
  });

  return cleanHotkeys;
}

function loadSettings() {
  ensureDataDirectories();

  appSettings = getDefaultSettings();

  if (!fs.existsSync(SETTINGS_FILE)) {
    saveSettings();
    return;
  }

  try {
    const rawData = fs.readFileSync(SETTINGS_FILE, "utf8");
    const data = JSON.parse(rawData);

    appSettings = {
      ...getDefaultSettings(),
      ...data,
      hotkeys: sanitizeHotkeys(data.hotkeys || {})
    };
  } catch (error) {
    console.error("Einstellungen konnten nicht geladen werden:", error);
    appSettings = getDefaultSettings();
  }
}

function saveSettings() {
  ensureDataDirectories();

  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(appSettings, null, 2),
    "utf8"
  );
}

function loadFavorites() {
  ensureDataDirectories();

  if (!fs.existsSync(FAVORITES_FILE)) {
    favoriteRoundIds = [];
    return;
  }

  try {
    const rawData = fs.readFileSync(FAVORITES_FILE, "utf8");
    const data = JSON.parse(rawData);

    favoriteRoundIds = Array.isArray(data.favoriteRoundIds)
      ? data.favoriteRoundIds
      : [];
  } catch (error) {
    console.error("Favoriten konnten nicht geladen werden:", error);
    favoriteRoundIds = [];
  }
}

function saveFavorites() {
  ensureDataDirectories();

  fs.writeFileSync(
    FAVORITES_FILE,
    JSON.stringify({ favoriteRoundIds }, null, 2),
    "utf8"
  );
}

function isRoundFavorite(roundId) {
  return favoriteRoundIds.includes(roundId);
}

function toggleRoundFavorite(roundId) {
  if (isRoundFavorite(roundId)) {
    favoriteRoundIds = favoriteRoundIds.filter(id => id !== roundId);
  } else {
    favoriteRoundIds.push(roundId);
  }

  saveFavorites();
}

function removeRoundFromFavorites(roundId) {
  favoriteRoundIds = favoriteRoundIds.filter(id => id !== roundId);
  saveFavorites();
}

function buildGameSaveData(saveName = "") {
  return {
    saveName,
    savedAt: new Date().toISOString(),
    teams: gameState.teams,
    activeTeamId: gameState.activeTeamId,
    playedRoundIds: gameState.playedRoundIds,
    history: gameState.history,
    answerCounter: gameState.answerCounter,
    currentRoundId: gameState.currentRound ? gameState.currentRound.id : null,
    revealed: gameState.revealed,
    timer: {
      duration: gameState.timer.duration,
      remaining: gameState.timer.remaining,
      running: false
    },
    summary: {
      currentRoundTitle: gameState.currentRound ? gameState.currentRound.title : "",
      teamCount: gameState.teams.length,
      teams: gameState.teams.map(team => ({
        id: team.id,
        name: team.name,
        score: team.score,
        color: normalizeTeamColor(team.color, getDefaultTeamColor(team.id))
      })),
      historyCount: Array.isArray(gameState.history) ? gameState.history.length : 0,
      playedRoundCount: Array.isArray(gameState.playedRoundIds) ? gameState.playedRoundIds.length : 0
    }
  };
}

function applyGameSaveData(saveData) {
  gameState.teams = Array.isArray(saveData.teams) ? saveData.teams : [];

  gameState.teams = gameState.teams.map(team => ({
    ...team,
    color: normalizeTeamColor(team.color, getDefaultTeamColor(team.id))
  }));

  gameState.activeTeamId = saveData.activeTeamId || null;

  if (!gameState.teams.some(team => team.id === gameState.activeTeamId)) {
    gameState.activeTeamId = null;
  }

  sortTeamsById();

  gameState.playedRoundIds = Array.isArray(saveData.playedRoundIds)
    ? saveData.playedRoundIds
    : [];

  gameState.history = Array.isArray(saveData.history)
    ? saveData.history
    : [];

  gameState.answerCounter = saveData.answerCounter || null;

  if (saveData.timer) {
    gameState.timer = {
      duration: saveData.timer.duration || 300,
      remaining: saveData.timer.remaining || saveData.timer.duration || 300,
      running: false
    };
  }

  if (saveData.currentRoundId) {
    try {
      const round = readRoundFile(`${saveData.currentRoundId}.json`);
      gameState.currentRound = round;

      if (
        Array.isArray(saveData.revealed) &&
        saveData.revealed.length === round.items.length
      ) {
        gameState.revealed = saveData.revealed;
      } else {
        gameState.revealed = round.items.map(() => false);
      }
    } catch {
      gameState.currentRound = null;
      gameState.revealed = [];
    }
  } else {
    gameState.currentRound = null;
    gameState.revealed = [];
  }

  const highestTeamId = gameState.teams.reduce((highest, team) => {
    return Math.max(highest, Number(team.id) || 0);
  }, 0);

  nextTeamId = highestTeamId + 1;
}

function makeUniqueSaveFilename(name) {
  ensureDataDirectories();

  const slug = slugify(name || "spielstand");
  let filename = `${slug}.json`;
  let counter = 2;

  while (fs.existsSync(path.join(SAVES_DIR, filename))) {
    filename = `${slug}-${counter}.json`;
    counter += 1;
  }

  return filename;
}

function getSaveGameFiles() {
  ensureDataDirectories();

  return fs
    .readdirSync(SAVES_DIR)
    .filter(file => file.endsWith(".json"));
}

function getSaveFilenameById(saveId) {
  const id = String(saveId || "");

  return getSaveGameFiles().find(filename => {
    return filename.replace(/\.json$/, "") === id;
  }) || null;
}

function readSaveGameSummary(filename) {
  const filePath = path.join(SAVES_DIR, filename);
  const rawData = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(rawData);

  const summary = data.summary || {};

  return {
    id: filename.replace(".json", ""),
    filename,
    name: data.saveName || filename.replace(".json", ""),
    createdAt: data.createdAt || data.savedAt || "",
    savedAt: data.savedAt || data.createdAt || "",
    currentRoundTitle: summary.currentRoundTitle || data.currentRoundId || "Keine Runde geladen",
    teamCount: summary.teamCount ?? (Array.isArray(data.teams) ? data.teams.length : 0),
    teams: Array.isArray(summary.teams)
      ? summary.teams
      : Array.isArray(data.teams)
        ? data.teams.map(team => ({
            id: team.id,
            name: team.name,
            score: team.score,
            color: normalizeTeamColor(team.color, getDefaultTeamColor(team.id))
          }))
        : [],
    historyCount: summary.historyCount ?? (Array.isArray(data.history) ? data.history.length : 0),
    playedRoundCount: summary.playedRoundCount ?? (Array.isArray(data.playedRoundIds) ? data.playedRoundIds.length : 0)
  };
}

function getSaveGamesList() {
  return getSaveGameFiles()
    .map(filename => {
      try {
        return readSaveGameSummary(filename);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });
}

function saveGameState() {
  ensureDataDirectories();

  const saveData = buildGameSaveData("Autosave");

  fs.writeFileSync(SAVE_FILE, JSON.stringify(saveData, null, 2), "utf8");
}

function loadGameState() {
  if (!fs.existsSync(SAVE_FILE)) {
    return;
  }

  try {
    const rawData = fs.readFileSync(SAVE_FILE, "utf8");
    const saveData = JSON.parse(rawData);

    gameState.teams = Array.isArray(saveData.teams) ? saveData.teams : [];

	gameState.teams = gameState.teams.map(team => ({
	  ...team,
	  color: normalizeTeamColor(team.color, getDefaultTeamColor(team.id))
	}));

	gameState.activeTeamId = saveData.activeTeamId || null;
	sortTeamsById();
	gameState.playedRoundIds = Array.isArray(saveData.playedRoundIds)
		? saveData.playedRoundIds
		: [];
	gameState.history = Array.isArray(saveData.history)
		? saveData.history
		: [];
	gameState.answerCounter = saveData.answerCounter || null;

    if (saveData.timer) {
      gameState.timer = {
        duration: saveData.timer.duration || 300,
        remaining: saveData.timer.remaining || saveData.timer.duration || 300,
        running: false
      };
    }

    if (saveData.currentRoundId) {
      try {
        const round = readRoundFile(`${saveData.currentRoundId}.json`);
        gameState.currentRound = round;

        if (
          Array.isArray(saveData.revealed) &&
          saveData.revealed.length === round.items.length
        ) {
          gameState.revealed = saveData.revealed;
        } else {
          gameState.revealed = round.items.map(() => false);
        }
      } catch {
        gameState.currentRound = null;
        gameState.revealed = [];
      }
    }

    const highestTeamId = gameState.teams.reduce((highest, team) => {
      return Math.max(highest, Number(team.id) || 0);
    }, 0);

    nextTeamId = highestTeamId + 1;

    console.log("Gespeicherter Spielstand geladen.");
  } catch (error) {
    console.error("Spielstand konnte nicht geladen werden:", error);
  }
}

function getPublicTeams() {
  return gameState.teams.map(team => ({
    id: team.id,
    name: team.name,
    score: team.score,
    bid: team.bid,
    errors: team.errors,
    color: normalizeTeamColor(team.color, getDefaultTeamColor(team.id))
  }));
}

function getPlayerState() {
  const round = gameState.currentRound;

  return {
	teams: getPublicTeams(),
	activeTeamId: gameState.activeTeamId,
	timer: gameState.timer,
	answerCounter: gameState.answerCounter,
	currentRound: round
      ? {
          id: round.id,
          title: round.title,
          subtitle: round.subtitle,
          itemCount: round.items.length,
          items: round.items.map((item, index) => ({
			number: index + 1,
			text: gameState.revealed[index] ? item.text : null,
			info: item.info || "",
			revealed: gameState.revealed[index] || false
		  }))
        }
      : null
  };
}

function getModeratorState() {
  return {
    ...gameState,
    rounds: getRoundsList(),
    saves: getSaveGamesList(),
	settings: appSettings
  };
}

function broadcastState() {
  io.to("moderators").emit("state:update", getModeratorState());
  io.to("players").emit("state:update", getPlayerState());
}

function persistAndBroadcast() {
  saveGameState();
  broadcastState();
}

function resetGameState() {
  gameState = {
  teams: [],
  currentRound: null,
  revealed: [],
  activeTeamId: null,
  playedRoundIds: [],
  history: [],
  answerCounter: null,
  timer: {
    duration: 300,
    remaining: 300,
    running: false
  }
};

  nextTeamId = 1;

  if (fs.existsSync(SAVE_FILE)) {
    fs.unlinkSync(SAVE_FILE);
  }

  broadcastState();
}

function findTeam(teamId) {
  return gameState.teams.find(team => team.id === teamId);
}

function getDefaultTeamColor(teamId) {
  const index = Math.max(0, Number(teamId) - 1) % DEFAULT_TEAM_COLORS.length;
  return DEFAULT_TEAM_COLORS[index];
}

function normalizeTeamColor(color, fallbackColor) {
  const text = String(color || "").trim();

  if (/^#[0-9a-fA-F]{6}$/.test(text)) {
    return text;
  }

  return fallbackColor || DEFAULT_TEAM_COLORS[0];
}

function getNextAvailableTeamId() {
  const usedIds = gameState.teams.map(team => Number(team.id));

  let id = 1;

  while (usedIds.includes(id)) {
    id += 1;
  }

  return id;
}

function sortTeamsById() {
  gameState.teams.sort((a, b) => Number(a.id) - Number(b.id));
}

function getActiveTeam() {
  if (!gameState.activeTeamId) {
    return null;
  }

  return findTeam(gameState.activeTeamId);
}

function getActiveBidNumber() {
  const activeTeam = getActiveTeam();

  if (!activeTeam) {
    return null;
  }

  const bid = Number(activeTeam.bid);

  if (!Number.isFinite(bid) || bid <= 0) {
    return null;
  }

  return Math.floor(bid);
}

function markCurrentRoundAsPlayed() {
  if (!gameState.currentRound) {
    return;
  }

  if (!gameState.playedRoundIds.includes(gameState.currentRound.id)) {
    gameState.playedRoundIds.push(gameState.currentRound.id);
  }
}

function getValidBidFromTeam(team) {
  if (!team) {
    return null;
  }

  const bid = Number(team.bid);

  if (!Number.isFinite(bid) || bid <= 0) {
    return null;
  }

  return Math.floor(bid);
}

function startAnswerCounterForTeam(team) {
  if (!team) {
    gameState.answerCounter = null;
    return;
  }

  gameState.answerCounter = {
    visible: true,
    locked: false,
    teamId: team.id,
    teamName: team.name,
    target: getValidBidFromTeam(team),
    count: 0,
    countedItemIndexes: []
  };
}

function updateAnswerCounterTarget(team) {
  if (!gameState.answerCounter) return;
  if (gameState.answerCounter.locked) return;
  if (!team || gameState.answerCounter.teamId !== team.id) return;

  gameState.answerCounter.teamName = team.name;
  gameState.answerCounter.target = getValidBidFromTeam(team);
}

function countAnswerReveal(index) {
  if (!gameState.answerCounter) return;
  if (gameState.answerCounter.locked) return;
  if (!gameState.answerCounter.visible) return;

  if (!Array.isArray(gameState.answerCounter.countedItemIndexes)) {
    gameState.answerCounter.countedItemIndexes = [];
  }

  if (gameState.answerCounter.countedItemIndexes.includes(index)) {
    return;
  }

  gameState.answerCounter.countedItemIndexes.push(index);
  gameState.answerCounter.count = gameState.answerCounter.countedItemIndexes.length;
}

function uncountAnswerReveal(index) {
  if (!gameState.answerCounter) return;
  if (gameState.answerCounter.locked) return;
  if (!gameState.answerCounter.visible) return;

  if (!Array.isArray(gameState.answerCounter.countedItemIndexes)) {
    gameState.answerCounter.countedItemIndexes = [];
  }

  gameState.answerCounter.countedItemIndexes =
    gameState.answerCounter.countedItemIndexes.filter(itemIndex => itemIndex !== index);

  gameState.answerCounter.count = gameState.answerCounter.countedItemIndexes.length;
}

function lockAnswerCounter() {
  if (!gameState.answerCounter) return;

  gameState.answerCounter.locked = true;
}

function clearAnswerCounterIfUnlocked() {
  if (!gameState.answerCounter) return;

  if (!gameState.answerCounter.locked) {
    gameState.answerCounter = null;
  }
}

function resetRoundTeamState() {
  gameState.teams = gameState.teams.map(team => ({
    ...team,
    bid: "",
    errors: 0
  }));

  gameState.activeTeamId = null;
  gameState.timer.running = false;

  lockAnswerCounter();
}

function addHistoryEntry(entry) {
  const fullEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...entry,
    scoresAfter: gameState.teams.map(team => ({
	  teamId: team.id,
	  teamName: team.name,
	  teamColor: normalizeTeamColor(team.color, getDefaultTeamColor(team.id)),
	  score: team.score
	}))
  };

  gameState.history.unshift(fullEntry);

  if (gameState.history.length > 200) {
    gameState.history = gameState.history.slice(0, 200);
  }
}

function parseScoreInput(currentScore, input) {
  const text = String(input).trim();

  if (text === "") {
    return currentScore;
  }

  if (!/^[-+]?\d+$/.test(text)) {
    return currentScore;
  }

  const number = parseInt(text, 10);

  if (text.startsWith("+") || text.startsWith("-")) {
    return currentScore + number;
  }

  return number;
}

function startTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(() => {
    if (!gameState.timer.running) return;

    gameState.timer.remaining -= 1;

    if (gameState.timer.remaining <= 0) {
      gameState.timer.remaining = 0;
      gameState.timer.running = false;
      saveGameState();
    }

    broadcastState();
  }, 1000);
}

app.get("/", (req, res) => {
  res.redirect("/moderator.html");
});

app.get("/api/rounds", (req, res) => {
  try {
    res.json(getRoundsList());
  } catch (error) {
    console.error("Fehler beim Laden der Runden:", error);
    res.status(500).json({ error: "Runden konnten nicht geladen werden." });
  }
});

app.get("/api/rounds/:id", (req, res) => {
  try {
    const filename = `${req.params.id}.json`;
    const round = readRoundFile(filename);
    res.json(round);
  } catch (error) {
    console.error("Fehler beim Laden der Runde:", error);
    res.status(404).json({ error: "Runde nicht gefunden." });
  }
});

io.on("connection", (socket) => {
  console.log("Ein Fenster ist verbunden:", socket.id);

  socket.on("role:moderator", () => {
    socket.join("moderators");
    socket.emit("state:update", getModeratorState());
    console.log("Moderator verbunden:", socket.id);
  });

  socket.on("role:player", () => {
    socket.join("players");
    socket.emit("state:update", getPlayerState());
    console.log("Spieler verbunden:", socket.id);
  });

  socket.on("rounds:refresh", () => {
  broadcastState();
  });

  socket.on("round:create", ({ title, subtitle, source, notes, itemsText }) => {
    try {
      const cleanTitle = String(title || "").trim();
	  const cleanSubtitle = String(subtitle || "").trim();
	  const cleanSource = String(source || "").trim();
	  const cleanNotes = String(notes || "").trim();

	  const items = parseItemsText(itemsText);

      if (!cleanTitle) {
        socket.emit("round:createResult", {
          ok: false,
          error: "Die Runde braucht einen Titel."
        });
        return;
      }

      if (items.length === 0) {
        socket.emit("round:createResult", {
          ok: false,
          error: "Die Runde braucht mindestens einen Listeneintrag."
        });
        return;
      }

      const filename = makeUniqueRoundFilename(cleanTitle);

      const roundData = {
		title: cleanTitle,
		subtitle: cleanSubtitle || `Top ${items.length}`,
		source: cleanSource,
		notes: cleanNotes,
		items
	  };

      fs.writeFileSync(
        path.join(ROUNDS_DIR, filename),
        JSON.stringify(roundData, null, 2),
        "utf8"
      );

      socket.emit("round:createResult", {
        ok: true,
        filename,
        itemCount: items.length
      });

      broadcastState();
    } catch (error) {
      console.error("Runde konnte nicht erstellt werden:", error);

      socket.emit("round:createResult", {
        ok: false,
        error: "Die Runde konnte nicht gespeichert werden."
      });
    }
  });
  
socket.on("settings:updateHotkeys", (hotkeys) => {
  appSettings.hotkeys = sanitizeHotkeys(hotkeys || {});
  saveSettings();
  broadcastState();
});

socket.on("settings:resetHotkeys", () => {
  appSettings.hotkeys = getDefaultSettings().hotkeys;
  saveSettings();
  broadcastState();
});
  
socket.on("saves:refresh", () => {
  broadcastState();
});

socket.on("save:create", ({ name }) => {
  try {
    const cleanName = String(name || "").trim();

    if (!cleanName) {
      socket.emit("save:createResult", {
        ok: false,
        error: "Der Spielstand braucht einen Namen."
      });
      return;
    }

    ensureDataDirectories();

    const filename = makeUniqueSaveFilename(cleanName);
    const now = new Date().toISOString();

    const saveData = {
      ...buildGameSaveData(cleanName),
      createdAt: now,
      savedAt: now
    };

    fs.writeFileSync(
      path.join(SAVES_DIR, filename),
      JSON.stringify(saveData, null, 2),
      "utf8"
    );

    socket.emit("save:createResult", {
      ok: true,
      filename,
      name: cleanName
    });

    broadcastState();
  } catch (error) {
    console.error("Spielstand konnte nicht gespeichert werden:", error);

    socket.emit("save:createResult", {
      ok: false,
      error: "Der Spielstand konnte nicht gespeichert werden."
    });
  }
});

socket.on("save:load", (saveId) => {
  try {
    const filename = getSaveFilenameById(saveId);

    if (!filename) {
      socket.emit("save:loadResult", {
        ok: false,
        error: "Spielstand wurde nicht gefunden."
      });
      return;
    }

    const rawData = fs.readFileSync(path.join(SAVES_DIR, filename), "utf8");
    const saveData = JSON.parse(rawData);

    applyGameSaveData(saveData);
    saveGameState();

    socket.emit("save:loadResult", {
      ok: true,
      name: saveData.saveName || filename
    });

    broadcastState();
  } catch (error) {
    console.error("Spielstand konnte nicht geladen werden:", error);

    socket.emit("save:loadResult", {
      ok: false,
      error: "Der Spielstand konnte nicht geladen werden."
    });
  }
});

socket.on("save:delete", (saveId) => {
  try {
    const filename = getSaveFilenameById(saveId);

    if (!filename) {
      socket.emit("save:deleteResult", {
        ok: false,
        error: "Spielstand wurde nicht gefunden."
      });
      return;
    }

    fs.unlinkSync(path.join(SAVES_DIR, filename));

    socket.emit("save:deleteResult", {
      ok: true,
      filename
    });

    broadcastState();
  } catch (error) {
    console.error("Spielstand konnte nicht gelöscht werden:", error);

    socket.emit("save:deleteResult", {
      ok: false,
      error: "Der Spielstand konnte nicht gelöscht werden."
    });
  }
});
  
socket.on("round:duplicate", (roundId) => {
  try {
    const sourceFilename = getRoundFilenameById(roundId);

    if (!sourceFilename) {
      socket.emit("round:duplicateResult", {
        ok: false,
        error: "Runde wurde nicht gefunden."
      });
      return;
    }

    const sourceRound = readRoundFile(sourceFilename);

    const copyTitle = `${sourceRound.title} - Kopie`;
    const copyFilename = makeUniqueRoundFilename(copyTitle);

    const copyData = {
		title: copyTitle,
		subtitle: sourceRound.subtitle || `Top ${sourceRound.items.length}`,
		source: sourceRound.source || "",
		notes: sourceRound.notes || "",
		items: sourceRound.items
	};

    fs.writeFileSync(
      path.join(ROUNDS_DIR, copyFilename),
      JSON.stringify(copyData, null, 2),
      "utf8"
    );

    socket.emit("round:duplicateResult", {
      ok: true,
      filename: copyFilename,
      title: copyTitle,
      itemCount: sourceRound.items.length
    });

    broadcastState();
  } catch (error) {
    console.error("Runde konnte nicht dupliziert werden:", error);

    socket.emit("round:duplicateResult", {
      ok: false,
      error: "Die Runde konnte nicht dupliziert werden."
    });
  }
});

socket.on("round:toggleFavorite", (roundId) => {
  try {
    const filename = getRoundFilenameById(roundId);

    if (!filename) return;

    toggleRoundFavorite(roundId);
    broadcastState();
  } catch (error) {
    console.error("Favorit konnte nicht geändert werden:", error);
  }
});

socket.on("round:togglePlayed", (roundId) => {
  try {
    const filename = getRoundFilenameById(roundId);

    if (!filename) return;

    if (gameState.playedRoundIds.includes(roundId)) {
      gameState.playedRoundIds = gameState.playedRoundIds.filter(id => id !== roundId);
    } else {
      gameState.playedRoundIds.push(roundId);
    }

    persistAndBroadcast();
  } catch (error) {
    console.error("Gespielt-Markierung konnte nicht geändert werden:", error);
  }
});

socket.on("round:getForEdit", (roundId) => {
  try {
    const filename = getRoundFilenameById(roundId);

    if (!filename) {
      socket.emit("round:editData", {
        ok: false,
        error: "Runde wurde nicht gefunden."
      });
      return;
    }

    const round = readRoundFile(filename);

    socket.emit("round:editData", {
      ok: true,
      round
    });
  } catch (error) {
    console.error("Runde konnte nicht zum Bearbeiten geladen werden:", error);

    socket.emit("round:editData", {
      ok: false,
      error: "Runde konnte nicht geladen werden."
    });
  }
});

socket.on("round:update", ({ roundId, title, subtitle, source, notes, itemsText }) => {
  try {
    const filename = getRoundFilenameById(roundId);

    if (!filename) {
      socket.emit("round:updateResult", {
        ok: false,
        error: "Runde wurde nicht gefunden."
      });
      return;
    }

    const cleanTitle = String(title || "").trim();
	const cleanSubtitle = String(subtitle || "").trim();
	const cleanSource = String(source || "").trim();
	const cleanNotes = String(notes || "").trim();

	const items = parseItemsText(itemsText);

    if (!cleanTitle) {
      socket.emit("round:updateResult", {
        ok: false,
        error: "Die Runde braucht einen Titel."
      });
      return;
    }

    if (items.length === 0) {
      socket.emit("round:updateResult", {
        ok: false,
        error: "Die Runde braucht mindestens einen Listeneintrag."
      });
      return;
    }

    const roundData = {
		title: cleanTitle,
		subtitle: cleanSubtitle || `Top ${items.length}`,
		source: cleanSource,
		notes: cleanNotes,
		items
	};

    fs.writeFileSync(
      path.join(ROUNDS_DIR, filename),
      JSON.stringify(roundData, null, 2),
      "utf8"
    );

    if (gameState.currentRound && gameState.currentRound.id === roundId) {
      const updatedRound = readRoundFile(filename);
      gameState.currentRound = updatedRound;
      gameState.revealed = updatedRound.items.map(() => false);
    }

    socket.emit("round:updateResult", {
      ok: true,
      filename,
      itemCount: items.length
    });

    persistAndBroadcast();
  } catch (error) {
    console.error("Runde konnte nicht bearbeitet werden:", error);

    socket.emit("round:updateResult", {
      ok: false,
      error: "Die Runde konnte nicht gespeichert werden."
    });
  }
});

socket.on("round:delete", (roundId) => {
  try {
    const filename = getRoundFilenameById(roundId);

    if (!filename) {
      socket.emit("round:deleteResult", {
        ok: false,
        error: "Runde wurde nicht gefunden."
      });
      return;
    }

    fs.unlinkSync(path.join(ROUNDS_DIR, filename));
	
	gameState.playedRoundIds = gameState.playedRoundIds.filter(id => id !== roundId);
	removeRoundFromFavorites(roundId);

    if (gameState.currentRound && gameState.currentRound.id === roundId) {
      gameState.currentRound = null;
      gameState.revealed = [];
      gameState.activeTeamId = null;
	  gameState.answerCounter = null;

      gameState.teams = gameState.teams.map(team => ({
        ...team,
        bid: "",
        errors: 0
      }));
    }

    socket.emit("round:deleteResult", {
      ok: true,
      filename
    });

    persistAndBroadcast();
  } catch (error) {
    console.error("Runde konnte nicht gelöscht werden:", error);

    socket.emit("round:deleteResult", {
      ok: false,
      error: "Die Runde konnte nicht gelöscht werden."
    });
  }
});

  socket.on("round:load", (roundId) => {
    try {
      const round = readRoundFile(`${roundId}.json`);

      gameState.currentRound = round;
      gameState.revealed = round.items.map(() => false);

      gameState.teams = gameState.teams.map(team => ({
        ...team,
        bid: "",
        errors: 0
      }));

      gameState.activeTeamId = null;
	  gameState.answerCounter = null;

      persistAndBroadcast();
    } catch (error) {
      console.error("Runde konnte nicht geladen werden:", error);
    }
  });

  socket.on("item:toggle", (index) => {
    if (!gameState.currentRound) return;
    if (!Number.isInteger(index)) return;
    if (index < 0 || index >= gameState.currentRound.items.length) return;

    const wasRevealed = gameState.revealed[index] === true;

	gameState.revealed[index] = !wasRevealed;

	if (!wasRevealed && gameState.revealed[index]) {
		countAnswerReveal(index);
	}

	if (wasRevealed && !gameState.revealed[index]) {
		uncountAnswerReveal(index);
	}

	persistAndBroadcast();
  });

  socket.on("round:hideAll", () => {
    if (!gameState.currentRound) return;

    const previousRevealed = gameState.revealed.map(value => value === true);

	gameState.revealed = gameState.currentRound.items.map(() => false);

	previousRevealed.forEach((wasRevealed, index) => {
	if (wasRevealed) {
		uncountAnswerReveal(index);
	}
	});

	persistAndBroadcast();
  });

  socket.on("round:revealAll", () => {
    if (!gameState.currentRound) return;

    const previousRevealed = gameState.revealed.map(value => value === true);

	gameState.revealed = gameState.currentRound.items.map(() => true);

	previousRevealed.forEach((wasRevealed, index) => {
		if (!wasRevealed) {
			countAnswerReveal(index);
		}
	});

	persistAndBroadcast();
  });

  socket.on("team:add", () => {
	const teamId = getNextAvailableTeamId();
	
	const team = {
	  id: teamId,
	  name: `Team ${teamId}`,
	  players: "",
	  color: getDefaultTeamColor(teamId),
	  score: 0,
	  bid: "",
	  errors: 0
	};

  gameState.teams.push(team);
  sortTeamsById();

  persistAndBroadcast();
  });

  socket.on("team:update", ({ teamId, name, players, color }) => {
    const team = findTeam(teamId);
    if (!team) return;

    if (typeof name === "string") {
	  team.name = name.trim() || "Unbenanntes Team";
	}

	if (typeof players === "string") {
      team.players = players;
	}

	if (typeof color === "string") {
      team.color = normalizeTeamColor(color, team.color || getDefaultTeamColor(team.id));
	}

	persistAndBroadcast();
  });

  socket.on("team:remove", (teamId) => {
	gameState.teams = gameState.teams.filter(team => team.id !== teamId);

	if (gameState.activeTeamId === teamId) {
		gameState.activeTeamId = null;
		}

	if (
		gameState.answerCounter &&
		gameState.answerCounter.teamId === teamId &&
		!gameState.answerCounter.locked
	) {
		gameState.answerCounter = null;
	}

	sortTeamsById();

	persistAndBroadcast();
  });

  socket.on("team:scoreInput", ({ teamId, input }) => {
    const team = findTeam(teamId);
    if (!team) return;

    team.score = parseScoreInput(team.score, input);
    persistAndBroadcast();
  });

  socket.on("team:bidInput", ({ teamId, bid }) => {
    const team = findTeam(teamId);
    if (!team) return;

    const text = String(bid).trim();

    if (text === "") {
      team.bid = "";
    } else if (/^\d+$/.test(text)) {
      team.bid = parseInt(text, 10);
    }

	updateAnswerCounterTarget(team);
    persistAndBroadcast();
  });

  socket.on("team:errorsSet", ({ teamId, errors }) => {
    const team = findTeam(teamId);
    if (!team) return;

    const number = Math.max(0, Math.min(3, parseInt(errors, 10) || 0));
    team.errors = number;

    persistAndBroadcast();
  });
  
  socket.on("activeTeam:errorDelta", (delta) => {
	const activeTeam = getActiveTeam();

	if (!activeTeam) {
		return;
	}

	const change = Number(delta);

	if (!Number.isFinite(change)) {
		return;
	}

	const currentErrors = parseInt(activeTeam.errors, 10) || 0;
	const nextErrors = Math.max(0, Math.min(3, currentErrors + change));

	activeTeam.errors = nextErrors;

	persistAndBroadcast();
	});

  socket.on("team:setActive", (teamId) => {
	const team = findTeam(teamId);

	if (!team) {
		gameState.activeTeamId = null;
		gameState.answerCounter = null;
	} else {
		gameState.activeTeamId = teamId;
		startAnswerCounterForTeam(team);
	}

	persistAndBroadcast();
	});

  socket.on("team:clearActive", () => {
	gameState.activeTeamId = null;
	clearAnswerCounterIfUnlocked();
	persistAndBroadcast();
  });

  socket.on("round:finishWin", () => {
  try {
    if (!gameState.currentRound) {
      socket.emit("round:finishResult", {
        ok: false,
        error: "Es ist keine Runde geladen."
      });
      return;
    }

    const activeTeam = getActiveTeam();
    const bid = getActiveBidNumber();

    if (!activeTeam) {
      socket.emit("round:finishResult", {
        ok: false,
        error: "Es ist kein aktives Team gesetzt."
      });
      return;
    }

    if (bid === null) {
      socket.emit("round:finishResult", {
        ok: false,
        error: "Das aktive Team braucht ein gültiges Gebot."
      });
      return;
    }

    activeTeam.score += bid;

	const teamName = activeTeam.name;
	const roundTitle = gameState.currentRound.title;

	addHistoryEntry({
	  type: "win",
	  roundId: gameState.currentRound.id,
	  roundTitle,
	  activeTeamId: activeTeam.id,
	  activeTeamName: teamName,
	  bid,
	  awardedPoints: [
		{
		  teamId: activeTeam.id,
		  teamName,
		  teamColor: normalizeTeamColor(activeTeam.color, getDefaultTeamColor(activeTeam.id)),
		  points: bid
		}
	  ]
	});

	markCurrentRoundAsPlayed();
	resetRoundTeamState();

    persistAndBroadcast();

    socket.emit("round:finishResult", {
      ok: true,
      message: `Runde abgeschlossen: ${roundTitle}\n${teamName} erhält +${bid} Punkte.`
    });
  } catch (error) {
    console.error("Runde konnte nicht als gewonnen abgeschlossen werden:", error);

    socket.emit("round:finishResult", {
      ok: false,
      error: "Die Runde konnte nicht abgeschlossen werden."
    });
  }
});

  socket.on("round:finishLoss", () => {
  try {
    if (!gameState.currentRound) {
      socket.emit("round:finishResult", {
        ok: false,
        error: "Es ist keine Runde geladen."
      });
      return;
    }

    const activeTeam = getActiveTeam();
    const bid = getActiveBidNumber();

    if (!activeTeam) {
      socket.emit("round:finishResult", {
        ok: false,
        error: "Es ist kein aktives Team gesetzt."
      });
      return;
    }

    if (bid === null) {
      socket.emit("round:finishResult", {
        ok: false,
        error: "Das aktive Team braucht ein gültiges Gebot."
      });
      return;
    }

    const otherTeams = gameState.teams.filter(team => team.id !== activeTeam.id);

    if (otherTeams.length === 0) {
      socket.emit("round:finishResult", {
        ok: false,
        error: "Es gibt kein anderes Team, das Punkte erhalten könnte."
      });
      return;
    }

    const lossPoints = Math.floor(bid / 2);

    otherTeams.forEach(team => {
	  team.score += lossPoints;
	});

	const activeTeamName = activeTeam.name;
	const receiverNames = otherTeams.map(team => team.name).join(", ");
	const roundTitle = gameState.currentRound.title;
  const receiverText = otherTeams.length === 1
  ? `${receiverNames} erhält +${lossPoints} Punkte.`
  : `${receiverNames} erhalten jeweils +${lossPoints} Punkte.`;

	addHistoryEntry({
	  type: "loss",
	  roundId: gameState.currentRound.id,
	  roundTitle,
	  activeTeamId: activeTeam.id,
	  activeTeamName,
	  bid,
	  awardedPoints: otherTeams.map(team => ({
		teamId: team.id,
		teamName: team.name,
		teamColor: normalizeTeamColor(team.color, getDefaultTeamColor(team.id)),
		points: lossPoints
	  }))
	});

	markCurrentRoundAsPlayed();
	resetRoundTeamState();

    persistAndBroadcast();

    socket.emit("round:finishResult", {
      ok: true,
      message: `Runde abgeschlossen: ${roundTitle}\n${activeTeamName} scheitert.\n${receiverText}`
    });
  } catch (error) {
    console.error("Runde konnte nicht als verloren abgeschlossen werden:", error);

    socket.emit("round:finishResult", {
      ok: false,
      error: "Die Runde konnte nicht abgeschlossen werden."
    });
  }
});

  socket.on("history:clear", () => {
	gameState.history = [];
	persistAndBroadcast();
  });

  socket.on("timer:setDuration", (minutes) => {
    const parsedMinutes = Number(minutes);

    if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) return;

    const seconds = Math.round(parsedMinutes * 60);

    gameState.timer.duration = seconds;
    gameState.timer.remaining = seconds;
    gameState.timer.running = false;

    persistAndBroadcast();
  });

  socket.on("timer:start", () => {
    if (gameState.timer.remaining <= 0) {
      gameState.timer.remaining = gameState.timer.duration;
    }

    gameState.timer.running = true;
    broadcastState();
  });

  socket.on("timer:pause", () => {
    gameState.timer.running = false;
    saveGameState();
    broadcastState();
  });

  socket.on("timer:reset", () => {
    gameState.timer.running = false;
    gameState.timer.remaining = gameState.timer.duration;
    persistAndBroadcast();
  });

  socket.on("disconnect", () => {
    console.log("Ein Fenster wurde getrennt:", socket.id);
  });

	socket.on("game:reset", () => {
	resetGameState();
  });
});

loadSettings();
loadFavorites();
loadGameState();
startTimerInterval();

server.listen(PORT, () => {
  console.log("Listen-Legenden läuft!");
  console.log(`Moderator: http://localhost:${PORT}/moderator.html`);
  console.log(`Spieler:   http://localhost:${PORT}/player.html`);
  console.log(`Runden:    http://localhost:${PORT}/api/rounds`);
});