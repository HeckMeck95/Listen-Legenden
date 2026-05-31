const socket = io();

const roundCards = document.getElementById("roundCards");
const historySummary = document.getElementById("historySummary");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const saveGameNameInput = document.getElementById("saveGameNameInput");
const createSaveGameBtn = document.getElementById("createSaveGameBtn");
const refreshSaveGamesBtn = document.getElementById("refreshSaveGamesBtn");
const saveGameSearchInput = document.getElementById("saveGameSearchInput");
const clearSaveGameSearchBtn = document.getElementById("clearSaveGameSearchBtn");
const saveGameInfo = document.getElementById("saveGameInfo");
const saveGameList = document.getElementById("saveGameList");
const hotkeyRows = document.getElementById("hotkeyRows");
const resetDefaultHotkeysBtn = document.getElementById("resetDefaultHotkeysBtn");
const roundSearchInput = document.getElementById("roundSearchInput");
const clearRoundSearchBtn = document.getElementById("clearRoundSearchBtn");
const roundSearchInfo = document.getElementById("roundSearchInfo");
const roundFilterToggleBtn = document.getElementById("roundFilterToggleBtn");
const roundFilterToggleText = document.getElementById("roundFilterToggleText");
const roundFilterMenu = document.getElementById("roundFilterMenu");
const roundFilterArrow = document.getElementById("roundFilterArrow");
const roundFilterOptionButtons = document.querySelectorAll("[data-filter-type][data-filter-value]");
const clearRoundFiltersBtn = document.getElementById("clearRoundFiltersBtn");
const currentRoundInfo = document.getElementById("currentRoundInfo");
const currentRoundNotes = document.getElementById("currentRoundNotes");
const roundFinishInfo = document.getElementById("roundFinishInfo");
const activeTeamQuickControls = document.getElementById("activeTeamQuickControls");
const moderatorItems = document.getElementById("moderatorItems");
const teamControls = document.getElementById("teamControls");

const openPlayerBtn = document.getElementById("openPlayerBtn");
const resetGameBtn = document.getElementById("resetGameBtn");
const hideAllBtn = document.getElementById("hideAllBtn");
const revealAllBtn = document.getElementById("revealAllBtn");
const addTeamBtn = document.getElementById("addTeamBtn");
const clearActiveBtn = document.getElementById("clearActiveBtn");
const finishWinBtn = document.getElementById("finishWinBtn");
const finishLossBtn = document.getElementById("finishLossBtn");

const timerMinutesInput = document.getElementById("timerMinutesInput");
const setTimerBtn = document.getElementById("setTimerBtn");
const startTimerBtn = document.getElementById("startTimerBtn");
const pauseTimerBtn = document.getElementById("pauseTimerBtn");
const resetTimerBtn = document.getElementById("resetTimerBtn");
const timerStatus = document.getElementById("timerStatus");
const refreshRoundsBtn = document.getElementById("refreshRoundsBtn");
const randomOpenRoundBtn = document.getElementById("randomOpenRoundBtn");
const roundEditorTitle = document.getElementById("roundEditorTitle");
const roundEditorHint = document.getElementById("roundEditorHint");
const editingRoundId = document.getElementById("editingRoundId");
const newRoundTitle = document.getElementById("newRoundTitle");
const newRoundSubtitle = document.getElementById("newRoundSubtitle");
const newRoundSource = document.getElementById("newRoundSource");
const newRoundNotes = document.getElementById("newRoundNotes");
const newRoundItems = document.getElementById("newRoundItems");
const createRoundBtn = document.getElementById("createRoundBtn");
const saveRoundChangesBtn = document.getElementById("saveRoundChangesBtn");
const cancelEditRoundBtn = document.getElementById("cancelEditRoundBtn");

const appModalOverlay = document.getElementById("appModalOverlay");
const appModalTitle = document.getElementById("appModalTitle");
const appModalMessage = document.getElementById("appModalMessage");
const appModalCancelBtn = document.getElementById("appModalCancelBtn");
const appModalConfirmBtn = document.getElementById("appModalConfirmBtn");
const appModalCloseBtn = document.getElementById("appModalCloseBtn");

let activeModalResolve = null;
let activeModalKeyHandler = null;

let state = null;

const DEFAULT_HOTKEYS = {
  timerToggle: "Space",
  timerReset: "KeyR",
  hideAll: "KeyH",
  revealAll: "",
  finishWin: "KeyG",
  finishLoss: "KeyV",
  activeErrorPlus: "KeyF",
  activeErrorMinus: "KeyD"
};

const HOTKEY_ACTIONS = [
  {
    id: "timerToggle",
    label: "Timer Start/Pause",
    description: "Startet oder pausiert den Timer."
  },
  {
    id: "timerReset",
    label: "Timer Reset",
    description: "Setzt den Timer auf die eingestellte Dauer zurück."
  },
  {
    id: "hideAll",
    label: "Alle Antworten verstecken",
    description: "Verdeckt alle Antworten der aktuellen Runde."
  },
  {
    id: "revealAll",
    label: "Alle Antworten zeigen",
    description: "Deckt alle Antworten auf. Standardmäßig nicht belegt."
  },
  {
    id: "finishWin",
    label: "Runde gewonnen",
    description: "Öffnet die Bestätigung für einen gewonnenen Rundenabschluss."
  },
  {
	id: "finishLoss",
	label: "Runde verloren",
	description: "Öffnet die Bestätigung für einen verlorenen Rundenabschluss."
  },
  {
	id: "activeErrorPlus",
	label: "+ Fehler aktives Team",
	description: "Erhöht die Fehler des aktiven Teams um 1."
  },
  {
	id: "activeErrorMinus",
	label: "- Fehler aktives Team",
	description: "Senkt die Fehler des aktiven Teams um 1."
  }
];

let currentHotkeys = { ...DEFAULT_HOTKEYS };
let hotkeyCaptureAction = null;

const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");

let activeModeratorTab = localStorage.getItem("listenLegendenActiveTab") || "dashboard";
let roundSearchTerm = "";
let saveGameSearchTerm = "";
let activeRoundStatusFilter = "all";
let activeRoundSizeFilter = "all";

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    switchModeratorTab(button.dataset.tabTarget);
  });
});

switchModeratorTab(activeModeratorTab);

document.addEventListener("keydown", handleGlobalHotkeys);

document.addEventListener("click", event => {
  if (!event.target.closest(".round-options")) {
    closeAllRoundOptionMenus();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeAllRoundOptionMenus();
  }
});

socket.emit("role:moderator");

socket.on("state:update", (newState) => {
  state = newState;

  currentHotkeys = {
    ...DEFAULT_HOTKEYS,
    ...(newState.settings?.hotkeys || {})
  };

  render();
});

