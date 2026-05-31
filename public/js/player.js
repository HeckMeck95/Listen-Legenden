const socket = io();

/* =========================================
   DOM references
   ========================================= */

const roundTitle = document.getElementById("roundTitle");
const roundSubtitle = document.getElementById("roundSubtitle");
const playerItems = document.getElementById("playerItems");
const teamBar = document.getElementById("teamBar");
const playerTimer = document.getElementById("playerTimer");
const timerText = document.getElementById("timerText");
const answerCounter = document.getElementById("answerCounter");
const fullscreenBtn = document.getElementById("fullscreenBtn");

/* =========================================
   Local player-view state
   ========================================= */

let state = null;
let previousRevealState = null;

/* =========================================
   Socket setup
   ========================================= */

socket.emit("role:player");

socket.on("state:update", (newState) => {
  state = newState;
  render();
});

/* =========================================
   Fullscreen setup
   ========================================= */

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", toggleFullscreen);

  document.addEventListener("fullscreenchange", () => {
    updateFullscreenButton();
  });

  updateFullscreenButton();
}

/* =========================================
   Main render flow
   ========================================= */

function render() {
  renderRound();
  renderTimer();
  renderAnswerCounter();
  renderTeams();
}

/* =========================================
   Round and item rendering
   ========================================= */

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
  roundSubtitle.textContent =
    state.currentRound.subtitle || `${state.currentRound.itemCount} Einträge`;

  renderItems(state.currentRound.items);
}

