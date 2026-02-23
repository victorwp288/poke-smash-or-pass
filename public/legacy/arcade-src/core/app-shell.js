const ensureElement = (id) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing required #${id}`);
  return node;
};

const loadStylesheetOnce = (href) => {
  if (!href) return;
  if (document.querySelector(`link[data-game-style=\"${href}\"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.gameStyle = href;
  document.head.appendChild(link);
};

export const createAppShell = () => {
  const tabs = ensureElement("gameTabs");
  const stage = ensureElement("gameStage");
  const subtitle = ensureElement("gameSubtitle");
  const category = ensureElement("gameCategory");
  const status = ensureElement("arcadeStatus");

  let activeButton = null;

  return {
    renderTabs(games, activeId, onSelect) {
      tabs.innerHTML = "";
      games.forEach((game) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "arcade-tab";
        btn.textContent = game.title;
        btn.dataset.gameId = game.id;
        btn.setAttribute("aria-label", `Open ${game.title}`);
        if (game.id === activeId) {
          btn.classList.add("is-active");
          btn.setAttribute("aria-current", "true");
          activeButton = btn;
        }

        btn.addEventListener("click", () => onSelect(game.id));
        tabs.appendChild(btn);
      });
    },

    setActiveTab(gameId) {
      if (activeButton) {
        activeButton.classList.remove("is-active");
        activeButton.removeAttribute("aria-current");
      }
      const next = tabs.querySelector(`[data-game-id="${gameId}"]`);
      if (next) {
        next.classList.add("is-active");
        next.setAttribute("aria-current", "true");
        activeButton = next;
      }
    },

    setHeader({ title, categoryText }) {
      subtitle.textContent = title || "Pokemon Arcade";
      category.textContent = categoryText || "Mode";
    },

    setStatus(text) {
      status.textContent = text || "Ready";
    },

    setGameContent(node) {
      stage.innerHTML = "";
      if (node) stage.appendChild(node);
    },

    clearGameContent() {
      stage.innerHTML = "";
    },

    ensureGameStyles(styles = []) {
      styles.forEach((href) => loadStylesheetOnce(href));
    },

    createPanel(className = "game-panel") {
      const panel = document.createElement("section");
      panel.className = className;
      return panel;
    },

    createButton(label, className = "arcade-btn") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = className;
      btn.textContent = label;
      return btn;
    },

    stage,
  };
};

/**
 * @typedef {ReturnType<typeof createAppShell>} UiShellApi
 */