socket.on("round:createResult", (result) => {
  if (!result.ok) {
    alert(result.error || "Die Runde konnte nicht gespeichert werden.");
    return;
  }

  alert(`Runde gespeichert: ${result.filename}\nEinträge: ${result.itemCount}`);

  exitRoundEditMode(true);
});

socket.on("round:editData", (result) => {
  if (!result.ok) {
    alert(result.error || "Die Runde konnte nicht geladen werden.");
    return;
  }

  enterRoundEditMode(result.round);
});

socket.on("round:updateResult", (result) => {
  if (!result.ok) {
    alert(result.error || "Die Runde konnte nicht gespeichert werden.");
    return;
  }

  alert(`Runde aktualisiert: ${result.filename}\nEinträge: ${result.itemCount}`);

  exitRoundEditMode(true);
});

socket.on("round:deleteResult", (result) => {
  if (!result.ok) {
    alert(result.error || "Die Runde konnte nicht gelöscht werden.");
    return;
  }

  alert(`Runde gelöscht: ${result.filename}`);
});

socket.on("round:duplicateResult", (result) => {
  if (!result.ok) {
    alert(result.error || "Die Runde konnte nicht dupliziert werden.");
    return;
  }

  alert(`Runde dupliziert: ${result.title}\nDatei: ${result.filename}\nEinträge: ${result.itemCount}`);
});

socket.on("round:finishResult", (result) => {
  if (!result.ok) {
    alert(result.error || "Die Runde konnte nicht abgeschlossen werden.");
    return;
  }

  alert(result.message || "Runde abgeschlossen.");
});

socket.on("save:createResult", (result) => {
  if (!result.ok) {
    showAppAlert(result.error || "Der Spielstand konnte nicht gespeichert werden.", "Speichern fehlgeschlagen");
    return;
  }

  showAppAlert(`Spielstand gespeichert:\n${result.name}`, "Spielstand gespeichert");
  saveGameNameInput.value = "";
});

socket.on("save:loadResult", (result) => {
  if (!result.ok) {
    showAppAlert(result.error || "Der Spielstand konnte nicht geladen werden.", "Laden fehlgeschlagen");
    return;
  }

  showAppAlert(`Spielstand geladen:\n${result.name}`, "Spielstand geladen");
  switchModeratorTab("dashboard");
});

socket.on("save:deleteResult", (result) => {
  if (!result.ok) {
    showAppAlert(result.error || "Der Spielstand konnte nicht gelöscht werden.", "Löschen fehlgeschlagen");
    return;
  }

  showAppAlert(`Spielstand gelöscht:\n${result.filename}`, "Spielstand gelöscht");
});

resetDefaultHotkeysBtn.addEventListener("click", async () => {
  const ok = await showAppConfirm(
    "Hotkeys wirklich auf Standard zurücksetzen?",
    {
      title: "Hotkeys zurücksetzen?",
      confirmText: "Zurücksetzen",
      danger: false
    }
  );

  if (ok) {
    hotkeyCaptureAction = null;
    socket.emit("settings:resetHotkeys");
  }
});

openPlayerBtn.addEventListener("click", () => {
  window.open("/player.html", "ListenLegendenPlayer", "width=1400,height=900");
});

refreshRoundsBtn.addEventListener("click", () => {
  socket.emit("rounds:refresh");
});

randomOpenRoundBtn.addEventListener("click", () => {
  loadRandomOpenRound();
});

roundSearchInput.addEventListener("input", () => {
  roundSearchTerm = roundSearchInput.value.trim().toLowerCase();
  renderRounds();
});

clearRoundSearchBtn.addEventListener("click", () => {
  roundSearchInput.value = "";
  roundSearchTerm = "";
  renderRounds();
  roundSearchInput.focus();
});

roundFilterToggleBtn.addEventListener("click", () => {
  const isOpen = roundFilterMenu.classList.toggle("open");
  roundFilterArrow.textContent = isOpen ? "▲" : "▼";
});

roundFilterOptionButtons.forEach(button => {
  button.addEventListener("click", () => {
    const type = button.dataset.filterType;
    const value = button.dataset.filterValue;

    if (type === "status") {
      activeRoundStatusFilter = value;
    }

    if (type === "size") {
      activeRoundSizeFilter = value;
    }

    updateRoundFilterUi();
    renderRounds();
  });
});

clearRoundFiltersBtn.addEventListener("click", () => {
  activeRoundStatusFilter = "all";
  activeRoundSizeFilter = "all";

  updateRoundFilterUi();
  renderRounds();
});

createRoundBtn.addEventListener("click", () => {
  socket.emit("round:create", {
	title: newRoundTitle.value,
	subtitle: normalizeTagText(newRoundSubtitle.value),
	source: newRoundSource.value,
	notes: newRoundNotes.value,
	itemsText: newRoundItems.value
  });
});

saveRoundChangesBtn.addEventListener("click", () => {
  socket.emit("round:update", {
	roundId: editingRoundId.value,
	title: newRoundTitle.value,
	subtitle: normalizeTagText(newRoundSubtitle.value),
	source: newRoundSource.value,
	notes: newRoundNotes.value,
	itemsText: newRoundItems.value
  });
});

cancelEditRoundBtn.addEventListener("click", () => {
  exitRoundEditMode(true);
});

resetGameBtn.addEventListener("click", async () => {
  const ok = await showAppConfirm(
    "Wirklich ein neues Spiel starten?\n\nAlle Teams, Punkte, Gebote, Fehler und die aktuelle Runde werden gelöscht.",
    {
      title: "Neues Spiel starten?",
      confirmText: "Neues Spiel",
      danger: true
    }
  );

  if (ok) {
    socket.emit("game:reset");
  }
});

hideAllBtn.addEventListener("click", () => {
  socket.emit("round:hideAll");
});

revealAllBtn.addEventListener("click", () => {
  socket.emit("round:revealAll");
});

addTeamBtn.addEventListener("click", () => {
  socket.emit("team:add");
});

clearActiveBtn.addEventListener("click", () => {
  socket.emit("team:clearActive");
});

clearHistoryBtn.addEventListener("click", async () => {
  const ok = await showAppConfirm(
    "Wirklich den kompletten Spielverlauf löschen?\n\nTeams, Punkte und Runden bleiben erhalten.",
    {
      title: "Verlauf leeren?",
      confirmText: "Verlauf leeren",
      danger: true
    }
  );

  if (ok) {
    socket.emit("history:clear");
  }
});

createSaveGameBtn.addEventListener("click", () => {
  const name = saveGameNameInput.value.trim();

  if (!name) {
    showAppAlert("Bitte gib einen Namen für den Spielstand ein.", "Name fehlt");
    saveGameNameInput.focus();
    return;
  }

  socket.emit("save:create", {
    name
  });
});

saveGameNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    createSaveGameBtn.click();
  }
});

refreshSaveGamesBtn.addEventListener("click", () => {
  socket.emit("saves:refresh");
});