function renderItems(items) {
  const listSizeClass = getListSizeClass(items.length);

  clearListSizeClass();

  document.body.classList.add(listSizeClass);

  playerItems.className = `player-items ${listSizeClass} dynamic-list-layout`;
  playerItems.innerHTML = "";

  applyPlayerListLayout(items.length);

  const orderedItems = orderItemsForTwoColumns(items);
  const rowCount = Math.ceil(items.length / 2);

  orderedItems.forEach((item, displayIndex) => {
    const rowIndex = Math.floor(displayIndex / 2);
    const isLeftColumn = displayIndex % 2 === 0;
    const centerOffset = getCenterOffset(rowIndex, rowCount, items.length);

    const wasRevealedBefore = previousRevealState
      ? previousRevealState.get(item.number) === true
      : item.revealed;

    const justRevealed = item.revealed && !wasRevealedBefore;

    const row = document.createElement("div");
    row.className = `
      player-item
      ${item.revealed ? "revealed" : "hidden"}
      ${justRevealed ? "just-revealed" : ""}
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

  previousRevealState = new Map(
    items.map(item => [item.number, item.revealed])
  );
}

/* =========================================
   Dynamic list sizing
   ========================================= */

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

function applyPlayerListLayout(itemCount) {
  const isFullscreen = document.body.classList.contains("fullscreen-mode");
  const settings = getPlayerListLayoutSettings(itemCount, isFullscreen);

  Object.entries(settings).forEach(([key, value]) => {
    playerItems.style.setProperty(key, value);
  });
}

function getPlayerListLayoutSettings(itemCount, isFullscreen) {
  /*
    These values control the size and spacing of the visible list.

    rowHeight       = height of each item row
    rowGap          = vertical space between rows
    columnGap       = horizontal space between the two list columns
    numberWidth     = width of the number pill
    numberHeight    = height of the number pill
    numberFontSize  = font size of the number
    textFontSize    = font size of the answer text
    textPaddingY/X  = inner padding around answer text
    lineHeight      = answer text line height
  */

  const settings = {
    small: {
      // Lists with 10 or fewer entries.
      window: {
        rowHeight: "62px",
        rowGap: "18px",
        columnGap: "28px",
        numberWidth: "68px",
        numberHeight: "52px",
        numberFontSize: "27px",
        textFontSize: "clamp(26px, 2vw, 38px)",
        textPaddingY: "6px",
        textPaddingX: "18px",
        lineHeight: "1.30"
      },
      fullscreen: {
        rowHeight: "64px",
        rowGap: "18px",
        columnGap: "34px",
        numberWidth: "66px",
        numberHeight: "54px",
        numberFontSize: "27px",
        textFontSize: "clamp(25px, 2vw, 38px)",
        textPaddingY: "6px",
        textPaddingX: "16px",
        lineHeight: "1.30"
      }
    },

    medium: {
      // Lists with 11 to 20 entries.
      window: {
        rowHeight: "44px",
        rowGap: "16px",
        columnGap: "28px",
        numberWidth: "54px",
        numberHeight: "38px",
        numberFontSize: "21px",
        textFontSize: "clamp(19px, 1.45vw, 27px)",
        textPaddingY: "4px",
        textPaddingX: "14px",
        lineHeight: "1.30"
      },
      fullscreen: {
        rowHeight: "48px",
        rowGap: "12px",
        columnGap: "34px",
        numberWidth: "56px",
        numberHeight: "40px",
        numberFontSize: "22px",
        textFontSize: "clamp(20px, 1.55vw, 29px)",
        textPaddingY: "4px",
        textPaddingX: "14px",
        lineHeight: "1.30"
      }
    },

    large: {
      // Lists with 21 to 30 entries.
      window: {
        rowHeight: "36px",
        rowGap: "7px",
        columnGap: "28px",
        numberWidth: "44px",
        numberHeight: "32px",
        numberFontSize: "17px",
        textFontSize: "clamp(15px, 1.16vw, 21px)",
        textPaddingY: "3px",
        textPaddingX: "11px",
        lineHeight: "1.30"
      },
      fullscreen: {
        rowHeight: "39px",
        rowGap: "8px",
        columnGap: "34px",
        numberWidth: "48px",
        numberHeight: "34px",
        numberFontSize: "18px",
        textFontSize: "clamp(16px, 1.25vw, 23px)",
        textPaddingY: "3px",
        textPaddingX: "11px",
        lineHeight: "1.30"
      }
    },

    huge: {
      // Lists with more than 30 entries.
      window: {
        rowHeight: "24px",
        rowGap: "5px",
        columnGap: "24px",
        numberWidth: "35px",
        numberHeight: "22px",
        numberFontSize: "13px",
        textFontSize: "clamp(12px, 0.95vw, 16px)",
        textPaddingY: "1px",
        textPaddingX: "7px",
        lineHeight: "1.20"
      },
      fullscreen: {
        rowHeight: "30px",
        rowGap: "4px",
        columnGap: "31px",
        numberWidth: "40px",
        numberHeight: "27px",
        numberFontSize: "15px",
        textFontSize: "clamp(14px, 1.04vw, 18px)",
        textPaddingY: "0px",
        textPaddingX: "8px",
        lineHeight: "1.30"
      }
    }
  };

  const selected = getSizeModeSettings(settings, itemCount, isFullscreen);

  return {
    "--list-row-height": selected.rowHeight,
    "--list-row-gap": selected.rowGap,
    "--list-column-gap": selected.columnGap,
    "--list-number-width": selected.numberWidth,
    "--list-number-height": selected.numberHeight,
    "--list-number-font-size": selected.numberFontSize,
    "--list-text-font-size": selected.textFontSize,
    "--list-text-padding-y": selected.textPaddingY,
    "--list-text-padding-x": selected.textPaddingX,
    "--list-line-height": selected.lineHeight
  };
}

/* =========================================
   Timer curve / center offset
   ========================================= */

function getCenterOffset(rowIndex, rowCount, itemCount) {
  const centerRow = (rowCount - 1) / 2;
  const distanceFromCenter = Math.abs(rowIndex - centerRow);
  const isFullscreen = document.body.classList.contains("fullscreen-mode");

  const offsetSettings = getCenterOffsetSettings(itemCount, isFullscreen);
  const rawStrength = Math.max(0, 1 - distanceFromCenter / offsetSettings.fadeRows);

  // Smoothstep easing. This prevents the curve from starting too abruptly.
  const smoothStrength = rawStrength * rawStrength * (3 - 2 * rawStrength);

  return Math.round(offsetSettings.maxOffset * smoothStrength);
}

function getCenterOffsetSettings(itemCount, isFullscreen) {
  /*
    These values control the curve around the timer.

    maxOffset = how far the middle rows move away from the timer
    fadeRows  = how early/softly the curve starts
  */

  const settings = {
    small: {
      // Lists with 10 or fewer entries.
      window: {
        maxOffset: 58,
        fadeRowsMultiplier: 0.38,
        minFadeRows: 2.5,
        maxFadeRows: 8
      },
      fullscreen: {
        maxOffset: 66,
        fadeRowsMultiplier: 0.4,
        minFadeRows: 2.5,
        maxFadeRows: 8
      }
    },

    medium: {
      // Lists with 11 to 20 entries.
      window: {
        maxOffset: 56,
        fadeRowsMultiplier: 0.4,
        minFadeRows: 3,
        maxFadeRows: 8
      },
      fullscreen: {
        maxOffset: 64,
        fadeRowsMultiplier: 0.42,
        minFadeRows: 3.5,
        maxFadeRows: 8
      }
    },

    large: {
      // Lists with 21 to 30 entries.
      window: {
        maxOffset: 56,
        fadeRowsMultiplier: 0.42,
        minFadeRows: 3.5,
        maxFadeRows: 8
      },
      fullscreen: {
        maxOffset: 70,
        fadeRowsMultiplier: 0.48,
        minFadeRows: 4,
        maxFadeRows: 9
      }
    },

    huge: {
      // Lists with more than 30 entries.
      window: {
        maxOffset: 46,
        fadeRowsMultiplier: 0.38,
        minFadeRows: 2.5,
        maxFadeRows: 8
      },
      fullscreen: {
        maxOffset: 68,
        fadeRowsMultiplier: 0.45,
        minFadeRows: 5,
        maxFadeRows: 10
      }
    }
  };

  const selected = getSizeModeSettings(settings, itemCount, isFullscreen);
  const rowCount = Math.ceil(itemCount / 2);

  const fadeRows = Math.max(
    selected.minFadeRows,
    Math.min(selected.maxFadeRows, rowCount * selected.fadeRowsMultiplier)
  );

  return {
    maxOffset: selected.maxOffset,
    fadeRows
  };
}

function getSizeModeSettings(settings, itemCount, isFullscreen) {
  const sizeKey = getListSizeKey(itemCount);
  const modeKey = isFullscreen ? "fullscreen" : "window";

  return settings[sizeKey][modeKey];
}

function getListSizeKey(itemCount) {
  if (itemCount <= 10) {
    return "small";
  }

  if (itemCount <= 20) {
    return "medium";
  }

  if (itemCount <= 30) {
    return "large";
  }

  return "huge";
}

/* =========================================
   Timer and answer counter
   ========================================= */

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

function renderAnswerCounter() {
  if (!answerCounter) return;

  const counter = state?.answerCounter;

  if (!counter || !counter.visible) {
    answerCounter.className = "answer-counter";
    answerCounter.textContent = "";
    return;
  }

  const count = Number(counter.count) || 0;
  const target = Number.isFinite(Number(counter.target))
    ? Number(counter.target)
    : "?";

  answerCounter.textContent = `${count}/${target}`;

  answerCounter.className = "answer-counter visible";

  if (counter.locked) {
    answerCounter.classList.add("locked");
  }

  if (target !== "?" && count >= target) {
    answerCounter.classList.add("reached");
  }
}

/* =========================================
   Teams
   ========================================= */

function renderTeams() {
  if (!state || !state.teams || state.teams.length === 0) {
    teamBar.innerHTML = `<div class="team-placeholder">Noch keine Teams angelegt.</div>`;
    return;
  }

  teamBar.innerHTML = "";

  state.teams.forEach(team => {
    const card = document.createElement("div");
    card.className = `player-team-card ${state.activeTeamId === team.id ? "active" : ""}`;
    card.style.setProperty("--team-color", getTeamColor(team));

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

function getTeamColor(team) {
  if (team && /^#[0-9a-fA-F]{6}$/.test(String(team.color || ""))) {
    return team.color;
  }

  const defaults = ["#2563eb", "#16a34a", "#ca8a04", "#ea580c", "#dc2626"];
  const index = Math.max(0, Number(team?.id || 1) - 1) % defaults.length;

  return defaults[index];
}

/* =========================================
   Fullscreen handling
   ========================================= */

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      // Browsers may block fullscreen if it was not triggered by a direct click.
    });
    return;
  }

  document.exitFullscreen().catch(() => {});
}

function updateFullscreenButton() {
  const isFullscreen = Boolean(document.fullscreenElement);

  if (fullscreenBtn) {
    fullscreenBtn.textContent = isFullscreen
      ? "Fenster"
      : "Vollbild";
  }

  document.body.classList.toggle("fullscreen-mode", isFullscreen);

  // The list curve and dynamic layout are calculated in JavaScript.
  // After fullscreen changes, the round has to be rendered again.
  if (state && state.currentRound) {
    renderRound();
  }
}

/* =========================================
   Generic helpers
   ========================================= */

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
