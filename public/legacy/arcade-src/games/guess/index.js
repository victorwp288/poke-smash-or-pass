const GAME_ID = "guess";
const GAME_TITLE = "GuessDex";
const MODE = "guess";
const CLASSIC_URL = new URL("../../../classic.html", import.meta.url);

let shell = null;
let stagePanel = null;
let frameContainer = null;
let iframe = null;
let pendingSnapshot = null;

const readSnapshotData = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") return {};
  if (!snapshot.data || typeof snapshot.data !== "object") return {};
  return snapshot.data;
};

const buildIframeSrc = (snapshotData = {}) => {
  const nextUrl = new URL(CLASSIC_URL.href);
  nextUrl.searchParams.set("mode", MODE);
  nextUrl.searchParams.set("embed", "1");

  const rawPath = snapshotData.iframePath;
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    return nextUrl.toString();
  }

  try {
    const restored = new URL(rawPath, CLASSIC_URL.href);
    if (restored.origin !== nextUrl.origin || restored.pathname !== nextUrl.pathname) {
      return nextUrl.toString();
    }
    restored.searchParams.set("mode", MODE);
    restored.searchParams.set("embed", "1");
    return restored.toString();
  } catch {
    return nextUrl.toString();
  }
};

const getCurrentIframePath = () => {
  if (!iframe) return "";
  try {
    const { location } = iframe.contentWindow || {};
    if (!location) return iframe.getAttribute("src") || "";
    return `${location.pathname}${location.search}${location.hash}`;
  } catch {
    return iframe.getAttribute("src") || "";
  }
};

const applyScrollSnapshot = (snapshotData = {}) => {
  const { scrollY } = snapshotData;
  if (!Number.isFinite(scrollY) || scrollY < 0 || !iframe?.contentWindow) return;
  try {
    iframe.contentWindow.scrollTo(0, scrollY);
  } catch {
    // Ignore blocked cross-context scroll errors.
  }
};

const ensurePanel = () => {
  if (stagePanel && frameContainer) return;
  stagePanel = document.createElement("section");
  stagePanel.className = "guess-embed-panel";

  frameContainer = document.createElement("div");
  frameContainer.className = "guess-embed-frame-wrap";

  stagePanel.append(frameContainer);
};

const mountIframe = () => {
  if (!frameContainer) return;

  const snapshotData = readSnapshotData(pendingSnapshot);
  const nextFrame = document.createElement("iframe");
  nextFrame.className = "guess-embed-frame";
  nextFrame.title = "GuessDex classic mode";
  nextFrame.setAttribute("allow", "autoplay");
  nextFrame.loading = "eager";
  nextFrame.src = buildIframeSrc(snapshotData);
  nextFrame.addEventListener("load", () => {
    applyScrollSnapshot(snapshotData);
  });

  frameContainer.replaceChildren(nextFrame);
  iframe = nextFrame;
  pendingSnapshot = null;
};

const createSnapshot = () => {
  const snapshot = {
    data: {
      mode: MODE,
      iframePath: getCurrentIframePath(),
    },
  };

  if (iframe?.contentWindow) {
    try {
      const { scrollY } = iframe.contentWindow;
      if (Number.isFinite(scrollY) && scrollY >= 0) {
        snapshot.data.scrollY = scrollY;
      }
    } catch {
      // Ignore blocked cross-context read errors.
    }
  }

  return snapshot;
};

export default {
  id: GAME_ID,
  title: GAME_TITLE,
  category: "Classic",

  init(ctx) {
    shell = ctx.shell;
  },

  mount(ctx) {
    shell = ctx.shell;
    ensurePanel();
    mountIframe();
    shell.setGameContent(stagePanel);
  },

  unmount() {
    iframe = null;
  },

  getSnapshot() {
    return createSnapshot();
  },

  restoreSnapshot(snapshot) {
    const data = readSnapshotData(snapshot);
    pendingSnapshot = {
      data: {
        mode: MODE,
        iframePath: typeof data.iframePath === "string" ? data.iframePath : "",
        scrollY: Number.isFinite(data.scrollY) ? data.scrollY : undefined,
      },
    };
  },
};