saveGameSearchInput.addEventListener("input", () => {
  saveGameSearchTerm = saveGameSearchInput.value.trim().toLowerCase();
  renderSaveGames();
});

clearSaveGameSearchBtn.addEventListener("click", () => {
  saveGameSearchInput.value = "";
  saveGameSearchTerm = "";
  renderSaveGames();
  saveGameSearchInput.focus();
});

finishWinBtn.addEventListener("click", async () => {
  const info = getRoundFinishPreview();

  if (!info.ok) {
    showAppAlert(info.error, "Runde kann nicht abgeschlossen werden");
    return;
  }

  const ok = await showAppConfirm(
    `Runde als GEWONNEN abschließen?\n\n` +
    `${info.activeTeam.name} erhält +${info.bid} Punkte.\n\n` +
    `Danach werden Gebote und Fehler zurückgesetzt.`,
    {
      title: "Runde gewonnen?",
      confirmText: "Abschließen",
      success: true
    }
  );

  if (ok) {
    socket.emit("round:finishWin");
  }
});

finishLossBtn.addEventListener("click", async () => {
  const info = getRoundFinishPreview();

  if (!info.ok) {
    showAppAlert(info.error, "Runde kann nicht abgeschlossen werden");
    return;
  }

  if (info.otherTeams.length === 0) {
    showAppAlert("Es gibt kein anderes Team, das Punkte erhalten könnte.", "Runde kann nicht abgeschlossen werden");
    return;
  }

const receiverNames = info.otherTeams.map(team => team.name).join(", ");
const receiverText = info.otherTeams.length === 1
  ? `${receiverNames} erhält +${info.lossPoints} Punkte.`
  : `${receiverNames} erhalten jeweils +${info.lossPoints} Punkte.`;

const ok = await showAppConfirm(
  `Runde als VERLOREN abschließen?\n\n` +
  `${info.activeTeam.name} erhält keine Punkte.\n` +
  `${receiverText}\n\n` +
  `Danach werden Gebote und Fehler zurückgesetzt.`,
  {
    title: "Runde verloren?",
    confirmText: "Abschließen",
    danger: true
  }
);

  if (ok) {
    socket.emit("round:finishLoss");
  }
});

setTimerBtn.addEventListener("click", () => {
  socket.emit("timer:setDuration", timerMinutesInput.value);
});

startTimerBtn.addEventListener("click", () => {
  socket.emit("timer:start");
});

pauseTimerBtn.addEventListener("click", () => {
  socket.emit("timer:pause");
});

resetTimerBtn.addEventListener("click", () => {
  socket.emit("timer:reset");
});

function render() {
  if (!state) return;

  renderDashboard();
  renderTimer();
  renderTeams();
  renderRounds();
  renderCurrentRound();
  renderActiveTeamQuickControls();
  renderSaveGames();
  renderHistory();
  renderSettings();
}

function switchModeratorTab(tabName) {
  activeModeratorTab = tabName;
  localStorage.setItem("listenLegendenActiveTab", tabName);

  tabButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.tabTarget === tabName);
  });

  tabPanels.forEach(panel => {
    panel.classList.toggle("active", panel.dataset.tabPanel === tabName);
  });
}

function renderDashboard() {
  const dashboardStatusCards = document.getElementById("dashboardStatusCards");
  if (!dashboardStatusCards || !state) return;

  const currentRoundTitle = state.currentRound
    ? state.currentRound.title
    : "Keine Runde geladen";

  const activeTeam = state.teams.find(team => team.id === state.activeTeamId);
  const activeTeamName = activeTeam ? activeTeam.name : "Kein aktives Team";

  const roundCount = state.rounds ? state.rounds.length : 0;
  const playedCount = state.rounds ? state.rounds.filter(round => round.played).length : 0;
  const openCount = roundCount - playedCount;

  const timerTextValue = state.timer
    ? `${formatTime(state.timer.remaining)} ${state.timer.running ? "läuft" : "pausiert"}`
    : "-";
  const historyCount = Array.isArray(state.history) ? state.history.length : 0;
  const saveCount = Array.isArray(state.saves) ? state.saves.length : 0;

  dashboardStatusCards.innerHTML = `
    <div class="dashboard-status-card">
      <span>Aktuelle Runde</span>
      <strong>${escapeHtml(currentRoundTitle)}</strong>
    </div>

    <div class="dashboard-status-card">
      <span>Teams</span>
      <strong>${state.teams.length}</strong>
    </div>

    <div class="dashboard-status-card">
      <span>Aktives Team</span>
      <strong>${escapeHtml(activeTeamName)}</strong>
    </div>

    <div class="dashboard-status-card">
      <span>Timer</span>
      <strong>${escapeHtml(timerTextValue)}</strong>
    </div>

    <div class="dashboard-status-card">
      <span>Runden verfügbar</span>
      <strong>${roundCount}</strong>
    </div>

    <div class="dashboard-status-card">
      <span>Gespielt / Offen</span>
      <strong>${playedCount} / ${openCount}</strong>
    </div>
	
	<div class="dashboard-status-card">
	  <span>Verlauf</span>
	  <strong>${historyCount} Einträge</strong>
	</div>
	
	<div class="dashboard-status-card">
	  <span>Spielstände</span>
	  <strong>${saveCount}</strong>
	</div>
  `;
}

function renderSettings() {
  if (!hotkeyRows) return;

  hotkeyRows.innerHTML = "";

  HOTKEY_ACTIONS.forEach(action => {
    const row = document.createElement("div");
    row.className = "hotkey-row";

    const keyCode = currentHotkeys[action.id] || "";
    const isCapturing = hotkeyCaptureAction === action.id;

    row.innerHTML = `
      <div class="hotkey-info">
        <strong>${escapeHtml(action.label)}</strong>
        <span>${escapeHtml(action.description)}</span>
      </div>

      <div class="hotkey-controls">
        <button class="hotkey-key-button ${isCapturing ? "recording" : ""}" data-action="set">
          ${isCapturing ? "Taste drücken..." : escapeHtml(formatHotkey(keyCode))}
        </button>

        <button class="secondary small-button" data-action="clear">Löschen</button>
      </div>
    `;

    row.querySelector('[data-action="set"]').addEventListener("click", () => {
      hotkeyCaptureAction = action.id;
      renderSettings();
    });

    row.querySelector('[data-action="clear"]').addEventListener("click", () => {
      hotkeyCaptureAction = null;
      setHotkey(action.id, "");
    });

    hotkeyRows.appendChild(row);
  });
}

