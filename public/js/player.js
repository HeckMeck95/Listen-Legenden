const socket = io();

const roundTitle = document.getElementById("roundTitle");
const roundSubtitle = document.getElementById("roundSubtitle");
const playerItems = document.getElementById("playerItems");
const teamBar = document.getElementById("teamBar");
const playerTimer = document.getElementById("playerTimer");
const timerText = document.getElementById("timerText");

let state = null;

socket.emit("role:player");

socket.on("state:update", (newState) => {
  state = newState;
  render();
});

function render() {
  renderRound();
  renderTimer();
  renderTeams();
}

function renderRound() {
  if (!state || !state.currentRound) {
    clearListSizeClass();

    roundTitle.textContent = "Warte auf die nächste Runde...";
    roundSubtitle.textContent = "";
    playerItems.className = "player-items empty-state";
    playerItems.textContent = "Noch keine Kategorie geladen.";
    return;
  }

  roundTitle.textContent = state.currentRound.title;
  roundSubtitle.textContent = state.currentRound.subtitle || `${state.currentRound.itemCount} Einträge`;

  renderItems(state.currentRound.items);
}

function renderTimer() {
  if (!state || !state.timer) return;

  const duration = state.timer.duration || 1;
  const remaining = state.timer.remaining || 0;
  const progress = Math.max(0, Math.min(1, remaining / duration));
  const degrees = Math.round(progress * 360);

  playerTimer.style.setProperty("--timer-degrees", `${degrees}deg`);
  timerText.textContent = "";

  playerTimer.classList.toggle("running", state.timer.running);
  playerTimer.classList.toggle("finished", remaining === 0);
}

function renderItems(items) {
  const listSizeClass = getListSizeClass(items.length);
  clearListSizeClass();

  document.body.classList.add(listSizeClass);
  playerItems.className = `player-items ${listSizeClass}`;
  playerItems.innerHTML = "";

  const orderedItems = orderItemsForTwoColumns(items);
  const rowCount = Math.ceil(items.length / 2);

  orderedItems.forEach((item, displayIndex) => {
    const rowIndex = Math.floor(displayIndex / 2);
    const isLeftColumn = displayIndex % 2 === 0;
    const centerOffset = getCenterOffset(rowIndex, rowCount);

    const row = document.createElement("div");
    row.className = `
      player-item
      ${item.revealed ? "revealed" : "hidden"}
      ${isLeftColumn ? "left-column" : "right-column"}
    `;

    row.style.setProperty("--center-offset", `${centerOffset}px`);

    row.innerHTML = `
	  <div class="player-item-number">${item.number}</div>
	  <div class="player-item-text">
		<span class="answer-main">${item.revealed ? escapeHtml(item.text) : "Verdeckt"}</span>
		${item.revealed && item.info ? `<span class="answer-info">${escapeHtml(item.info)}</span>` : ""}
	  </div>
	`;

    playerItems.appendChild(row);
  });
}

function getListSizeClass(itemCount) {
  if (itemCount <= 10) {
    return "list-size-small";
  }

  if (itemCount <= 20) {
    return "list-size-medium";
  }

  if (itemCount <= 30) {
    return "list-size-large";
  }

  return "list-size-huge";
}

function clearListSizeClass() {
  document.body.classList.remove(
    "list-size-small",
    "list-size-medium",
    "list-size-large",
    "list-size-huge"
  );
}

function getCenterOffset(rowIndex, rowCount) {
  const centerRow = (rowCount - 1) / 2;
  const distanceFromCenter = Math.abs(rowIndex - centerRow);
  const maxOffset = 50;
  const fadeRows = Math.max(2.5, Math.min(8, rowCount * 0.38));
  const rawStrength = Math.max(0, 1 - distanceFromCenter / fadeRows);
  const smoothStrength = rawStrength * rawStrength * (3 - 2 * rawStrength);

  return Math.round(maxOffset * smoothStrength);
}

function renderTeams() {
  if (!state || !state.teams || state.teams.length === 0) {
    teamBar.innerHTML = `<div class="team-placeholder">Noch keine Teams angelegt.</div>`;
    return;
  }

  teamBar.innerHTML = "";

  state.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = `player-team-card ${state.activeTeamId === team.id ? "active" : ""}`;

    const bidText = team.bid === "" || team.bid === null || team.bid === undefined
      ? "-"
      : team.bid;

    card.innerHTML = `
	  <div class="player-team-name">${escapeHtml(team.name)}</div>
	  <div class="player-team-score">${team.score}</div>
	  <div class="player-team-bottom">
      <div class="player-team-bid">Gebot: <strong>${bidText}</strong></div>
      <div class="player-errors">
        ${renderErrorMarks(team.errors)}
      </div>
    </div>
  `;

    teamBar.appendChild(card);
  });
}

function renderErrorMarks(errors) {
  let html = "";

  for (let i = 1; i <= 3; i++) {
    html += `<span class="error-mark ${i <= errors ? "active" : ""}">×</span>`;
  }

  return html;
}

function orderItemsForTwoColumns(items) {
  const half = Math.ceil(items.length / 2);
  const ordered = [];

  for (let i = 0; i < half; i++) {
    if (items[i]) ordered.push(items[i]);
    if (items[i + half]) ordered.push(items[i + half]);
  }

  return ordered;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}