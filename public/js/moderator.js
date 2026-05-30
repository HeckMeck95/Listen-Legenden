const socket = io();

const roundCards = document.getElementById("roundCards");
const roundSearchInput = document.getElementById("roundSearchInput");
const clearRoundSearchBtn = document.getElementById("clearRoundSearchBtn");
const roundSearchInfo = document.getElementById("roundSearchInfo");
const currentRoundInfo = document.getElementById("currentRoundInfo");
const currentRoundNotes = document.getElementById("currentRoundNotes");
const roundFinishInfo = document.getElementById("roundFinishInfo");
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

let state = null;
const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");

let activeModeratorTab = localStorage.getItem("listenLegendenActiveTab") || "dashboard";
let roundSearchTerm = "";

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    switchModeratorTab(button.dataset.tabTarget);
  });
});

switchModeratorTab(activeModeratorTab);

socket.emit("role:moderator");

socket.on("state:update", (newState) => {
  state = newState;
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

openPlayerBtn.addEventListener("click", () => {
  window.open("/player.html", "ListenLegendenPlayer", "width=1400,height=900");
});

refreshRoundsBtn.addEventListener("click", () => {
  socket.emit("rounds:refresh");
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

createRoundBtn.addEventListener("click", () => {
  socket.emit("round:create", {
	title: newRoundTitle.value,
	subtitle: newRoundSubtitle.value,
	source: newRoundSource.value,
	notes: newRoundNotes.value,
	itemsText: newRoundItems.value
  });
});

saveRoundChangesBtn.addEventListener("click", () => {
  socket.emit("round:update", {
	roundId: editingRoundId.value,
	title: newRoundTitle.value,
	subtitle: newRoundSubtitle.value,
	source: newRoundSource.value,
	notes: newRoundNotes.value,
	itemsText: newRoundItems.value
  });
});

cancelEditRoundBtn.addEventListener("click", () => {
  exitRoundEditMode(true);
});

resetGameBtn.addEventListener("click", () => {
  const ok = confirm(
    "Wirklich ein neues Spiel starten?\n\nAlle Teams, Punkte, Gebote, Fehler und die aktuelle Runde werden gelöscht."
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

finishWinBtn.addEventListener("click", () => {
  const info = getRoundFinishPreview();

  if (!info.ok) {
    alert(info.error);
    return;
  }

  const ok = confirm(
    `Runde als GEWONNEN abschließen?\n\n` +
    `${info.activeTeam.name} erhält +${info.bid} Punkte.\n\n` +
    `Danach werden Gebote und Fehler zurückgesetzt.`
  );

  if (ok) {
    socket.emit("round:finishWin");
  }
});

finishLossBtn.addEventListener("click", () => {
  const info = getRoundFinishPreview();

  if (!info.ok) {
    alert(info.error);
    return;
  }

  if (info.otherTeams.length === 0) {
    alert("Es gibt kein anderes Team, das Punkte erhalten könnte.");
    return;
  }

  const receiverNames = info.otherTeams.map(team => team.name).join(", ");

  const ok = confirm(
    `Runde als VERLOREN abschließen?\n\n` +
    `${info.activeTeam.name} erhält keine Punkte.\n` +
    `${receiverNames} erhalten jeweils +${info.lossPoints} Punkte.\n\n` +
    `Danach werden Gebote und Fehler zurückgesetzt.`
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
  `;
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

      <label>
        Teamname
        <input type="text" value="${escapeAttribute(team.name)}" data-field="name" />
      </label>

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
    const playersInput = card.querySelector('[data-field="players"]');
    const scoreInput = card.querySelector('[data-field="scoreInput"]');
    const bidInput = card.querySelector('[data-field="bid"]');

    nameInput.addEventListener("change", () => {
      socket.emit("team:update", {
        teamId: team.id,
        name: nameInput.value,
        players: playersInput.value
      });
    });

    playersInput.addEventListener("change", () => {
      socket.emit("team:update", {
        teamId: team.id,
        name: nameInput.value,
        players: playersInput.value
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

    card.querySelector('[data-action="remove"]').addEventListener("click", () => {
      const ok = confirm(`Team "${team.name}" wirklich löschen?`);
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

function renderRounds() {
  roundCards.innerHTML = "";

  if (!state.rounds || state.rounds.length === 0) {
    roundSearchInfo.textContent = "";
    roundCards.innerHTML = `<p class="hint">Keine Runden gefunden. Lege JSON-Dateien im Ordner "rounds" ab.</p>`;
    return;
  }

  const filteredRounds = getFilteredRounds(state.rounds);

  if (roundSearchTerm) {
    roundSearchInfo.textContent = `${filteredRounds.length} von ${state.rounds.length} Runden gefunden.`;
  } else {
    roundSearchInfo.textContent = `${state.rounds.length} Runden verfügbar.`;
  }

  if (filteredRounds.length === 0) {
    roundCards.innerHTML = `<p class="hint">Keine Runde passt zu deiner Suche.</p>`;
    return;
  }

  filteredRounds.forEach(round => {
    const card = document.createElement("div");
    card.className = `round-card ${round.played ? "played" : ""}`;

    card.innerHTML = `
      <div>
        <div class="round-card-title">${escapeHtml(round.title)}</div>
        <div class="round-card-meta">${escapeHtml(round.subtitle)} · ${round.itemCount} Einträge</div>
      </div>

      <div class="round-card-actions">
		<button class="small-button" data-action="load">Laden</button>
		<button class="secondary small-button" data-action="played">
		  ${round.played ? "Nicht gespielt" : "Gespielt"}
		</button>
		<button class="secondary small-button" data-action="duplicate">Duplizieren</button>
		<button class="secondary small-button" data-action="edit">Bearbeiten</button>
		<button class="danger small-button" data-action="delete">Löschen</button>
	  </div>
    `;

    card.querySelector('[data-action="load"]').addEventListener("click", () => {
	  socket.emit("round:load", round.id);
	  switchModeratorTab("current");
	});

    card.querySelector('[data-action="played"]').addEventListener("click", () => {
      socket.emit("round:togglePlayed", round.id);
    });
	
	card.querySelector('[data-action="duplicate"]').addEventListener("click", () => {
	  socket.emit("round:duplicate", round.id);
	});

    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
      socket.emit("round:getForEdit", round.id);
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", () => {
      const ok = confirm(
        `Runde wirklich löschen?\n\n${round.title}\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
      );

      if (ok) {
        socket.emit("round:delete", round.id);
      }
    });

    roundCards.appendChild(card);
  });
}

function getFilteredRounds(rounds) {
  if (!roundSearchTerm) {
    return rounds;
  }

  return rounds.filter(round => {
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