function renderSaveGames() {
  if (!saveGameList || !saveGameInfo) return;

  const saves = Array.isArray(state.saves) ? state.saves : [];
  const filteredSaves = getFilteredSaveGames(saves);

  if (saveGameSearchTerm) {
    saveGameInfo.textContent = `${filteredSaves.length} von ${saves.length} Spielständen gefunden.`;
  } else {
    saveGameInfo.textContent = `${saves.length} Spielstände verfügbar.`;
  }

  saveGameList.innerHTML = "";

  if (saves.length === 0) {
    saveGameList.innerHTML = `<p class="hint">Noch keine manuellen Spielstände vorhanden.</p>`;
    return;
  }

  if (filteredSaves.length === 0) {
    saveGameList.innerHTML = `<p class="hint">Kein Spielstand passt zu deiner Suche.</p>`;
    return;
  }

  filteredSaves.forEach(save => {
    const card = document.createElement("div");
    card.className = "save-game-card";

    const teamBadges = renderSaveTeamBadges(save.teams);

    card.innerHTML = `
      <div class="save-game-head">
        <div>
          <h3>${escapeHtml(save.name)}</h3>
          <p>${formatDateTime(save.savedAt)} · ${escapeHtml(save.filename)}</p>
        </div>

        <div class="save-game-actions">
          <button data-action="load">Laden</button>
          <button class="danger" data-action="delete">Löschen</button>
        </div>
      </div>

      <div class="save-game-meta">
        <div><strong>Runde:</strong> ${escapeHtml(save.currentRoundTitle || "Keine Runde geladen")}</div>
        <div><strong>Teams:</strong> ${save.teamCount}</div>
        <div><strong>Gespielte Runden:</strong> ${save.playedRoundCount}</div>
        <div><strong>Verlauf:</strong> ${save.historyCount} Einträge</div>
      </div>

      ${teamBadges ? `<div class="save-team-badges">${teamBadges}</div>` : ""}
    `;

    card.querySelector('[data-action="load"]').addEventListener("click", async () => {
      const ok = await showAppConfirm(
        `Spielstand wirklich laden?\n\n${save.name}\n\nDer aktuelle Stand wird dadurch ersetzt.`,
        {
          title: "Spielstand laden?",
          confirmText: "Laden",
          success: true
        }
      );

      if (ok) {
        socket.emit("save:load", save.id);
      }
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const ok = await showAppConfirm(
        `Spielstand wirklich löschen?\n\n${save.name}\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
        {
          title: "Spielstand löschen?",
          confirmText: "Löschen",
          danger: true
        }
      );

      if (ok) {
        socket.emit("save:delete", save.id);
      }
    });

    saveGameList.appendChild(card);
  });
}

function getFilteredSaveGames(saves) {
  if (!saveGameSearchTerm) {
    return saves;
  }

  return saves.filter(save => {
    const searchableText = [
      save.name,
      save.filename,
      save.currentRoundTitle,
      save.teamCount,
      save.playedRoundCount,
      save.historyCount,
      ...(Array.isArray(save.teams) ? save.teams.map(team => `${team.name} ${team.score}`) : [])
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(saveGameSearchTerm);
  });
}

function renderSaveTeamBadges(teams) {
  if (!Array.isArray(teams) || teams.length === 0) {
    return "";
  }

  return teams
    .map(team => {
      const color = getTeamColor(team);

      return `
        <span class="save-team-badge" style="--team-color: ${escapeAttribute(color)};">
          <span>${escapeHtml(team.name)}</span>
          <strong>${team.score}</strong>
        </span>
      `;
    })
    .join("");
}

function renderHistory() {
  if (!historySummary || !historyList) return;

  const history = Array.isArray(state.history) ? state.history : [];

  if (history.length === 0) {
    historySummary.innerHTML = `<p class="hint">Noch keine abgeschlossenen Runden im Verlauf.</p>`;
    historyList.innerHTML = "";
    return;
  }

  const winCount = history.filter(entry => entry.type === "win").length;
  const lossCount = history.filter(entry => entry.type === "loss").length;

  historySummary.innerHTML = `
    <div class="history-summary-grid">
      <div class="history-summary-card">
        <span>Einträge</span>
        <strong>${history.length}</strong>
      </div>

      <div class="history-summary-card">
        <span>Gewonnen</span>
        <strong>${winCount}</strong>
      </div>

      <div class="history-summary-card">
        <span>Verloren</span>
        <strong>${lossCount}</strong>
      </div>
    </div>
  `;

  historyList.innerHTML = "";

  history.forEach(entry => {
    const card = document.createElement("div");
	card.className = `history-entry ${entry.type === "win" ? "win" : "loss"}`;

    const awardedHtml = Array.isArray(entry.awardedPoints) && entry.awardedPoints.length > 0
		? entry.awardedPoints
			.map(award => {
				const color = getHistoryTeamColor(award.teamId, award.teamColor);

				return `
					<span class="history-award-badge" style="--team-color: ${escapeAttribute(color)};">
						<span class="history-award-team">${escapeHtml(award.teamName)}</span>
						<strong>+${award.points}</strong>
					</span>
				`;
			})
			.join("")
		: `<span class="history-muted">Keine Punkte vergeben</span>`;

	const scoreHtml = Array.isArray(entry.scoresAfter)
		? entry.scoresAfter
			.map(score => {
				const color = getHistoryTeamColor(score.teamId, score.teamColor);

				return `
					<span class="history-score-badge" style="--team-color: ${escapeAttribute(color)};">
						<span>${escapeHtml(score.teamName)}</span>
						<strong>${score.score}</strong>
					</span>
				`;
			})
			.join("")
		: "";

    card.innerHTML = `
      <div class="history-entry-top">
        <div>
          <strong>${escapeHtml(entry.roundTitle || "Unbekannte Runde")}</strong>
          <span>${formatDateTime(entry.createdAt)}</span>
        </div>

        <div class="history-badge ${entry.type === "win" ? "win" : "loss"}">
          ${entry.type === "win" ? "Gewonnen" : "Verloren"}
        </div>
      </div>

      <div class="history-entry-body">
        <div><strong>Aktives Team:</strong> ${escapeHtml(entry.activeTeamName || "-")}</div>
        <div><strong>Gebot:</strong> ${entry.bid ?? "-"}</div>
        <div class="history-line">
		<strong>Punkte:</strong>
		<div class="history-awards">${awardedHtml}</div>
	</div>

	${scoreHtml ? `
		<div class="history-line">
			<strong>Stand danach:</strong>
			<div class="history-scores">${scoreHtml}</div>
		</div>
		` : ""}
      </div>
    `;

    historyList.appendChild(card);
  });
}

function getTeamColor(team) {
  if (team && /^#[0-9a-fA-F]{6}$/.test(String(team.color || ""))) {
    return team.color;
  }

  const defaults = ["#2563eb", "#16a34a", "#ca8a04", "#ea580c", "#dc2626"];
  const index = Math.max(0, Number(team?.id || 1) - 1) % defaults.length;

  return defaults[index];
}

function getHistoryTeamColor(teamId, storedColor) {
  if (/^#[0-9a-fA-F]{6}$/.test(String(storedColor || ""))) {
    return storedColor;
  }

  const currentTeam = state.teams.find(team => team.id === teamId);

  return getTeamColor(currentTeam || { id: teamId });
}

function handleGlobalHotkeys(event) {
  if (hotkeyCaptureAction) {
    handleHotkeyCapture(event);
    return;
  }

  if (isTypingTarget(event.target)) {
    return;
  }

  if (appModalOverlay && appModalOverlay.classList.contains("open")) {
    return;
  }

  const actionId = getActionIdForHotkey(event.code);

  if (!actionId) {
    return;
  }

  event.preventDefault();
  executeHotkeyAction(actionId);
}

function handleHotkeyCapture(event) {
  event.preventDefault();
  event.stopPropagation();

  if (event.code === "Escape") {
    hotkeyCaptureAction = null;
    renderSettings();
    return;
  }

  if (event.code === "Backspace" || event.code === "Delete") {
    const actionId = hotkeyCaptureAction;
    hotkeyCaptureAction = null;
    setHotkey(actionId, "");
    return;
  }

  const keyCode = normalizePressedKey(event);

  if (!keyCode) {
    return;
  }

  const actionId = hotkeyCaptureAction;
  hotkeyCaptureAction = null;

  setHotkey(actionId, keyCode);
}

function normalizePressedKey(event) {
  const blockedCodes = [
    "ShiftLeft",
    "ShiftRight",
    "ControlLeft",
    "ControlRight",
    "AltLeft",
    "AltRight",
    "MetaLeft",
    "MetaRight",
    "CapsLock"
  ];

  if (blockedCodes.includes(event.code)) {
    return "";
  }

  return event.code || "";
}

function getActionIdForHotkey(code) {
  return Object.entries(currentHotkeys).find(([, hotkeyCode]) => {
    return hotkeyCode && hotkeyCode === code;
  })?.[0] || null;
}

function setHotkey(actionId, keyCode) {
  if (keyCode) {
    const duplicateAction = HOTKEY_ACTIONS.find(action => {
      return action.id !== actionId && currentHotkeys[action.id] === keyCode;
    });

    if (duplicateAction) {
      showAppAlert(
        `Die Taste "${formatHotkey(keyCode)}" ist bereits für "${duplicateAction.label}" belegt.`,
        "Hotkey bereits vergeben"
      );

      renderSettings();
      return;
    }
  }

  const nextHotkeys = {
    ...currentHotkeys,
    [actionId]: keyCode
  };

  socket.emit("settings:updateHotkeys", nextHotkeys);
}

function executeHotkeyAction(actionId) {
  switch (actionId) {
    case "timerToggle":
      if (state?.timer?.running) {
        socket.emit("timer:pause");
      } else {
        socket.emit("timer:start");
      }
      break;

    case "timerReset":
      socket.emit("timer:reset");
      break;

    case "hideAll":
      socket.emit("round:hideAll");
      break;

    case "revealAll":
      socket.emit("round:revealAll");
      break;

    case "finishWin":
      finishWinBtn.click();
      break;

    case "finishLoss":
	  finishLossBtn.click();
	  break;

	case "activeErrorPlus":
	  socket.emit("activeTeam:errorDelta", 1);
	  break;

	case "activeErrorMinus":
	  socket.emit("activeTeam:errorDelta", -1);
	  break;

	default:
	break;
  }
}

function isTypingTarget(target) {
  if (!target) return false;

  const tagName = target.tagName;

  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

function formatHotkey(code) {
  if (!code) {
    return "Nicht gesetzt";
  }

  if (code === "Space") {
    return "Leertaste";
  }

  if (code.startsWith("Key")) {
    return code.replace("Key", "").toUpperCase();
  }

  if (code.startsWith("Digit")) {
    return code.replace("Digit", "");
  }

  if (code.startsWith("Numpad")) {
    return `Num ${code.replace("Numpad", "")}`;
  }

  const labels = {
    Backspace: "Backspace",
    Delete: "Entf",
    Enter: "Enter",
    Escape: "Esc",
    ArrowUp: "Pfeil hoch",
    ArrowDown: "Pfeil runter",
    ArrowLeft: "Pfeil links",
    ArrowRight: "Pfeil rechts"
  };

  return labels[code] || code;
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderTimer() {
  if (!state.timer) return;

  timerStatus.textContent = `${formatTime(state.timer.remaining)} ${state.timer.running ? "läuft" : "pausiert"}`;

  if (document.activeElement !== timerMinutesInput) {
    timerMinutesInput.value = state.timer.duration / 60;
  }
}

function renderTeams() {
  teamControls.innerHTML = "";

  if (!state.teams || state.teams.length === 0) {
    teamControls.innerHTML = `<p class="hint">Noch keine Teams angelegt.</p>`;
    return;
  }

  state.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = `moderator-team-card ${state.activeTeamId === team.id ? "active" : ""}`;

    card.innerHTML = `
      <div class="team-card-head">
        <strong>${escapeHtml(team.name)}</strong>
        <button class="danger small-button" data-action="remove">Löschen</button>
      </div>

      <div class="team-name-color-row">
		<label>
		  Teamname
		  <input type="text" value="${escapeAttribute(team.name)}" data-field="name" />
		</label>

		<label>
		  Teamfarbe
		  <input type="color" value="${escapeAttribute(getTeamColor(team))}" data-field="color" />
		</label>
	  </div>

      <label>
        Spieler im Team <span class="muted">(nur Moderator)</span>
        <textarea rows="2" data-field="players">${escapeHtml(team.players || "")}</textarea>
      </label>

      <div class="team-mini-grid">
        <label>
          Punktestand
          <div class="readonly-box">${team.score}</div>
        </label>

        <label>
          Punkte ändern
          <div class="inline-input-button">
            <input type="text" placeholder="+12 / -4 / 100" data-field="scoreInput" />
            <button data-action="score">OK</button>
          </div>
        </label>
      </div>

      <div class="team-mini-grid">
        <label>
          Gebot
          <input type="number" min="0" value="${escapeAttribute(team.bid)}" data-field="bid" />
        </label>

        <div>
          <span class="label-text">Fehler</span>
          <div class="error-buttons">
            <button class="${team.errors === 0 ? "selected" : ""}" data-errors="0">0</button>
            <button class="${team.errors === 1 ? "selected" : ""}" data-errors="1">1</button>
            <button class="${team.errors === 2 ? "selected" : ""}" data-errors="2">2</button>
            <button class="${team.errors === 3 ? "selected" : ""}" data-errors="3">3</button>
          </div>
        </div>
      </div>

      <button class="full-button ${state.activeTeamId === team.id ? "active-button" : ""}" data-action="active">
        ${state.activeTeamId === team.id ? "Aktives Team" : "Als aktives Team setzen"}
      </button>
    `;

    const nameInput = card.querySelector('[data-field="name"]');
	const colorInput = card.querySelector('[data-field="color"]');
    const playersInput = card.querySelector('[data-field="players"]');
    const scoreInput = card.querySelector('[data-field="scoreInput"]');
    const bidInput = card.querySelector('[data-field="bid"]');

    nameInput.addEventListener("change", () => {
	  socket.emit("team:update", {
      teamId: team.id,
      name: nameInput.value,
      players: playersInput.value,
      color: colorInput.value
    });
  });

	playersInput.addEventListener("change", () => {
	  socket.emit("team:update", {
      teamId: team.id,
      name: nameInput.value,
      players: playersInput.value,
      color: colorInput.value
	});
  });

	colorInput.addEventListener("input", () => {
	  socket.emit("team:update", {
      teamId: team.id,
      name: nameInput.value,
      players: playersInput.value,
      color: colorInput.value
	});
  });

    bidInput.addEventListener("change", () => {
      socket.emit("team:bidInput", {
        teamId: team.id,
        bid: bidInput.value
      });
    });

    scoreInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        socket.emit("team:scoreInput", {
          teamId: team.id,
          input: scoreInput.value
        });
      }
    });

    card.querySelector('[data-action="score"]').addEventListener("click", () => {
      socket.emit("team:scoreInput", {
        teamId: team.id,
        input: scoreInput.value
      });
    });

    card.querySelector('[data-action="remove"]').addEventListener("click", async () => {
  const ok = await showAppConfirm(
    `Team "${team.name}" wirklich löschen?`,
    {
      title: "Team löschen?",
      confirmText: "Löschen",
      danger: true
    }
  );

  if (ok) {
    socket.emit("team:remove", team.id);
  }
});

    card.querySelector('[data-action="active"]').addEventListener("click", () => {
      socket.emit("team:setActive", team.id);
    });

    card.querySelectorAll("[data-errors]").forEach(button => {
      button.addEventListener("click", () => {
        socket.emit("team:errorsSet", {
          teamId: team.id,
          errors: Number(button.dataset.errors)
        });
      });
    });

    teamControls.appendChild(card);
  });
}

function loadRandomOpenRound() {
  if (!state || !Array.isArray(state.rounds)) {
    alert("Es wurden noch keine Runden geladen.");
    return;
  }

  const candidates = getFilteredRounds(state.rounds).filter(round => !round.played);

  if (candidates.length === 0) {
    alert(
      "Keine offene Runde gefunden.\n\n" +
      "Tipp: Prüfe deine Suche und deine Filter. Wenn der Status-Filter auf „Gespielt“ steht, kann keine offene Runde ausgewählt werden."
    );
    return;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selectedRound = candidates[randomIndex];

  socket.emit("round:load", selectedRound.id);
  switchModeratorTab("current");
}

function renderRounds() {
  updateRoundFilterUi();

  roundCards.innerHTML = "";

  if (!state.rounds || state.rounds.length === 0) {
    roundSearchInfo.textContent = "";
    roundCards.innerHTML = `<p class="hint">Keine Runden gefunden. Lege JSON-Dateien im Ordner "rounds" ab.</p>`;
    return;
  }

  const filteredRounds = getFilteredRounds(state.rounds);
  const activeFilterLabel = getRoundFilterSummary();

  if (
    roundSearchTerm ||
    activeRoundStatusFilter !== "all" ||
    activeRoundSizeFilter !== "all"
  ) {
    roundSearchInfo.textContent =
      `${filteredRounds.length} von ${state.rounds.length} Runden gefunden` +
      ` · Filter: ${activeFilterLabel}`;
  } else {
    roundSearchInfo.textContent = `${state.rounds.length} Runden verfügbar.`;
  }

  if (filteredRounds.length === 0) {
    roundCards.innerHTML = `<p class="hint">Keine Runde passt zu deiner Suche oder deinen Filtern.</p>`;
    return;
  }

  filteredRounds.forEach(round => {
    const card = document.createElement("div");
    card.className = `round-card ${round.played ? "played" : ""} ${round.favorite ? "favorite" : ""}`;

    card.innerHTML = `
      <div class="round-card-main">
        <button class="round-favorite-button ${round.favorite ? "active" : ""}" data-action="favorite" title="Favorit umschalten">
          ${round.favorite ? "★" : "☆"}
        </button>

        <div class="round-card-content">
          <div class="round-card-title-row">
            <div>
              <div class="round-card-title">${escapeHtml(round.title)}</div>
              <div class="round-card-meta">${round.itemCount} Einträge</div>
            </div>

            <div class="round-options">
              <button class="round-options-button" data-action="menu" title="Optionen">⋯</button>

              <div class="round-options-menu">
                <button class="load-option" data-action="load">Laden</button>
                <button data-action="played">${round.played ? "Nicht gespielt" : "Gespielt"}</button>
                <button data-action="duplicate">Duplizieren</button>
                <button data-action="edit">Bearbeiten</button>
                <button class="danger-option" data-action="delete">Löschen</button>
              </div>
            </div>
          </div>

          ${renderRoundTags(round)}
        </div>
      </div>
    `;

    card.querySelector('[data-action="favorite"]').addEventListener("click", event => {
      event.stopPropagation();
      socket.emit("round:toggleFavorite", round.id);
    });

    card.querySelector('[data-action="menu"]').addEventListener("click", event => {
      event.stopPropagation();

      const menu = card.querySelector(".round-options-menu");
      const isOpen = menu.classList.contains("open");

      closeAllRoundOptionMenus();

      if (!isOpen) {
		card.classList.add("menu-open");
        menu.classList.add("open");
      }
    });

    card.querySelector('[data-action="load"]').addEventListener("click", () => {
      closeAllRoundOptionMenus();
      socket.emit("round:load", round.id);
      switchModeratorTab("current");
    });

    card.querySelector('[data-action="played"]').addEventListener("click", () => {
      closeAllRoundOptionMenus();
      socket.emit("round:togglePlayed", round.id);
    });

    card.querySelector('[data-action="duplicate"]').addEventListener("click", () => {
      closeAllRoundOptionMenus();
      socket.emit("round:duplicate", round.id);
    });

    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
      closeAllRoundOptionMenus();
      socket.emit("round:getForEdit", round.id);
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      closeAllRoundOptionMenus();

      const ok = await showAppConfirm(
        `Runde wirklich löschen?\n\n${round.title}\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
        {
          title: "Runde löschen?",
          confirmText: "Löschen",
          danger: true
        }
      );

      if (ok) {
        socket.emit("round:delete", round.id);
      }
    });

    roundCards.appendChild(card);
  });
}

function renderRoundTags(round) {
  const tags = getRoundTags(round);

  if (tags.length === 0) {
    return "";
  }

  return `
    <div class="round-tag-list">
      ${tags.map(tag => `<span class="round-tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function getRoundTags(round) {
  return String(round.subtitle || "")
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, 5)
    .map(tag => tag.slice(0, 10));
}

function normalizeTagText(value) {
  return String(value || "")
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .slice(0, 5)
    .map(tag => tag.slice(0, 10))
    .join(", ");
}

function closeAllRoundOptionMenus() {
  document.querySelectorAll(".round-options-menu.open").forEach(menu => {
    menu.classList.remove("open");
  });
  
  document.querySelectorAll(".round-card.menu-open").forEach(card => {
    card.classList.remove("menu-open");
  });
}

function getFilteredRounds(rounds) {
  return rounds.filter(round => {
    if (!matchesRoundStatusFilter(round)) {
      return false;
    }

    if (!matchesRoundSizeFilter(round)) {
      return false;
    }

    if (!roundSearchTerm) {
      return true;
    }

    const playedText = round.played ? "gespielt" : "offen";

    const searchableText = [
      round.title,
      round.subtitle,
      round.filename,
      round.itemCount,
      playedText
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(roundSearchTerm);
  });
}

function matchesRoundStatusFilter(round) {
  switch (activeRoundStatusFilter) {
    case "open":
      return !round.played;

    case "played":
      return round.played;

    case "all":
    default:
      return true;
  }
}

function matchesRoundSizeFilter(round) {
  const count = Number(round.itemCount);

  switch (activeRoundSizeFilter) {
    case "exact10":
      return count === 10;

    case "exact20":
      return count === 20;

    case "exact30":
      return count === 30;

    case "exact50":
      return count === 50;

    case "upTo20":
      return count <= 20;

    case "range20to30":
      return count >= 20 && count <= 30;

    case "range31to50":
      return count >= 31 && count <= 50;

    case "min20":
      return count >= 20;

    case "min30":
      return count >= 30;

    case "all":
    default:
      return true;
  }
}

function updateRoundFilterUi() {
  roundFilterOptionButtons.forEach(button => {
    const type = button.dataset.filterType;
    const value = button.dataset.filterValue;

    const isActive =
      (type === "status" && value === activeRoundStatusFilter) ||
      (type === "size" && value === activeRoundSizeFilter);

    button.classList.toggle("active", isActive);
  });

  if (roundFilterToggleText) {
    roundFilterToggleText.textContent = `Filter: ${getRoundFilterSummary()}`;
  }
}

function getRoundFilterSummary() {
  const labels = [];

  if (activeRoundStatusFilter !== "all") {
    labels.push(getRoundStatusFilterLabel(activeRoundStatusFilter));
  }

  if (activeRoundSizeFilter !== "all") {
    labels.push(getRoundSizeFilterLabel(activeRoundSizeFilter));
  }

  return labels.length > 0 ? labels.join(" + ") : "Alle";
}

function getRoundStatusFilterLabel(filterName) {
  switch (filterName) {
    case "open":
      return "Offen";

    case "played":
      return "Gespielt";

    case "all":
    default:
      return "Alle Status";
  }
}

function getRoundSizeFilterLabel(filterName) {
  switch (filterName) {
    case "exact10":
      return "Genau Top 10";

    case "exact20":
      return "Genau Top 20";

    case "exact30":
      return "Genau Top 30";

    case "exact50":
      return "Genau Top 50";

    case "upTo20":
      return "Bis 20";

    case "range20to30":
      return "20–30";

    case "range31to50":
      return "31–50";

    case "min20":
      return "Mindestens 20";

    case "min30":
      return "Mindestens 30";

    case "all":
    default:
      return "Alle Größen";
  }
}

function enterRoundEditMode(round) {
  editingRoundId.value = round.id;
  newRoundTitle.value = round.title || "";
  newRoundSubtitle.value = round.subtitle || "";
  newRoundSource.value = round.source || "";
  newRoundNotes.value = round.notes || "";
  newRoundItems.value = formatItemsForEditor(round.items);

  roundEditorTitle.textContent = "Runde bearbeiten";
  roundEditorHint.textContent = `Du bearbeitest gerade: ${round.filename}`;

  createRoundBtn.style.display = "none";
  saveRoundChangesBtn.style.display = "inline-block";
  cancelEditRoundBtn.style.display = "inline-block";

  newRoundTitle.focus();
}

function formatItemsForEditor(items) {
  if (!Array.isArray(items)) {
    return "";
  }

  return items
    .map(item => {
      if (typeof item === "string") {
        return item;
      }

      const text = item.text || "";
      const info = item.info || "";

      return info ? `${text} | ${info}` : text;
    })
    .join("\n");
}

function exitRoundEditMode(clearFields) {
  editingRoundId.value = "";

  if (clearFields) {
	newRoundTitle.value = "";
	newRoundSubtitle.value = "";
	newRoundSource.value = "";
	newRoundNotes.value = "";
	newRoundItems.value = "";
  }

  roundEditorTitle.textContent = "Runde erstellen";
  roundEditorHint.textContent = "Ein Eintrag pro Zeile. Die App speichert daraus automatisch eine JSON-Datei.";

  createRoundBtn.style.display = "inline-block";
  saveRoundChangesBtn.style.display = "none";
  cancelEditRoundBtn.style.display = "none";
}

function getRoundFinishPreview() {
  if (!state.currentRound) {
    return {
      ok: false,
      error: "Es ist keine Runde geladen."
    };
  }

  const activeTeam = state.teams.find(team => team.id === state.activeTeamId);

  if (!activeTeam) {
    return {
      ok: false,
      error: "Es ist kein aktives Team gesetzt."
    };
  }

  const bid = Number(activeTeam.bid);

  if (!Number.isFinite(bid) || bid <= 0) {
    return {
      ok: false,
      error: "Das aktive Team braucht ein gültiges Gebot."
    };
  }

  const cleanBid = Math.floor(bid);
  const otherTeams = state.teams.filter(team => team.id !== activeTeam.id);

  return {
    ok: true,
    activeTeam,
    bid: cleanBid,
    lossPoints: Math.floor(cleanBid / 2),
    otherTeams
  };
}

function renderRoundFinishInfo() {
  if (!state.currentRound) {
    roundFinishInfo.innerHTML = "";
    return;
  }

  const preview = getRoundFinishPreview();

  if (!preview.ok) {
    roundFinishInfo.innerHTML = `
      <div class="finish-preview muted-preview">
        Abschluss-Automatik: ${escapeHtml(preview.error)}
      </div>
    `;
    return;
  }

  const otherTeamText = preview.otherTeams.length > 0
    ? preview.otherTeams.map(team => escapeHtml(team.name)).join(", ")
    : "kein anderes Team";

  roundFinishInfo.innerHTML = `
    <div class="finish-preview">
      <strong>Abschluss-Automatik:</strong>
      Gewinn: ${escapeHtml(preview.activeTeam.name)} +${preview.bid}
      · Verlust: ${otherTeamText} je +${preview.lossPoints}
    </div>
  `;
}

function renderActiveTeamQuickControls() {
  if (!activeTeamQuickControls) return;

  if (!state.currentRound) {
    activeTeamQuickControls.innerHTML = "";
    return;
  }

  const activeTeam = state.teams.find(team => team.id === state.activeTeamId);

  if (!activeTeam) {
    activeTeamQuickControls.innerHTML = `
      <div class="active-team-quick-box muted">
        Kein aktives Team gesetzt.
      </div>
    `;
    return;
  }

  const errors = Math.max(0, Math.min(3, parseInt(activeTeam.errors, 10) || 0));
  const color = getTeamColor(activeTeam);

  activeTeamQuickControls.innerHTML = `
    <div class="active-team-quick-box" style="--team-color: ${escapeAttribute(color)};">
      <div class="active-team-quick-info">
        <span>Aktives Team</span>
        <strong>${escapeHtml(activeTeam.name)}</strong>
      </div>

      <div class="active-team-quick-errors">
        <span>Fehler</span>
        <strong>${errors}/3</strong>
      </div>

      <div class="active-team-quick-buttons">
        <button class="secondary small-button" data-action="active-error-minus">- Fehler</button>
        <button class="small-button" data-action="active-error-plus">+ Fehler</button>
      </div>
    </div>
  `;

  activeTeamQuickControls
    .querySelector('[data-action="active-error-minus"]')
    .addEventListener("click", () => {
      socket.emit("activeTeam:errorDelta", -1);
    });

  activeTeamQuickControls
    .querySelector('[data-action="active-error-plus"]')
    .addEventListener("click", () => {
      socket.emit("activeTeam:errorDelta", 1);
    });
}

function renderCurrentRound() {
  moderatorItems.innerHTML = "";

  if (!state.currentRound) {
	currentRoundInfo.textContent = "Noch keine Runde geladen.";
	currentRoundNotes.innerHTML = "";
	roundFinishInfo.innerHTML = "";
	return;
  }

  currentRoundInfo.textContent = `${state.currentRound.title} · ${state.currentRound.items.length} Einträge`;
  renderCurrentRoundNotes();
  renderRoundFinishInfo();

  const orderedItems = orderModeratorItemsForTwoColumns(state.currentRound.items);

  orderedItems.forEach(({ item, originalIndex }) => {
    const isRevealed = state.revealed[originalIndex];

    const row = document.createElement("div");
    row.className = `moderator-item ${isRevealed ? "revealed" : ""}`;

    row.innerHTML = `
	  <div class="item-number">${originalIndex + 1}</div>
	  <div class="item-text">
		<span class="moderator-answer-main">${escapeHtml(item.text)}</span>
		${item.info ? `<span class="moderator-answer-info">${escapeHtml(item.info)}</span>` : ""}
	  </div>
	`;

    row.addEventListener("click", () => {
      socket.emit("item:toggle", originalIndex);
    });

    moderatorItems.appendChild(row);
  });
}

function renderCurrentRoundNotes() {
  const source = state.currentRound.source || "";
  const notes = state.currentRound.notes || "";

  if (!source && !notes) {
    currentRoundNotes.innerHTML = "";
    return;
  }

  currentRoundNotes.innerHTML = `
    ${source ? `<div><strong>Quelle:</strong> ${escapeHtml(source)}</div>` : ""}
    ${notes ? `<div><strong>Notizen:</strong> ${escapeHtml(notes)}</div>` : ""}
  `;
}

function orderModeratorItemsForTwoColumns(items) {
  const half = Math.ceil(items.length / 2);
  const ordered = [];

  for (let i = 0; i < half; i++) {
    if (items[i]) {
      ordered.push({
        item: items[i],
        originalIndex: i
      });
    }

    if (items[i + half]) {
      ordered.push({
        item: items[i + half],
        originalIndex: i + half
      });
    }
  }

  return ordered;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showAppAlert(message, title = "Hinweis") {
  return showAppModal({
    title,
    message,
    confirmText: "OK",
    cancelText: null,
    danger: false,
    success: false
  });
}

function showAppConfirm(message, options = {}) {
  return showAppModal({
    title: options.title || "Bist du sicher?",
    message,
    confirmText: options.confirmText || "Bestätigen",
    cancelText: options.cancelText || "Abbrechen",
    danger: options.danger || false,
    success: options.success || false
  });
}

function showAppModal({ title, message, confirmText, cancelText, danger, success }) {
  return new Promise(resolve => {
    if (
      !appModalOverlay ||
      !appModalTitle ||
      !appModalMessage ||
      !appModalConfirmBtn ||
      !appModalCancelBtn ||
      !appModalCloseBtn
    ) {
      resolve(false);
      return;
    }

    closeAppModal(false, false);

    activeModalResolve = resolve;

    appModalTitle.textContent = title;
    appModalMessage.innerHTML = escapeHtml(message).replaceAll("\n", "<br>");

    appModalConfirmBtn.textContent = confirmText || "OK";
    appModalConfirmBtn.classList.toggle("app-modal-confirm-danger", Boolean(danger));
    appModalConfirmBtn.classList.toggle("app-modal-confirm-success", Boolean(success));

    if (cancelText) {
      appModalCancelBtn.textContent = cancelText;
      appModalCancelBtn.style.display = "inline-block";
    } else {
      appModalCancelBtn.style.display = "none";
    }

    appModalOverlay.classList.add("open");
    appModalOverlay.setAttribute("aria-hidden", "false");

    const confirm = () => closeAppModal(true);
    const cancel = () => closeAppModal(false);

    appModalConfirmBtn.onclick = confirm;
    appModalCancelBtn.onclick = cancel;
    appModalCloseBtn.onclick = cancel;

    activeModalKeyHandler = event => {
      if (event.key === "Escape") {
        cancel();
      }

      if (event.key === "Enter") {
        confirm();
      }
    };

    document.addEventListener("keydown", activeModalKeyHandler);

    setTimeout(() => {
      appModalConfirmBtn.focus();
    }, 0);
  });
}

function closeAppModal(result, resolveModal = true) {
  if (!appModalOverlay) return;

  appModalOverlay.classList.remove("open");
  appModalOverlay.setAttribute("aria-hidden", "true");

  if (activeModalKeyHandler) {
    document.removeEventListener("keydown", activeModalKeyHandler);
    activeModalKeyHandler = null;
  }

  appModalConfirmBtn.onclick = null;
  appModalCancelBtn.onclick = null;
  appModalCloseBtn.onclick = null;

  if (resolveModal && activeModalResolve) {
    activeModalResolve(result);
  }

  activeModalResolve = null;
}

window.alert = message => {
  showAppAlert(String(message || ""), "Listen-Legenden");
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}