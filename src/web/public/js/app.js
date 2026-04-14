const state = {
  viewMode: "home",
  tabs: [],
  activeTabId: null,
  allPages: [],
  treeData: null,
  graphInit: false,
  sidebarCollapsed: false,
  searchResults: [],
  searchIndex: 0,
  settingsSection: "general",
  configData: {},
  editing: false,
  editPagePath: null,
  editPageTitle: null,
  editOriginal: "",
  editTabType: null,
};

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}
async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${path}`);
  return r.json();
}

const BOOKMARKS_STORAGE_KEY = "wikimem-bookmarks";
function getBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveBookmarks(titles) {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(titles));
  } catch {}
}
function isBookmarked(title) {
  return getBookmarks().includes(title);
}
function toggleBookmarkTitle(title) {
  const b = [...getBookmarks()];
  const i = b.indexOf(title);
  if (i >= 0) {
    b.splice(i, 1);
    showToast("Removed from bookmarks");
  } else {
    b.push(title);
    showToast("Bookmarked");
  }
  saveBookmarks(b);
  renderBookmarks();
}
function renderBookmarks() {
  const el = document.getElementById("sidebar-bookmarks-list");
  if (!el) return;
  const titles = getBookmarks();
  if (!titles.length) {
    el.innerHTML =
      '<div class="sidebar-empty-hint">No bookmarks yet. Right-click a wiki page in the tree and choose Add Bookmark.</div>';
    return;
  }
  el.innerHTML = titles
    .map(
      (title) =>
        `<div class="tree-item bookmark-row" onclick="openPage(${JSON.stringify(title)})">
    <span style="margin-right:6px;opacity:0.85">★</span>
    <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(title)}</span>
    <button type="button" class="bookmark-remove" onclick="event.stopPropagation();toggleBookmarkTitle(${JSON.stringify(title)})" title="Remove">×</button>
  </div>`,
    )
    .join("");
}

function catClass(cat) {
  const c = (cat || "").toLowerCase();
  if (c === "source") return "cat-source";
  if (c === "entity") return "cat-entity";
  if (c === "concept") return "cat-concept";
  if (c === "synthesis") return "cat-synthesis";
  if (c === "index" || c === "log") return "cat-index";
  return "cat-page";
}

const SVG_ICONS = {
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  // UXO-036: .md — document with ruled lines
  markdown:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="12" y1="9" x2="8" y2="9"/></svg>',
  // UXO-036: .pdf — red-tinted document icon
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="#e05252" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13" stroke="#e05252"/><line x1="9" y1="17" x2="13" y2="17" stroke="#e05252"/></svg>',
  // UXO-036: .png/.jpg — image frame with mountain
  image:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  video:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><path d="M10 8l6 4-6 4V8z"/></svg>',
  // UXO-036: .mp3 — waveform icon
  audio:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 12 5 7 8 15 11 9 14 17 17 7 20 12 22 12"/></svg>',
  // UXO-036: .csv — table/grid icon
  spreadsheet:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  // UXO-036: .json — curly braces icon
  json: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  wiki: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
};

// UXO-036: getFileIcon — returns appropriate SVG icon per filename extension
function getFileIcon(filename) {
  const ext = (filename || "").split(".").pop().toLowerCase();
  if (["md", "markdown"].includes(ext)) return SVG_ICONS.markdown;
  if (["pdf"].includes(ext)) return SVG_ICONS.pdf;
  if (["json"].includes(ext)) return SVG_ICONS.json;
  if (["yaml", "yml"].includes(ext)) return SVG_ICONS.json;
  if (["csv", "xlsx", "xls", "tsv"].includes(ext)) return SVG_ICONS.spreadsheet;
  if (["mp3", "wav", "m4a", "ogg", "flac", "aac"].includes(ext)) return SVG_ICONS.audio;
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"].includes(ext)) return SVG_ICONS.image;
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return SVG_ICONS.video;
  if (["js", "ts", "jsx", "tsx", "py", "go", "rs", "c", "cpp", "java", "rb", "sh", "bash", "zsh", "xml", "toml", "html", "htm", "css"].includes(ext)) return SVG_ICONS.code;
  if (["txt", "log", "ini", "cfg", "conf"].includes(ext)) return SVG_ICONS.text;
  return SVG_ICONS.file;
}

function fileIcon(type, name) {
  if (type === "dir") return SVG_ICONS.folder;
  if (type === "raw") return getFileIcon(name);
  return SVG_ICONS.wiki;
}

const chevronSvg =
  '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>';

if (typeof marked !== "undefined") {
  marked.setOptions({ gfm: true, breaks: false });
}

function renderMarkdown(md) {
  if (typeof marked !== "undefined") {
    try {
      return marked.parse(md);
    } catch (e) {}
  }
  let html = esc(md);
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    "<pre><code>$2</code></pre>",
  );
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/\n\n/g, "</p><p>");
  return "<p>" + html + "</p>";
}

function renderWikilinks(html) {
  return html.replace(
    /\[\[([^\]]+)\]\]/g,
    (_, name) =>
      `<a href="#" class="wikilink" data-wikilink="${esc(name)}" onclick="event.preventDefault();if(!state.editing)openPage('${esc(name)}')">${esc(name)}</a>`,
  );
}

function wireWikilinks(container) {
  container.querySelectorAll("a.wikilink").forEach((a) => {
    const target = a.dataset.wikilink || a.textContent;
    a.dataset.wikilink = target;
    a.setAttribute(
      "onclick",
      `event.preventDefault();if(!state.editing)openPage('${target.replace(/'/g, "\\'")}')`,
    );
  });
}

function addCopyButtons(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    const btn = document.createElement("button");
    btn.className = "code-copy";
    btn.textContent = "Copy";
    btn.onclick = () => {
      const code = pre.querySelector("code");
      navigator.clipboard.writeText(
        code ? code.textContent : pre.textContent,
      );
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = "Copy"), 1500);
    };
    pre.style.position = "relative";
    pre.appendChild(btn);
  });
}

/** Add Wikipedia-style [1][2] citation markers linking to sources (TREND-001) */
function addSourceCitations(container, page) {
  const fm = page?.frontmatter ?? {};
  const sources = Array.isArray(fm.sources) ? fm.sources : [];
  if (sources.length === 0) return;

  // Build references section
  const refsHtml = sources
    .map((src, i) => {
      const label = String(src)
        .replace(/^raw\//, "")
        .replace(/^.*\//, "");
      return `<li id="cite-${i + 1}"><a href="#" class="wiki-source-link" onclick="event.preventDefault();openRawFile('${esc(String(src))}')">${esc(label)}</a></li>`;
    })
    .join("");

  // Add citation superscripts after the first paragraph
  const firstP = container.querySelector("p");
  if (firstP && sources.length > 0) {
    const citeLinks = sources
      .map(
        (_, i) =>
          `<a href="#cite-${i + 1}" class="citation-ref" title="Source ${i + 1}"><sup>[${i + 1}]</sup></a>`,
      )
      .join("");
    firstP.insertAdjacentHTML("beforeend", " " + citeLinks);
  }

  // Append references section after content
  const refsSection = document.createElement("section");
  refsSection.className = "page-references-section";
  refsSection.innerHTML = `<h2 class="page-encyclopedia-heading">References</h2><ol class="page-references-list">${refsHtml}</ol>`;
  container.appendChild(refsSection);
}

// ── Views ──
function showView(mode) {
  state.viewMode = mode;
  document
    .getElementById("home-view")
    ?.classList.toggle("active", mode === "home");
  document
    .getElementById("page-view")
    ?.classList.toggle("active", mode === "page");
  document
    .getElementById("graph-view")
    ?.classList.toggle("active", mode === "graph");
  document
    .getElementById("settings-view")
    ?.classList.toggle("active", mode === "settings");
  document
    .getElementById("history-view")
    ?.classList.toggle("active", mode === "history");
  document
    .getElementById("pipeline-view")
    ?.classList.toggle("active", mode === "pipeline");
  document
    .getElementById("timelapse-view")
    ?.classList.toggle("active", mode === "timelapse");
  // UXO-021: folder view
  document
    .getElementById("folder-view")
    ?.classList.toggle("active", mode === "folder");
  // UXO-040: connectors view
  document
    .getElementById("connectors-view")
    ?.classList.toggle("active", mode === "connectors");

  // UXO-020: hide explorer sidebar + resize handle when settings is open
  const sidebar = document.getElementById("sidebar");
  const resizeHandle = document.getElementById("resize-handle");
  const isSettings = mode === "settings";
  if (sidebar) sidebar.classList.toggle("settings-hidden", isSettings);
  if (resizeHandle)
    resizeHandle.classList.toggle("settings-hidden", isSettings);

  document
    .getElementById("rail-files")
    .classList.toggle(
      "active",
      mode === "home" || mode === "page" || mode === "folder",
    );
  document
    .getElementById("rail-graph")
    .classList.toggle("active", mode === "graph");
  const railPipeline = document.getElementById("rail-pipeline");
  if (railPipeline)
    railPipeline.classList.toggle("active", mode === "pipeline");
  const railHistory = document.getElementById("rail-history");
  if (railHistory)
    railHistory.classList.toggle("active", mode === "history");
  const railTimelapse = document.getElementById("rail-timelapse");
  if (railTimelapse)
    railTimelapse.classList.toggle("active", mode === "timelapse");
  const railConnectors = document.getElementById("rail-connectors");
  if (railConnectors)
    railConnectors.classList.toggle("active", mode === "connectors");
  const sbGear = document.getElementById("sb-settings-btn");
  if (sbGear)
    sbGear.style.color = mode === "settings" ? "var(--accent)" : "";

  if (mode !== "page" && mode !== "folder") {
    document
      .querySelectorAll(".tree-item.active")
      .forEach((el) => el.classList.remove("active"));
    document.getElementById("sb-path").textContent = "";
  }

  if (mode === "graph" && !state.graphInit) initGraph();
  if (mode === "settings") loadSettings();
  if (mode === "history") loadGitHistory();
}

// ── UXO-021: Folder View ──
// Walk treeData to find the node at a given path array.
// rootType = 'wiki' | 'raw', segments = ['concepts', 'ai'] etc.
function findFolderNode(rootType, segments) {
  let nodes =
    (state.treeData &&
      (rootType === "wiki"
        ? state.treeData.wiki
        : state.treeData.raw)) ||
    [];
  for (const seg of segments) {
    const match = nodes.find(
      (n) => n.type === "dir" && n.name === seg,
    );
    if (!match) return null;
    nodes = match.children || [];
    if (seg === segments[segments.length - 1]) return match;
  }
  return null;
}

// Show a folder listing page.
// folderPath: e.g. 'wiki/concepts' or 'wiki/concepts/ai'
function showFolderView(folderPath) {
  // Parse rootType and segments from folderPath
  const parts = folderPath.split("/").filter(Boolean);
  if (!parts.length) {
    showView("home");
    return;
  }
  const rootType = parts[0]; // 'wiki' or 'raw'
  const segments = parts.slice(1); // folder segments after root

  // Ensure tree data is loaded
  if (!state.treeData) {
    loadTree().then(() => showFolderView(folderPath));
    return;
  }

  let folderNode = null;
  let folderChildren = [];
  if (segments.length === 0) {
    // root level — show wiki or raw top-level items
    folderChildren =
      (rootType === "wiki"
        ? state.treeData.wiki
        : state.treeData.raw) || [];
  } else {
    folderNode = findFolderNode(rootType, segments);
    folderChildren = folderNode ? folderNode.children || [] : [];
  }

  const folderName =
    segments.length > 0
      ? segments[segments.length - 1]
      : rootType === "wiki"
        ? "Wiki"
        : "Raw Sources";

  // Build breadcrumb
  const bcEl = document.getElementById("folder-view-breadcrumb");
  let bcHtml = `<span onclick="showView('home')" style="cursor:pointer">wiki</span>`;
  // Build cumulative paths for each crumb
  const crumbParts = [rootType, ...segments];
  for (let i = 0; i < crumbParts.length - 1; i++) {
    const crumbPath = crumbParts.slice(0, i + 1).join("/");
    bcHtml += `<span class="breadcrumb-sep" style="cursor:default">›</span>`;
    bcHtml += `<span onclick="showFolderView('${esc(crumbPath)}')" style="cursor:pointer">${esc(crumbParts[i])}</span>`;
  }
  // Last segment (current folder) — not clickable
  bcHtml += `<span class="breadcrumb-sep" style="cursor:default">›</span>`;
  bcHtml += `<span style="color:var(--text-dim);cursor:default">${esc(folderName)}</span>`;
  if (bcEl) bcEl.innerHTML = bcHtml;

  // Title
  const titleEl = document.getElementById("folder-view-title");
  const folderIcons = {
    concepts: "💡",
    entities: "🏷",
    sources: "📚",
    syntheses: "🔗",
    wiki: "🧠",
    raw: "📦",
  };
  const icon = folderIcons[folderName.toLowerCase()] || "📁";
  if (titleEl)
    titleEl.innerHTML = `<span>${icon}</span><span>${esc(folderName)}</span>`;

  // Build file/subfolder list
  const listEl = document.getElementById("folder-view-list");
  if (!listEl) return;

  if (!folderChildren.length) {
    listEl.innerHTML = `<div class="folder-view-empty">This folder is empty.</div>`;
  } else {
    // Directories first, then files
    const dirs = folderChildren.filter((n) => n.type === "dir");
    const files = folderChildren.filter((n) => n.type !== "dir");
    let html = "";

    for (const dir of dirs) {
      const childCount = countFiles(dir.children || []);
      const subPath = folderPath + "/" + dir.name;
      const subIcon = folderIcons[dir.name.toLowerCase()] || "📁";
      html += `<div class="folder-view-subfolder" onclick="showFolderView('${esc(subPath)}')">
        <span class="folder-view-item-icon">${subIcon}</span>
        <span class="folder-view-subfolder-name">${esc(dir.name)}</span>
        <span class="folder-view-subfolder-count">${childCount} ${childCount === 1 ? "item" : "items"}</span>
      </div>`;
    }

    for (const file of files) {
      const label = file.title || file.name.replace(/\.md$/, "");
      const fileIconStr = fileIcon(file.type, file.name);
      const summary = file.summary ? esc(file.summary) : "";
      const clickFn =
        file.type === "wiki"
          ? `openPage(${JSON.stringify(label)})`
          : `viewRawFile(${JSON.stringify(file.path)})`;
      html += `<div class="folder-view-item" onclick="${clickFn}">
        <span class="folder-view-item-icon">${fileIconStr}</span>
        <span class="folder-view-item-name">${esc(label)}</span>
        ${summary ? `<span class="folder-view-item-summary">${summary}</span>` : ""}
      </div>`;
    }

    listEl.innerHTML = html;
  }

  showView("folder");
}

// ── Input Modal (UXO-004) ── reusable replacement for window.prompt() ──
let _inputModalCb = null;
(function initInputModal() {
  const overlay = document.getElementById("input-modal-overlay");
  const inp = document.getElementById("input-modal-input");
  const confirmBtn = document.getElementById("input-modal-confirm");
  const cancelBtn = document.getElementById("input-modal-cancel");

  function closeModal(value) {
    overlay.classList.add("hidden");
    inp.value = "";
    if (_inputModalCb) {
      _inputModalCb(value);
      _inputModalCb = null;
    }
  }

  confirmBtn.addEventListener("click", () =>
    closeModal(inp.value.trim() || null),
  );
  cancelBtn.addEventListener("click", () => closeModal(null));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(null);
  });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      closeModal(inp.value.trim() || null);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal(null);
    }
  });
})();

/**
 * showInputModal(title, placeholder, defaultValue, confirmLabel)
 * Returns a Promise<string|null> — resolves with trimmed value or null if cancelled.
 */
function showInputModal(title, placeholder, defaultValue, confirmLabel) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("input-modal-overlay");
    document.getElementById("input-modal-title").textContent =
      title || "Enter a value";
    const inp = document.getElementById("input-modal-input");
    inp.placeholder = placeholder || "";
    inp.value = defaultValue || "";
    const btn = document.getElementById("input-modal-confirm");
    btn.textContent = confirmLabel || "Confirm";
    _inputModalCb = resolve;
    overlay.classList.remove("hidden");
    setTimeout(() => {
      inp.focus();
      inp.select();
    }, 30);
  });
}

// ── File tree ──
async function loadTree() {
  try {
    state.treeData = await api("/api/tree");
  } catch {
    state.treeData = { wiki: [], raw: [] };
  }
  renderTree();
}

function renderTree() {
  const container = document.getElementById("sidebar-tree");
  let html = "";
  const wikiCount = countFiles(state.treeData.wiki);
  const rawCount = countFiles(state.treeData.raw);

  html += `<div class="sidebar-section-header" onclick="toggleTreeSection('wiki-tree')">
  <span>Wiki</span><span class="count">${wikiCount}</span>
</div>`;
  html += `<div id="wiki-tree" class="tree-children">${renderTreeNodes(state.treeData.wiki, 0, "wiki")}</div>`;

  html += `<div class="sidebar-section-header" onclick="toggleTreeSection('raw-tree')">
  <span>Sources</span><span class="count">${rawCount}</span>
</div>`;
  html += `<div id="raw-tree" class="tree-children">${renderTreeNodes(state.treeData.raw, 0, "raw")}</div>`;

  html += `<div class="sidebar-section-header" onclick="toggleTreeSection('connectors-tree');loadSidebarConnectors()">
  <span>Connected Sources</span><span class="count" id="connectors-count">⟳</span>
</div>`;
  html += `<div id="connectors-tree" class="tree-children collapsed"><div id="sidebar-connectors" style="padding:4px 8px;"></div></div>`;

  html += `<div class="sidebar-section-header" onclick="toggleTreeSection('history-tree');loadSidebarHistory()">
  <span>History</span><span class="count" id="history-count">⟳</span>
</div>`;
  html += `<div id="history-tree" class="tree-children collapsed"><div id="sidebar-history" style="padding:4px 8px;"></div></div>`;

  container.innerHTML = html;
}

function countFiles(nodes) {
  let c = 0;
  for (const n of nodes || []) {
    if (n.children) c += countFiles(n.children);
    else c++;
  }
  return c;
}

function renderTreeNodes(nodes, depth, rootType) {
  if (!nodes || !nodes.length) return "";
  let html = "";
  const indent = depth * 16; // 16px per nesting level
  for (const node of nodes) {
    if (node.type === "dir") {
      const childCount = countFiles(node.children);
      const isEmpty = childCount === 0;
      const id =
        "tree-" + rootType + "-" + node.path.replace(/[^a-z0-9]/gi, "-");
      const chevClass = isEmpty ? "" : "open";
      const folderIcons = {
        concepts: "💡",
        entities: "🏷",
        sources: "📚",
        syntheses: "🔗",
        wiki: "🧠",
        raw: "📦",
      };
      const folderIcon = folderIcons[node.name.toLowerCase()] || "📁";
      html += `<div class="tree-item tree-folder" style="padding-left:${8 + indent}px" onclick="toggleFolder('${id}', this)" oncontextmenu="showTreeContextMenu(event,'${esc(node.name)}','${esc(node.path || "")}','dir'); return false;" ondragover="event.preventDefault();this.style.outline='2px solid #0e7fd4';this.style.background='rgba(14,127,212,0.15)'" ondragleave="this.style.outline='';this.style.background=''" ondrop="event.preventDefault();this.style.background='';handleFileDragDrop(event,'${esc(node.path)}','${rootType}')">
      <span class="tree-chevron ${chevClass}" id="chev-${id}">${chevronSvg}</span>
      <span class="tree-icon">${folderIcon}</span>
      <span class="tree-label">${esc(node.name)}</span>
      <span class="tree-badge">${childCount}</span>
    </div>`;
      html += `<div class="tree-children${isEmpty ? " collapsed" : ""}" id="${id}" style="${depth > 0 ? "border-left:1px solid var(--border-subtle);margin-left:" + (20 + indent) + "px" : ""}">${renderTreeNodes(node.children, depth + 1, rootType)}</div>`;
    } else {
      const label = node.title || node.name.replace(".md", "");
      const icon = fileIcon(node.type, node.name);
      const click =
        node.type === "wiki"
          ? `openPage('${esc(label)}')`
          : `viewRawFile('${esc(node.path)}')`;
      html += `<div class="tree-item tree-file" style="padding-left:${8 + indent}px" tabindex="0" onclick="${click}" oncontextmenu="showTreeContextMenu(event,'${esc(label)}','${esc(node.path || "")}','${node.type}'); return false;" onkeydown="treeItemKeyDown(event,this,'${esc(label)}','${esc(node.path || "")}','${node.type}')" data-page-title="${esc(label)}" data-page-path="${esc(node.path || "")}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain',JSON.stringify({title:'${esc(label)}',path:'${esc(node.path || "")}',type:'${node.type}'}));event.dataTransfer.effectAllowed='move'">
      <span class="tree-chevron-spacer"></span>
      <span class="tree-icon">${icon}</span>
      <span class="tree-label">${esc(label)}</span>
    </div>`;
    }
  }
  return html;
}

function toggleFolder(id, el) {
  const children = document.getElementById(id);
  const chev = document.getElementById("chev-" + id);
  if (!children) return;
  children.classList.toggle("collapsed");
  if (chev)
    chev.classList.toggle(
      "open",
      !children.classList.contains("collapsed"),
    );
}

function toggleTreeSection(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle("collapsed");
}

function highlightActiveTreeItem(title) {
  document
    .querySelectorAll(".tree-item.active")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(
      `.tree-item[data-page-title="${CSS.escape(title)}"]`,
    )
    .forEach((el) => el.classList.add("active"));
}

function collapseAllFolders() {
  document.querySelectorAll(".tree-children").forEach((el) => {
    if (
      el.id !== "wiki-tree" &&
      el.id !== "raw-tree" &&
      el.id !== "history-tree"
    ) {
      el.classList.add("collapsed");
    }
  });
  document
    .querySelectorAll(".tree-chevron")
    .forEach((el) => el.classList.remove("open"));
}

// ── View Tab Definitions ──
const VIEW_TABS = {
  graph: {
    id: "__view:graph",
    title: "Knowledge Graph",
    viewMode: "graph",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>',
  },
  settings: {
    id: "__view:settings",
    title: "Settings",
    viewMode: "settings",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  },
  pipeline: {
    id: "__view:pipeline",
    title: "Pipeline",
    viewMode: "pipeline",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h4l3 6-3 6H4"/><path d="M14 6h4l3 6-3 6h-4"/><line x1="8" y1="12" x2="14" y2="12"/></svg>',
  },
  history: {
    id: "__view:history",
    title: "Audit Trail",
    viewMode: "history",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 01-9 9"/></svg>',
  },
  timelapse: {
    id: "__view:timelapse",
    title: "Time-Lapse",
    viewMode: "timelapse",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  },
  connectors: {
    id: "__view:connectors",
    title: "Connectors",
    viewMode: "connectors",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  },
};

function isViewTab(tabId) {
  return tabId && tabId.startsWith("__view:");
}
function viewTypeFromTabId(tabId) {
  return tabId ? tabId.replace("__view:", "") : null;
}

// ── Tabs ──
function openTab(id, title, type) {
  const existing = state.tabs.find((t) => t.id === id);
  if (existing) {
    state.activeTabId = id;
  } else {
    state.tabs.push({ id, title, type });
    state.activeTabId = id;
  }
  renderTabs();
}

function openViewTab(viewKey) {
  const def = VIEW_TABS[viewKey];
  if (!def) return;
  const existing = state.tabs.find((t) => t.id === def.id);
  if (existing) {
    state.activeTabId = def.id;
  } else {
    state.tabs.push({ id: def.id, title: def.title, type: viewKey });
    state.activeTabId = def.id;
  }
  renderTabs();
  showView(def.viewMode);
  if (viewKey === "pipeline") loadPipelineView();
  if (viewKey === "timelapse") loadTimelapse();
  if (viewKey === "connectors") initConnectorsView();
}

function activateTab(tabId) {
  state.activeTabId = tabId;
  if (isViewTab(tabId)) {
    const vType = viewTypeFromTabId(tabId);
    const def = VIEW_TABS[vType];
    if (def) {
      showView(def.viewMode);
      if (vType === "pipeline") loadPipelineView();
      if (vType === "timelapse") loadTimelapse();
      if (vType === "connectors") initConnectorsView();
    }
  } else {
    openPage(tabId, true);
  }
  renderTabs();
}

function closeTab(id) {
  state.tabs = state.tabs.filter((t) => t.id !== id);
  if (state.activeTabId === id) {
    if (state.tabs.length) {
      const lastTab = state.tabs[state.tabs.length - 1];
      activateTab(lastTab.id);
    } else {
      state.activeTabId = null;
      showView("home");
    }
  }
  renderTabs();
}

function tabIcon(t) {
  const def = VIEW_TABS[t.type];
  if (def) return def.icon;
  if (t.type === "raw") return "📎";
  return "◇";
}

function renderTabs() {
  const bar = document.getElementById("tab-bar");
  const tabsHtml = state.tabs
    .map((t, idx) => {
      const active = t.id === state.activeTabId ? " active" : "";
      const icon = tabIcon(t);
      const dirtyDot = t.dirty
        ? '<span class="tab-dirty-dot"></span>'
        : "";
      return `<div class="tab${active}" data-tab-idx="${idx}" draggable="true" onclick="activateTab('${esc(t.id)}')"
    ondragstart="event.dataTransfer.setData('tab-idx','${idx}');event.dataTransfer.effectAllowed='move';this.style.opacity='0.4'"
    ondragend="this.style.opacity='1'"
    ondragover="event.preventDefault();this.classList.add('tab-drag-over')"
    ondragleave="this.classList.remove('tab-drag-over')"
    ondrop="event.preventDefault();this.classList.remove('tab-drag-over');reorderTab(+event.dataTransfer.getData('tab-idx'),${idx})"
    oncontextmenu="event.preventDefault();showTabContextMenu(event,'${esc(t.id)}',${idx})">
    <span class="tab-icon">${icon}</span>
    <span class="tab-label">${esc(t.title)}</span>${dirtyDot}
    <button class="tab-close" onclick="event.stopPropagation();closeTab('${esc(t.id)}')">&times;</button>
  </div>`;
    })
    .join("");

  bar.innerHTML =
    tabsHtml +
    `<button id="tab-new" onclick="showView('home');state.activeTabId=null;renderTabs()" title="Home tab">+</button>` +
    `<div class="tab-bar-spacer"></div>`;
}

function reorderTab(fromIdx, toIdx) {
  if (fromIdx === toIdx) return;
  const [moved] = state.tabs.splice(fromIdx, 1);
  state.tabs.splice(toIdx, 0, moved);
  renderTabs();
}

function showTabContextMenu(e, tabId, idx) {
  let menu = document.getElementById("tab-ctx-menu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "tab-ctx-menu";
    menu.className = "ctx-menu";
    document.body.appendChild(menu);
  }
  menu.innerHTML = "";
  const items = [
    { label: "Close Tab", action: () => closeTab(tabId) },
    {
      label: "Close Other Tabs",
      action: () => {
        state.tabs = state.tabs.filter((t) => t.id === tabId);
        state.activeTabId = tabId;
        renderTabs();
      },
    },
    {
      label: "Close Tabs to the Right",
      action: () => {
        state.tabs = state.tabs.slice(0, idx + 1);
        if (!state.tabs.find((t) => t.id === state.activeTabId)) {
          activateTab(tabId);
        }
        renderTabs();
      },
    },
    {
      label: "Duplicate Tab",
      action: () => {
        const t = state.tabs[idx];
        openTab(t.id + "-dup-" + Date.now(), t.title, t.type);
      },
    },
  ];
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "ctx-menu-item";
    el.textContent = item.label;
    el.addEventListener("click", () => {
      menu.style.display = "none";
      item.action();
    });
    menu.appendChild(el);
  });
  menu.style.display = "block";
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";
  setTimeout(() => {
    const close = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.style.display = "none";
        document.removeEventListener("click", close);
      }
    };
    document.addEventListener("click", close);
  }, 0);
}

function estimateReadingMinutes(wordCount) {
  const n = Number(wordCount) || 0;
  return Math.max(1, Math.round(n / 200));
}

function formatWikiSourceLine(s) {
  const str = String(s);
  if (/^https?:\/\//i.test(str)) {
    return `<a href="${esc(str)}" target="_blank" rel="noopener noreferrer" class="wiki-source-link">${esc(str)}</a>`;
  }
  return esc(str);
}

function renderEncyclopediaChrome(page) {
  const chrome = document.getElementById("page-encyclopedia-chrome");
  if (!chrome) return;
  const fm = page.frontmatter || {};
  const title = page.title || "";
  const parts = [];

  const seen = new Set();
  const outgoing = (page.wikilinks || []).filter((l) => {
    const n = String(l).trim();
    if (!n || n.toLowerCase() === String(title).toLowerCase())
      return false;
    const key = n.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (outgoing.length) {
    const items = outgoing
      .map(
        (name) =>
          `<li><a href="#" class="wikilink" data-wikilink="${esc(name)}" onclick="event.preventDefault();if(!state.editing)openPage('${esc(name)}')">${esc(name)}</a></li>`,
      )
      .join("");
    parts.push(
      `<section class="page-encyclopedia-section page-see-also-block" aria-labelledby="wiki-see-also-heading"><h2 id="wiki-see-also-heading" class="page-encyclopedia-heading">See also</h2><ul class="wiki-see-also-list">${items}</ul></section>`,
    );
  }

  // Similar Pages placeholder (loaded async)
  parts.push(
    `<section class="page-encyclopedia-section page-similar-block" id="similar-pages-section" style="display:none" aria-labelledby="wiki-similar-heading"><h2 id="wiki-similar-heading" class="page-encyclopedia-heading">Similar pages</h2><div id="similar-pages-list" class="similar-pages-grid"></div></section>`,
  );

  const updated = fm.updated || fm.created;
  if (updated) {
    parts.push(
      `<footer class="page-article-footer"><div class="page-article-footer-inner"><span class="page-last-updated">Last updated: ${esc(String(updated))}</span></div></footer>`,
    );
  }

  chrome.innerHTML = parts.join("");
}

/** First narrative block for entity lede (skips leading markdown headings). */
function extractEntityLede(md) {
  const s = String(md || "").replace(/\r\n/g, "\n");
  if (!s.trim()) return { lede: "", rest: "" };
  const lines = s.split("\n");
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      i++;
      continue;
    }
    if (/^#{1,6}\s/.test(t)) {
      while (i < lines.length && lines[i].trim()) i++;
      while (i < lines.length && !lines[i].trim()) i++;
      continue;
    }
    break;
  }
  if (i >= lines.length) return { lede: "", rest: s.trim() };
  const block = [];
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    if (/^#{1,6}\s/.test(line.trim())) break;
    block.push(line);
    i++;
  }
  while (i < lines.length && !lines[i].trim()) i++;
  const lede = block.join("\n").trim();
  const rest = i < lines.length ? lines.slice(i).join("\n") : "";
  return { lede, rest: rest.trim() };
}

/** CRM-style profile chrome for entity & concept pages (UX-031). */
function buildEntityProfileHtml(page, backlinks, ledeMd) {
  const fm = page.frontmatter || {};
  const title = page.title;
  const typeRaw = String(fm.type || "entity").toLowerCase();
  const typeSafe = typeRaw.replace(/[^a-z0-9-]/g, "") || "entity";
  const typeLabel = esc(fm.type || "Entity");
  const tags = (fm.tags || [])
    .map((t) => `<span class="meta-badge meta-tag">${esc(t)}</span>`)
    .join(" ");
  const sourceItems = (fm.sources || [])
    .map((s) => {
      const short = String(s).split("/").slice(-2).join("/");
      return `<li><span class="meta-source-path" title="${esc(s)}">${esc(short)}</span></li>`;
    })
    .join("");
  const related = (fm.related || [])
    .map((r) => {
      const name = r.replace(/^\[\[|\]\]$/g, "");
      return `<span class="entity-related-chip" onclick="openPage('${esc(name)}')">${esc(name)}</span>`;
    })
    .join("");

  let ledeHtml = "";
  if (ledeMd && String(ledeMd).trim()) {
    ledeHtml = `<div class="entity-summary entity-summary--lede md" role="region" aria-label="Summary">${renderWikilinks(renderMarkdown(String(ledeMd).trim()))}</div>`;
  }

  const mentionedBlock =
    backlinks.length > 0
      ? `<section class="entity-section entity-mentioned" aria-labelledby="entity-mentioned-h"><h3 id="entity-mentioned-h" class="entity-section-title">Mentioned in</h3><ul class="entity-mentioned-list">${backlinks
          .map(
            (b) =>
              `<li><button type="button" class="entity-mentioned-link" onclick="openPage('${esc(b)}')">${esc(b)}</button></li>`,
          )
          .join("")}</ul></section>`
      : `<section class="entity-section entity-mentioned entity-mentioned--empty" aria-labelledby="entity-mentioned-h"><h3 id="entity-mentioned-h" class="entity-section-title">Mentioned in</h3><p class="entity-empty-hint">No other pages link here yet.</p></section>`;

  const firstAdded = fm.created ? esc(String(fm.created)) : "—";
  const lastMod =
    fm.updated || fm.created
      ? esc(String(fm.updated || fm.created))
      : "—";
  const n = backlinks.length;
  const refLabel = `${n} page${n === 1 ? "" : "s"}`;

  const activityBlock = `<section class="entity-activity" aria-label="Activity timeline"><div class="entity-activity-track"><div class="entity-activity-node"><span class="entity-activity-label">First added</span><span class="entity-activity-value">${firstAdded}</span></div><div class="entity-activity-node"><span class="entity-activity-label">Last modified</span><span class="entity-activity-value">${lastMod}</span></div><div class="entity-activity-node"><span class="entity-activity-label">Referenced by</span><span class="entity-activity-value">${esc(refLabel)}</span></div></div></section>`;

  const tagsRow = `<div class="entity-infobox-dl-row"><dt>Tags</dt><dd class="entity-infobox-tags">${tags}<button type="button" class="meta-add-tag entity-tag-add" onclick="addTagToPage('${esc(title)}')" title="Add tag">+</button></dd></div>`;

  return `<div class="entity-profile-layout">
  <aside class="page-infobox entity-infobox" aria-label="Entity profile">
    <div class="entity-infobox-brand"><span class="entity-type-badge entity-type-badge--${typeSafe}">${typeLabel}</span></div>
    <h2 class="entity-infobox-title">${esc(title)}</h2>
    <dl class="entity-infobox-dl">
      ${tagsRow}
      ${fm.created ? `<div class="entity-infobox-dl-row"><dt>Created</dt><dd><time class="entity-infobox-time" datetime="${esc(String(fm.created))}">${esc(String(fm.created))}</time></dd></div>` : ""}
      ${fm.updated ? `<div class="entity-infobox-dl-row"><dt>Updated</dt><dd><time class="entity-infobox-time" datetime="${esc(String(fm.updated))}">${esc(String(fm.updated))}</time></dd></div>` : ""}
      ${(fm.sources || []).length ? `<div class="entity-infobox-dl-row"><dt>Sources</dt><dd><ul class="entity-source-ul">${sourceItems}</ul></dd></div>` : ""}
      ${(fm.related || []).length ? `<div class="entity-infobox-dl-row"><dt>Related</dt><dd class="entity-infobox-related">${related}</dd></div>` : ""}
    </dl>
  </aside>
  ${ledeHtml}
  <div class="entity-profile-sections">${mentionedBlock}${activityBlock}</div>
</div>`;
}

// ── Open page ──
async function openPage(title, fromTab) {
  try {
    if (state.editing) exitEditMode(true);
    const page = await api("/api/pages/" + encodeURIComponent(title));
    if (!fromTab) openTab(title, page.title, "wiki");
    state.activeTabId = title;
    state.editPagePath = page.path || null;
    state.editPageTitle = page.title;
    state.editPageSlug =
      (page.path || "").split("/").pop()?.replace(/\.md$/, "") || title;
    state.editTabType = "wiki";
    renderTabs();
    showView("page");

    document.getElementById("page-edit-btn").style.display = "";
    const titleEl = document.getElementById("page-title");
    titleEl.textContent = page.title;
    titleEl.setAttribute("contenteditable", "true");
    titleEl.setAttribute("spellcheck", "false");
    titleEl.onblur = () => commitTitleEdit(titleEl, page.title);
    titleEl.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
      }
      if (e.key === "Escape") {
        titleEl.textContent = page.title;
        titleEl.blur();
      }
    };

    const fullPath = page.path || "";
    const wikiIdx = fullPath.indexOf("/wiki/");
    const relPath =
      wikiIdx >= 0
        ? fullPath.substring(wikiIdx + 6)
        : fullPath.split("/").pop() || "";
    const parts = relPath.replace(/\.md$/, "").split("/").filter(Boolean);
    let breadcrumbs = `<span onclick="showView('home')" style="cursor:pointer">Wiki</span>`;
    for (let i = 0; i < parts.length - 1; i++) {
      breadcrumbs += `<span class="breadcrumb-sep">›</span><span>${esc(parts[i])}</span>`;
    }
    if (parts.length) {
      breadcrumbs += `<span class="breadcrumb-sep">›</span><span style="color:var(--text-dim)">${esc(parts[parts.length - 1])}</span>`;
    }
    document.getElementById("page-breadcrumbs").innerHTML = breadcrumbs;

    const fm = page.frontmatter || {};

    // Confidence badge + validation bar
    renderConfidenceBadge(fm);
    renderValidationBar(page.title, fm);

    const tags = (fm.tags || [])
      .map(
        (t) =>
          `<span class="meta-tag-chip">${esc(t)}<button class="chip-remove" onclick="event.stopPropagation();removePageTag('${esc(page.title)}','${esc(t)}')" title="Remove tag">&times;</button></span>`,
      )
      .join("");
    const related = (fm.related || [])
      .map((r) => {
        const name = r.replace(/^\[\[|\]\]$/g, "");
        return `<span class="meta-related-editable" onclick="openPage('${esc(name)}')">${esc(name)}<button class="rel-remove" onclick="event.stopPropagation();removePageRelated('${esc(page.title)}','${esc(r)}')" title="Remove related">&times;</button></span>`;
      })
      .join("");
    const sourcePaths = (fm.sources || [])
      .map((s) => {
        const short = String(s).split("/").slice(-2).join("/");
        return `<span class="meta-source-editable" title="${esc(s)}"><span>${esc(short)}</span><button class="src-remove" onclick="event.stopPropagation();removePageSource('${esc(page.title)}','${esc(s)}')" title="Remove source">&times;</button></span>`;
      })
      .join("");

    const typeOptions = ["source", "entity", "concept", "synthesis"];
    const typeSelect = `<select class="meta-type-select" onchange="changePageType('${esc(page.title)}',this.value)">${typeOptions.map((t) => `<option value="${t}"${(fm.type || "") === t ? " selected" : ""}>${t}</option>`).join("")}</select>`;

    const skipKeys = new Set([
      "tags",
      "sources",
      "related",
      "type",
      "created",
      "updated",
      "title",
      "summary",
    ]);
    const customProps = Object.entries(fm).filter(
      ([k]) => !skipKeys.has(k),
    );
    const customRows = customProps
      .map(([k, v]) => {
        const val = Array.isArray(v) ? v.join(", ") : String(v);
        return `<div class="meta-row"><span class="meta-key">${esc(k)}</span><div class="meta-val"><span class="meta-val-editable" onclick="startEditProperty(this,'${esc(page.title)}','${esc(k)}')">${esc(val)}</span></div></div>`;
      })
      .join("");

    document.getElementById("page-meta").innerHTML = `
    <div class="meta-props-header" onclick="const g=this.nextElementSibling;g.style.display=g.style.display==='none'?'flex':'none';this.classList.toggle('collapsed')">
      <svg width="8" height="8" viewBox="0 0 8 8"><path d="M2 1l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
      Properties
    </div>
    <div class="meta-props-grid">
      <div class="meta-row"><span class="meta-key">Type</span><div class="meta-val">${typeSelect}</div></div>
      ${fm.created ? `<div class="meta-row"><span class="meta-key">Created</span><div class="meta-val"><span class="meta-date meta-val-editable" onclick="startEditProperty(this,'${esc(page.title)}','created')">${esc(fm.created)}</span></div></div>` : ""}
      <div class="meta-row"><span class="meta-key">Tags</span><div class="meta-val">${tags}<span class="meta-add-chip" onclick="startInlineTagAdd(this,'${esc(page.title)}')">+</span></div></div>
      <div class="meta-row"><span class="meta-key">Sources</span><div class="meta-val">${sourcePaths}<span class="meta-add-chip" onclick="startInlineSourceAdd(this,'${esc(page.title)}')">+</span></div></div>
      <div class="meta-row"><span class="meta-key">Related</span><div class="meta-val">${related}<span class="meta-add-chip" onclick="startInlineRelatedAdd(this,'${esc(page.title)}')">+</span></div></div>
      ${customRows}
      <div class="meta-row"><span class="meta-key">Stats</span><div class="meta-val"><span class="meta-stat">${page.wordCount}w</span><span class="meta-stat-sep">·</span><span class="meta-stat">${estimateReadingMinutes(page.wordCount)} min read</span><span class="meta-stat-sep">·</span><span class="meta-stat">${page.wikilinks.length} links</span></div></div>
      <div><span class="meta-add-prop" onclick="startAddProperty(this,'${esc(page.title)}')">+ Add property</span></div>
    </div>`;

    let stripped = (page.content || "").replace(
      /^---[\s\S]*?---\s*/m,
      "",
    );
    stripped = stripped.replace(
      new RegExp(
        "^\\s*#\\s+" +
          page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "\\s*\\n",
        "m",
      ),
      "",
    );

    const typeLower = (fm.type || "").toLowerCase();
    const isEntityProfile =
      typeLower === "entity" || typeLower === "concept";
    const backlinks = findBacklinks(title);

    let bodyMd = stripped;
    let ledeMd = "";
    if (isEntityProfile) {
      if (fm.summary && String(fm.summary).trim()) {
        ledeMd = String(fm.summary).trim();
      } else {
        const ex = extractEntityLede(stripped);
        if (ex.lede) {
          ledeMd = ex.lede;
          bodyMd = ex.rest !== "" ? ex.rest : "";
        }
      }
    }

    const entityProfileEl = document.getElementById(
      "page-entity-profile",
    );
    if (entityProfileEl) {
      if (isEntityProfile) {
        entityProfileEl.innerHTML = buildEntityProfileHtml(
          page,
          backlinks,
          ledeMd,
        );
      } else {
        entityProfileEl.innerHTML = "";
      }
    }

    const rendered = renderWikilinks(renderMarkdown(bodyMd));
    const body = document.getElementById("page-body");
    body.innerHTML = rendered;
    body.classList.add("fade-in");
    addCopyButtons(body);
    addSourceCitations(body, page);
    setTimeout(() => body.classList.remove("fade-in"), 250);

    buildToc(body);

    // Fetch and render fact timeline (COMP-MP-002) — stub until implemented
    if (typeof renderFactTimeline === "function") renderFactTimeline(page.title, fm);

    renderEncyclopediaChrome(page);

    const blContainer = document.getElementById("page-backlinks");
    if (isEntityProfile) {
      blContainer.innerHTML = "";
    } else if (backlinks.length) {
      blContainer.innerHTML =
        `<div class="backlinks-title">Linked from (${backlinks.length})</div>` +
        backlinks
          .map(
            (b) =>
              `<span class="backlink-item" onclick="openPage('${esc(b)}')">${esc(b)}</span>`,
          )
          .join("");
    } else {
      blContainer.innerHTML = "";
    }

    highlightActiveTreeItem(title);
    document.getElementById("sb-path").textContent = relPath || title;
    document.getElementById("content").scrollTop = 0;

    // Async: load similar pages — stub until implemented
    if (typeof loadSimilarPages === "function") loadSimilarPages(page.title);
  } catch (err) {
    console.error("Failed to open page:", err);
  }
}

function buildToc(container) {
  const tocEl = document.getElementById("page-toc");
  const headings = container.querySelectorAll("h1, h2, h3, h4");
  if (headings.length < 3) {
    tocEl.innerHTML = "";
    return;
  }
  let html = '<div class="toc-title">Contents</div>';
  headings.forEach((h, i) => {
    const level = h.tagName.toLowerCase();
    const id = "heading-" + i;
    h.id = id;
    const text = h.textContent.substring(0, 60);
    html += `<a class="toc-item toc-${level}" onclick="document.getElementById('${id}').scrollIntoView({behavior:'smooth',block:'start'})">${esc(text)}</a>`;
  });
  tocEl.innerHTML = html;
}

function findBacklinks(title) {
  return state.allPages
    .filter((p) =>
      p.wikilinks.some(
        (l) => l.toLowerCase() === title.toLowerCase() || l === title,
      ),
    )
    .map((p) => p.title);
}

async function viewRawFile(filepath) {
  try {
    if (state.editing) exitEditMode(true);
    const meta = await api(
      "/api/raw/meta?path=" + encodeURIComponent(filepath),
    );
    const filename = filepath.split("/").pop() || filepath;

    openTab("raw:" + filepath, filename, "raw");
    state.editTabType = "raw";
    showView("page");

    document.getElementById("page-edit-btn").style.display = "none";
    document.getElementById("page-confidence-badge").style.display =
      "none";
    document.getElementById("page-validation-bar").style.display = "none";
    document.getElementById("page-title").textContent = filename;
    const rawParts = filepath.split("/").filter(Boolean);
    let rawBc = `<span onclick="showView('home')" style="cursor:pointer">home</span><span class="breadcrumb-sep">›</span><span>raw</span>`;
    for (let i = 0; i < rawParts.length - 1; i++) {
      rawBc += `<span class="breadcrumb-sep">›</span><span>${esc(rawParts[i])}</span>`;
    }
    if (rawParts.length) {
      rawBc += `<span class="breadcrumb-sep">›</span><span style="color:var(--text-dim)">${esc(rawParts[rawParts.length - 1])}</span>`;
    }
    document.getElementById("page-breadcrumbs").innerHTML = rawBc;

    const FILE_TYPE_LABELS = {
      ".pptx": "PowerPoint",
      ".ppt": "PowerPoint",
      ".docx": "Word Document",
      ".doc": "Word Document",
      ".xlsx": "Spreadsheet",
      ".xls": "Spreadsheet",
      ".pdf": "PDF",
      ".csv": "CSV",
      ".json": "JSON",
      ".yaml": "YAML",
      ".yml": "YAML",
      ".html": "HTML",
      ".htm": "HTML",
      ".md": "Markdown",
      ".txt": "Text",
      ".png": "Image",
      ".jpg": "Image",
      ".jpeg": "Image",
      ".gif": "Image",
      ".webp": "Image",
      ".svg": "SVG",
      ".mp4": "Video",
      ".webm": "Video",
      ".mov": "Video",
      ".mp3": "Audio",
      ".wav": "Audio",
      ".ogg": "Audio",
      ".zip": "Archive",
      ".tar": "Archive",
    };
    const typeLabel =
      FILE_TYPE_LABELS[meta.extension] || meta.previewType || "File";
    const sizeStr = formatBytes(meta.size || 0);
    document.getElementById("page-meta").innerHTML =
      `<span class="meta-badge meta-type">${typeLabel}</span><span class="meta-badge">${sizeStr}</span>`;
    document.getElementById("page-toc").innerHTML = "";
    const enc = document.getElementById("page-encyclopedia-chrome");
    if (enc) enc.innerHTML = "";
    const entityProf = document.getElementById("page-entity-profile");
    if (entityProf) entityProf.innerHTML = "";

    const body = document.getElementById("page-body");
    let html = "";

    const modDate = meta.modified
      ? new Date(meta.modified).toLocaleDateString()
      : "";
    const fileUrl_ = "/api/raw/file?path=" + encodeURIComponent(filepath);

    // Content based on type
    const fileUrl = "/api/raw/file?path=" + encodeURIComponent(filepath);
    switch (meta.previewType) {
      case "pdf":
        html += `<div class="pdf-container"><iframe src="${fileUrl}" title="PDF Preview"></iframe></div>`;
        break;
      case "image":
        html += `<div class="img-preview"><img src="${fileUrl}" alt="${esc(filename)}" /></div>`;
        break;
      case "video":
        html += `<div class="video-container"><video controls preload="metadata"><source src="${fileUrl}" /></video></div>`;
        break;
      case "audio":
        html += `<div class="video-container"><audio controls preload="metadata"><source src="${fileUrl}" /></audio></div>`;
        break;
      case "spreadsheet":
        if (meta.extension === ".csv") {
          try {
            const res = await fetch(
              "/api/raw/view/" + encodeURIComponent(filepath),
            );
            const data = await res.json();
            if (data.type === "text")
              html += renderCsvTable(data.content);
          } catch {
            html += "<p>Failed to load spreadsheet</p>";
          }
        } else {
          html += `<p style="color:var(--text-muted)">Excel preview requires browser-side parsing.</p>`;
          html += `<a class="raw-download-btn" href="${fileUrl}" download>Download to view in Excel</a>`;
        }
        break;
      case "text": {
        try {
          const res = await fetch(
            "/api/raw/view/" + encodeURIComponent(filepath),
          );
          const data = await res.json();
          if (data.type === "text") {
            if (meta.extension === ".md") {
              html += `<div class="md">${renderWikilinks(renderMarkdown(data.content))}</div>`;
            } else {
              const lang =
                {
                  ".json": "json",
                  ".yaml": "yaml",
                  ".yml": "yaml",
                  ".xml": "xml",
                  ".html": "html",
                  ".ts": "typescript",
                  ".js": "javascript",
                  ".py": "python",
                  ".go": "go",
                  ".rs": "rust",
                  ".sh": "bash",
                }[meta.extension] || "";
              html += `<pre style="background:var(--bg-surface);padding:16px;border-radius:8px;overflow-x:auto;font-size:13px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word"><code>${esc(data.content)}</code></pre>`;
            }
          }
        } catch {
          html += "<p>Failed to load file</p>";
        }
        break;
      }
      case "document":
        html += `<div style="text-align:center;padding:48px 24px;color:var(--text-muted)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" style="opacity:0.4;margin-bottom:16px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:6px;font-weight:500">${typeLabel}</p>
        <p style="font-size:12px;margin-bottom:4px">${sizeStr}${modDate ? " · Modified " + modDate : ""}</p>
        <p style="font-size:11px;margin-bottom:20px;color:var(--text-dim)">Preview not available locally. Download to view in native app.</p>
        <a class="raw-download-btn" href="${fileUrl}" download="${esc(filename)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </a>
      </div>`;
        break;
      default:
        html += `<div style="text-align:center;padding:48px 24px;color:var(--text-muted)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" style="opacity:0.4;margin-bottom:16px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:6px;font-weight:500">${typeLabel}</p>
        <p style="font-size:12px;margin-bottom:20px">${sizeStr}</p>
        <a class="raw-download-btn" href="${fileUrl}" download="${esc(filename)}">Download</a>
      </div>`;
    }

    body.innerHTML = html;
    addCopyButtons(body);

    // Linked wiki pages section
    if (meta.linkedWikiPages && meta.linkedWikiPages.length > 0) {
      const linksHtml = meta.linkedWikiPages
        .map(
          (p) =>
            `<a onclick="openPage('${esc(p.title)}')">${esc(p.title)}</a>`,
        )
        .join("");
      document.getElementById("page-backlinks").innerHTML =
        `<div class="raw-linked-pages"><h4>📎 Wiki pages generated from this source</h4>${linksHtml}</div>`;
    } else {
      document.getElementById("page-backlinks").innerHTML =
        `<div class="raw-linked-pages" style="color:var(--text-muted)"><h4>No wiki pages linked yet</h4><p style="font-size:12px">Ingest this file to generate wiki pages from it.</p></div>`;
    }

    document.getElementById("content").scrollTop = 0;
    document.getElementById("sb-path").textContent = "raw/" + filepath;
  } catch (err) {
    console.error("Failed to view raw file:", err);
  }
}

function rawFileEmoji(ext) {
  const map = {
    ".md": "📄",
    ".txt": "📝",
    ".pdf": "📑",
    ".json": "🔧",
    ".yaml": "🔧",
    ".yml": "🔧",
    ".csv": "📊",
    ".xlsx": "📊",
    ".xls": "📊",
    ".jpg": "🖼️",
    ".jpeg": "🖼️",
    ".png": "🖼️",
    ".gif": "🖼️",
    ".webp": "🖼️",
    ".svg": "🖼️",
    ".mp4": "🎬",
    ".webm": "🎬",
    ".mov": "🎬",
    ".mp3": "🎵",
    ".wav": "🎵",
    ".ogg": "🎵",
    ".html": "🌐",
    ".htm": "🌐",
    ".ts": "💻",
    ".js": "💻",
    ".py": "💻",
    ".go": "💻",
    ".rs": "💻",
    ".docx": "📃",
    ".pptx": "📊",
    ".zip": "📦",
  };
  return map[ext] || "📄";
}

function renderCsvTable(csvText) {
  const rows = csvText.split("\n").filter((r) => r.trim());
  if (!rows.length) return "<p>Empty CSV</p>";
  const headers = rows[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  let html =
    '<div class="csv-table-wrap"><table class="csv-table"><thead><tr>';
  for (const h of headers) html += `<th>${esc(h)}</th>`;
  html += "</tr></thead><tbody>";
  for (let i = 1; i < Math.min(rows.length, 200); i++) {
    const cells = rows[i]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));
    html += "<tr>";
    for (const c of cells) html += `<td>${esc(c)}</td>`;
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  if (rows.length > 200)
    html += `<p style="color:var(--text-muted);font-size:12px;margin-top:8px">Showing first 200 of ${rows.length} rows</p>`;
  return html;
}

// ── WYSIWYG Live Editor (Obsidian-style — edit in place, no raw markdown) ──
// Uses contenteditable on #page-body + Turndown.js to convert HTML→Markdown on save

const _td =
  typeof TurndownService !== "undefined"
    ? new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-",
        emDelimiter: "*",
      })
    : null;

// Configure Turndown: preserve wikilinks [[Title]]
if (_td) {
  _td.addRule("wikilink", {
    filter: (node) =>
      node.nodeName === "A" && node.dataset && node.dataset.wikilink,
    replacement: (content, node) => `[[${node.dataset.wikilink}]]`,
  });
  _td.addRule("inlineCode", {
    filter: ["code"],
    replacement: (content) => "`" + content + "`",
  });
}

// Double-click on page body → activate WYSIWYG edit (single-click reserved for link navigation)
document.getElementById("page-body").addEventListener("dblclick", (e) => {
  if (state.editing || state.editTabType !== "wiki") return;
  if (e.target.closest("a[href]")) return; // let normal links work
  activateWysiwyg();
});

async function activateWysiwyg() {
  const title = state.activeTabId;
  if (!title || state.editTabType !== "wiki" || state.editing) return;

  // Fetch the raw markdown source
  let rawMd = "";
  let pageSlug = title;
  try {
    const r = await fetch(
      "/api/pages/" + encodeURIComponent(title) + "/raw",
    );
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    rawMd = data.raw || "";
    pageSlug = data.slug || title;
  } catch (err) {
    console.warn("Could not load page source for editing:", err);
    if (typeof showToast === "function")
      showToast("Could not load source — edit cancelled");
    return;
  }

  state.editing = true;
  state.editOriginal = rawMd;
  state.editPageSlug = pageSlug;
  state.wysiwygDirty = false;

  document.getElementById("page-view")?.classList.add("wiki-editing");

  const body = document.getElementById("page-body");
  body.contentEditable = "true";
  body.classList.add("editing-hint-hidden");
  body.focus();

  // Show the floating save bar
  document.getElementById("wysiwyg-bar").classList.add("visible");
  document.getElementById("wysiwyg-dirty").classList.remove("visible");

  // Remove edit button (we don't need it in WYSIWYG)
  const editBtn = document.getElementById("page-edit-btn");
  if (editBtn) editBtn.style.display = "none";

  // Track changes
  const _inputHandler = () => {
    if (!state.editing) return;
    state.wysiwygDirty = true;
    document.getElementById("wysiwyg-dirty").classList.add("visible");
    const tab = state.tabs.find((t) => t.id === state.activeTabId);
    if (tab) {
      tab.dirty = true;
      renderTabs();
    }
  };
  body._wysiwygInputHandler = _inputHandler;
  body.addEventListener("input", _inputHandler);

  body.addEventListener("keydown", function _mdShortcuts(e) {
    if (!state.editing) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      document.execCommand("bold");
      _inputHandler();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "i") {
      e.preventDefault();
      document.execCommand("italic");
      _inputHandler();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "e") {
      e.preventDefault();
      const range = sel.getRangeAt(0);
      const code = document.createElement("code");
      code.appendChild(range.extractContents());
      range.insertNode(code);
      sel.collapseToEnd();
      _inputHandler();
    }
    if (e.key === "Enter") {
      const node = sel.anchorNode;
      if (node && node.textContent) {
        const text = node.textContent;
        if (/^- $/.test(text.trim()) || /^\* $/.test(text.trim())) {
          e.preventDefault();
          document.execCommand("insertUnorderedList");
          node.textContent = "";
          _inputHandler();
        }
        if (/^1\. $/.test(text.trim())) {
          e.preventDefault();
          document.execCommand("insertOrderedList");
          node.textContent = "";
          _inputHandler();
        }
      }
    }
    if (e.key === " ") {
      const node = sel.anchorNode;
      if (node && node.nodeType === 3) {
        const text = node.textContent || "";
        const offset = sel.anchorOffset;
        const before = text.slice(0, offset);
        if (before === "-" || before === "*") {
          e.preventDefault();
          node.textContent = "";
          document.execCommand("insertUnorderedList");
          _inputHandler();
        }
        const headingMatch = before.match(/^(#{1,6})$/);
        if (headingMatch) {
          e.preventDefault();
          const level = headingMatch[1].length;
          node.textContent = "";
          document.execCommand("formatBlock", false, `h${level}`);
          _inputHandler();
        }
      }
    }
  });
  body._mdShortcuts = body.lastChild;
}

function deactivateWysiwyg() {
  const body = document.getElementById("page-body");
  body.contentEditable = "false";
  body.classList.remove("editing-hint-hidden");
  if (body._wysiwygInputHandler) {
    body.removeEventListener("input", body._wysiwygInputHandler);
    body._wysiwygInputHandler = null;
  }
  document.getElementById("wysiwyg-bar").classList.remove("visible");
  document.getElementById("wysiwyg-dirty").classList.remove("visible");
  document.getElementById("page-view")?.classList.remove("wiki-editing");
  const editBtn = document.getElementById("page-edit-btn");
  if (editBtn) editBtn.style.display = "";
  state.editing = false;
  state.wysiwygDirty = false;
  const tab = state.tabs.find((t) => t.id === state.activeTabId);
  if (tab) {
    tab.dirty = false;
    renderTabs();
  }
}

function cancelWysiwyg() {
  if (state.wysiwygDirty) {
    if (!confirm("Discard unsaved changes?")) return;
  }
  // Restore original rendered content
  const body = document.getElementById("page-body");
  deactivateWysiwyg();
  if (state.editOriginal) {
    body.innerHTML = renderMarkdown(state.editOriginal);
    wireWikilinks(body);
  }
}

async function saveWysiwyg() {
  const title = state.activeTabId;
  if (!title) return;

  const body = document.getElementById("page-body");
  const saveBtn = document.getElementById("wysiwyg-save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  // Convert HTML → Markdown using Turndown
  let content = "";
  if (_td) {
    content = _td.turndown(body.innerHTML);
  } else {
    // Fallback: use raw markdown if Turndown failed to load
    content = state.editOriginal || "";
  }

  try {
    const slug = state.editPageSlug || title;
    const res = await fetch("/api/pages/" + encodeURIComponent(slug), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    deactivateWysiwyg();
    showToast("✓ Saved");

    await openPage(title, true);
    loadTree();
    loadHome();
    state.graphInit = false;
  } catch (err) {
    showToast("✗ Save failed: " + (err.message || "unknown error"));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
}

// For new note creation — still uses a temp markdown string
async function enterEditMode(rawContent) {
  // New-note flow: render markdown and immediately enter wysiwyg
  const title = state.activeTabId;
  if (!title || state.editTabType !== "wiki") return;

  if (rawContent !== undefined) {
    const body = document.getElementById("page-body");
    body.innerHTML = renderMarkdown(rawContent);
    wireWikilinks(body);
    state.editOriginal = rawContent;
    state.editPageSlug = title;
  }
  activateWysiwyg();
}

function toggleEditMode() {
  if (state.editing) {
    cancelWysiwyg();
    return;
  }
  activateWysiwyg();
}

// ── File Explorer Context Menu ──
function showTreeContextMenu(event, title, path, type) {
  event.preventDefault();
  event.stopPropagation();
  closeTreeContextMenu();

  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  menu.id = "tree-ctx-menu";
  menu.style.left = event.clientX + "px";
  menu.style.top = event.clientY + "px";

  const isWiki = type === "wiki";
  const isRaw = type === "raw";
  const isDir = type === "dir";
  let items = [];

  if (isDir) {
    const rootType =
      path.startsWith("wiki") || event.target?.closest?.("#wiki-tree")
        ? "wiki"
        : "raw";
    items = [
      {
        label: "New Folder",
        icon: "📁",
        action: () => createSubfolder(path, rootType),
      },
      ...(rootType === "wiki"
        ? [
            {
              label: "New Note",
              icon: "📝",
              action: () => createNoteInFolder(path),
            },
          ]
        : []),
      { sep: true },
      {
        label: "Copy Path",
        icon: "📋",
        action: () => {
          navigator.clipboard.writeText(path || title);
          showToast("✓ Path copied");
        },
      },
    ];
  } else if (isWiki) {
    items = [
      {
        label: "Open in New Tab",
        icon: "↗",
        action: () => openPage(title),
      },
      {
        label: isBookmarked(title) ? "Remove Bookmark" : "Add Bookmark",
        icon: "★",
        action: () => toggleBookmarkTitle(title),
      },
      { sep: true },
      {
        label: "Rename",
        icon: "✏",
        action: () => renameFile(title, path, type),
      },
      { label: "Move To…", icon: "➜", action: () => moveWikiPage(title) },
      {
        label: "Duplicate",
        icon: "⧉",
        action: () => duplicateFile(title, path, type),
      },
      {
        label: "Copy Path",
        icon: "📋",
        action: () => {
          navigator.clipboard.writeText(path || title);
          showToast("✓ Path copied");
        },
      },
      { sep: true },
      {
        label: "Delete",
        icon: "🗑",
        action: () => deleteFile(title, path, type),
        danger: true,
      },
    ];
  } else if (isRaw) {
    items = [
      { label: "Open", icon: "↗", action: () => viewRawFile(path) },
      { sep: true },
      {
        label: "Rename",
        icon: "✏",
        action: () => renameFile(title, path, type),
      },
      {
        label: "Download",
        icon: "⬇",
        action: () => downloadRawFile(path),
      },
      {
        label: "Copy Path",
        icon: "📋",
        action: () => {
          navigator.clipboard.writeText(path || title);
          showToast("✓ Path copied");
        },
      },
      { sep: true },
      {
        label: "Delete",
        icon: "🗑",
        action: () => deleteFile(title, path, type),
        danger: true,
      },
    ];
  }

  for (const item of items) {
    if (item.sep) {
      menu.innerHTML += '<div class="ctx-menu-sep"></div>';
      continue;
    }
    const el = document.createElement("div");
    el.className = "ctx-menu-item";
    if (item.danger) el.style.color = "var(--red)";
    el.innerHTML = `${item.icon || ""} ${item.label}`;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.remove();
      item.action();
    });
    menu.appendChild(el);
  }

  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth)
    menu.style.left = window.innerWidth - rect.width - 8 + "px";
  if (rect.bottom > window.innerHeight)
    menu.style.top = window.innerHeight - rect.height - 8 + "px";
}

function closeTreeContextMenu() {
  document.getElementById("tree-ctx-menu")?.remove();
}
document.addEventListener("click", closeTreeContextMenu);

// UXO-033: Enter key triggers inline rename on focused tree-file items
function treeItemKeyDown(event, el, label, path, type) {
  if (event.key === "Enter" || event.key === "F2") {
    event.preventDefault();
    event.stopPropagation();
    startInlineRename(el, label, path, type);
  }
}

function startInlineRename(el, label, path, type) {
  const labelSpan = el.querySelector(".tree-label");
  if (!labelSpan || el.querySelector(".tree-rename-input")) return;
  const originalText = labelSpan.textContent;
  const input = document.createElement("input");
  input.className = "tree-rename-input";
  input.value = originalText;
  input.style.marginLeft = "0";
  labelSpan.replaceWith(input);
  input.focus();
  input.select();

  const commit = async () => {
    const newName = input.value.trim();
    if (!newName || newName === originalText) {
      cancel();
      return;
    }
    // Restore label while we wait for server
    const restoredSpan = document.createElement("span");
    restoredSpan.className = "tree-label";
    restoredSpan.textContent = newName;
    input.replaceWith(restoredSpan);
    try {
      if (type === "raw") {
        const dir = path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : "";
        const ext = path.includes(".") ? path.substring(path.lastIndexOf(".")) : "";
        const newPath = dir ? dir + "/" + newName + ext : newName + ext;
        const res = await fetch("/api/raw/rename", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ oldPath: path, newPath }),
        });
        const data = await res.json();
        if (data.error) { showToast("Rename failed: " + data.error); }
      } else {
        const res = await fetch("/api/pages/" + encodeURIComponent(label) + "/rename", {
          method: "POST", headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ newTitle: newName }),
        });
        const data = await res.json();
        if (data.error) { showToast("Rename failed: " + data.error); }
      }
      showToast("✓ Renamed");
      loadTree();
      loadHome();
    } catch { showToast("Rename failed"); }
  };

  const cancel = () => {
    const restoredSpan = document.createElement("span");
    restoredSpan.className = "tree-label";
    restoredSpan.textContent = originalText;
    input.replaceWith(restoredSpan);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.stopPropagation(); commit(); }
    else if (e.key === "Escape") { e.stopPropagation(); cancel(); }
  });
  input.addEventListener("blur", () => setTimeout(cancel, 150));
}
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest?.(".tree-item")) {
    e.preventDefault();
  }
});

async function renameFile(title, path, type) {
  const newName = await showInputModal("Rename", "New name", title, "Rename");
  if (!newName || newName === title) return;
  try {
    if (type === "raw") {
      const dir = path.includes("/")
        ? path.substring(0, path.lastIndexOf("/"))
        : "";
      const ext = path.includes(".")
        ? path.substring(path.lastIndexOf("."))
        : "";
      const newPath = dir ? dir + "/" + newName + ext : newName + ext;
      const res = await fetch("/api/raw/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath: path, newPath }),
      });
      const data = await res.json();
      if (data.error) {
        showToast("Rename failed: " + data.error);
        return;
      }
    } else {
      const res = await fetch(
        "/api/pages/" + encodeURIComponent(title) + "/rename",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newTitle: newName }),
        },
      );
      const data = await res.json();
      if (data.error) {
        showToast("Rename failed: " + data.error);
        return;
      }
    }
    showToast("✓ Renamed");
    loadTree();
    loadHome();
  } catch {
    showToast("Rename failed");
  }
}

async function deleteFile(title, path, type) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    if (type === "raw") {
      const res = await fetch(
        "/api/raw/file?path=" + encodeURIComponent(path),
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.error) {
        showToast("Delete failed: " + data.error);
        return;
      }
    } else {
      const res = await fetch("/api/pages/" + encodeURIComponent(title), {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Delete failed: " + data.error);
        return;
      }
    }
    showToast("✓ Deleted");
    loadTree();
    loadHome();
  } catch {
    showToast("Delete failed");
  }
}

async function duplicateFile(title, path, type) {
  const newTitle = title + " (copy)";
  try {
    const data = await fetch(
      "/api/pages/" + encodeURIComponent(title) + "/raw",
    ).then((r) => r.json());
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        content: data.raw || "",
      }),
    });
    showToast("✓ Duplicated");
    loadTree();
  } catch {
    showToast("Duplicate failed");
  }
}

function downloadRawFile(path) {
  const a = document.createElement("a");
  a.href = "/api/raw/file?path=" + encodeURIComponent(path);
  a.download = path.split("/").pop() || "file";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function moveWikiPage(title) {
  const categories = ["sources", "entities", "concepts", "syntheses"];
  const choice = await showInputModal("Move to Category", "sources, entities, concepts, syntheses…", "", "Move");
  if (!choice || !choice.trim()) return;
  try {
    const res = await fetch(
      "/api/pages/" + encodeURIComponent(title) + "/move",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCategory: choice.trim() }),
      },
    );
    const data = await res.json();
    if (data.error) {
      showToast("Move failed: " + data.error);
      return;
    }
    showToast("✓ Moved to " + choice.trim());
    loadTree();
    loadHome();
  } catch {
    showToast("Move failed");
  }
}

async function createSubfolder(parentPath, rootType) {
  const name = await showInputModal("New Folder", "Folder name", "", "Create");
  if (!name || !name.trim()) return;
  const base = rootType === "wiki" ? "wiki" : "raw";
  const fullPath = parentPath
    ? base + "/" + parentPath + "/" + name.trim()
    : base + "/" + name.trim();
  try {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fullPath }),
    });
    const data = await res.json();
    if (data.error) {
      showToast("Create folder failed: " + data.error);
      return;
    }
    showToast("✓ Folder created");
    loadTree();
  } catch {
    showToast("Create folder failed");
  }
}

async function createNoteInFolder(folderPath) {
  const title = await showInputModal("New Note", "Note title", "", "Create");
  if (!title || !title.trim()) return;
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  try {
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        slug: folderPath ? folderPath + "/" + slug : slug,
      }),
    });
    const data = await res.json();
    if (data.error) {
      showToast("Create note failed: " + data.error);
      return;
    }
    showToast("✓ Note created");
    loadTree();
    openPage(title.trim());
  } catch {
    showToast("Create note failed");
  }
}

async function handleFileDragDrop(event, targetFolderPath, rootType) {
  try {
    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.type === "raw") {
      const res = await fetch("/api/raw/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: data.path,
          targetDir: targetFolderPath,
        }),
      });
      const result = await res.json();
      if (result.error) {
        showToast("Move failed: " + result.error);
        return;
      }
      showToast("✓ Moved " + (data.path.split("/").pop() || "file"));
    } else if (data.type === "wiki") {
      const res = await fetch(
        "/api/pages/" + encodeURIComponent(data.title) + "/move",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetCategory: targetFolderPath }),
        },
      );
      const result = await res.json();
      if (result.error) {
        showToast("Move failed: " + result.error);
        return;
      }
      showToast("✓ Moved " + data.title);
    }
    loadTree();
    loadHome();
  } catch (err) {
    showToast("Drop failed");
  }
}

async function fetchPageRaw(title) {
  const data = await fetch(
    "/api/pages/" + encodeURIComponent(title) + "/raw",
  ).then((r) => r.json());
  return { raw: data.raw || "", slug: data.slug || title };
}

function parseFrontmatterBounds(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return {
    start: 4,
    end: 4 + m[1].length,
    yaml: m[1],
    body: raw.slice(m[0].length),
  };
}

function updateYamlField(yaml, key, value) {
  const lineRe = new RegExp("^" + key + ":\\s*.*$", "m");
  if (lineRe.test(yaml)) {
    return yaml.replace(lineRe, `${key}: ${value}`);
  }
  return yaml + "\n" + `${key}: ${value}`;
}

function removeYamlField(yaml, key) {
  return yaml.replace(new RegExp("^" + key + ":.*\\n?", "m"), "");
}

function getYamlTags(yaml) {
  const m = yaml.match(/^tags:\s*\[([^\]]*)\]/m);
  if (!m) return [];
  return m[1]
    ? m[1]
        .split(",")
        .map((t) => t.trim().replace(/^"|"$/g, "").trim())
        .filter(Boolean)
    : [];
}

function setYamlTags(yaml, tags) {
  const line = `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`;
  if (/^tags:\s*\[/m.test(yaml))
    return yaml.replace(/^tags:\s*\[[^\]]*\]/m, line);
  return yaml + "\n" + line;
}

async function saveRawAndRefresh(title, raw, slug) {
  await fetch("/api/pages/" + encodeURIComponent(slug), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: raw }),
  });
  await openPage(title, true);
}

async function updatePageFrontmatter(title, field, value) {
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) {
      showToast("No frontmatter found");
      return;
    }
    let newYaml = bounds.yaml;
    if (Array.isArray(value)) {
      if (field === "tags") newYaml = setYamlTags(newYaml, value);
      else if (field === "sources")
        newYaml = setYamlSources(newYaml, value);
      else if (field === "related")
        newYaml = setYamlRelated(newYaml, value);
      else
        newYaml = updateYamlField(
          newYaml,
          field,
          `[${value.map((v) => `"${v}"`).join(", ")}]`,
        );
    } else if (value === null || value === undefined) {
      newYaml = removeYamlField(newYaml, field);
    } else {
      const formatted = /^\d{4}-\d{2}-\d{2}/.test(String(value))
        ? `"${value}"`
        : /^[{\[]/.test(String(value))
          ? String(value)
          : field === "type"
            ? String(value)
            : `"${value}"`;
      newYaml = updateYamlField(newYaml, field, formatted);
    }
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    flashConfirmMeta();
    showToast("✓ Updated " + field);
  } catch (e) {
    console.error("updatePageFrontmatter:", e);
    showToast("Failed to update " + field);
  }
}

async function commitTitleEdit(el, originalTitle) {
  const newTitle = (el.textContent || "").trim();
  if (!newTitle || newTitle === originalTitle) {
    el.textContent = originalTitle;
    return;
  }
  try {
    const { raw, slug } = await fetchPageRaw(originalTitle);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    const newYaml = updateYamlField(
      bounds.yaml,
      "title",
      `"${newTitle}"`,
    );
    let body = bounds.body;
    const headingRe = new RegExp(
      "^(\\s*#\\s+)" +
        originalTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "\\s*$",
      "m",
    );
    body = body.replace(headingRe, `$1${newTitle}`);
    const newRaw = "---\n" + newYaml + "\n---" + body;
    await fetch("/api/pages/" + encodeURIComponent(slug), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newRaw }),
    });
    showToast("✓ Title updated");
    loadTree();
    loadHome();
    await openPage(newTitle, true);
  } catch (e) {
    el.textContent = originalTitle;
    showToast("Failed to rename");
  }
}

// ── Confidence & Validation System ──
function renderConfidenceBadge(fm) {
  const el = document.getElementById("page-confidence-badge");
  if (!el) return;
  const val = typeof fm.confidence === "number" ? fm.confidence : null;
  if (val === null) {
    el.style.display = "none";
    return;
  }
  const tier = val > 80 ? "high" : val >= 50 ? "medium" : "low";
  const icons = {
    high: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    medium:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    low: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  };
  el.className = `confidence-badge ${tier}`;
  el.innerHTML = `${icons[tier]} ${val}%`;
  el.title = `Confidence: ${val}% (${tier})`;
  el.style.display = "";
}

function renderValidationBar(title, fm) {
  const el = document.getElementById("page-validation-bar");
  if (!el) return;
  const vs = fm.validation_status || "unreviewed";
  const validatedAt = fm.validated_at ? ` · ${fm.validated_at}` : "";
  el.innerHTML = `
  <button class="validation-btn${vs === "verified" ? " active-verified" : ""}" onclick="setPageValidation('${esc(title)}','verified')">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Verified
  </button>
  <button class="validation-btn${vs === "outdated" ? " active-outdated" : ""}" onclick="setPageValidation('${esc(title)}','outdated')">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Outdated
  </button>
  <button class="validation-btn${vs === "wrong" ? " active-wrong" : ""}" onclick="setPageValidation('${esc(title)}','wrong')">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Wrong
  </button>
  ${vs !== "unreviewed" ? `<span class="validation-status-label">${vs}${validatedAt}</span>` : ""}`;
  el.style.display = "flex";
}

async function setPageValidation(title, status) {
  try {
    const res = await fetch(
      "/api/pages/" + encodeURIComponent(title) + "/validate",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ validation_status: status }),
      },
    );
    const data = await res.json();
    if (data.error) {
      showToast("Validation failed: " + data.error);
      return;
    }
    showToast(`✓ Marked as ${status}`);
    // Re-render with updated frontmatter
    const fm = data.page?.frontmatter || {};
    renderConfidenceBadge(fm);
    renderValidationBar(title, fm);
  } catch (err) {
    showToast("Validation failed");
  }
}

async function removePageTag(title, tag) {
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    let tags = getYamlTags(bounds.yaml);
    tags = tags.filter((t) => t !== tag);
    const newYaml = tags.length
      ? setYamlTags(bounds.yaml, tags)
      : removeYamlField(bounds.yaml, "tags");
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    showToast("✓ Tag removed");
  } catch (e) {
    showToast("Failed to remove tag");
  }
}

async function addPageTag(title, tag) {
  if (!tag || !tag.trim()) return;
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    let tags = getYamlTags(bounds.yaml);
    if (tags.includes(tag.trim())) {
      showToast("Tag already exists");
      return;
    }
    tags.push(tag.trim());
    const newYaml = setYamlTags(bounds.yaml, tags);
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    showToast("✓ Tag added");
  } catch (e) {
    showToast("Failed to add tag");
  }
}

async function addTagToPage(title) {
  const tag = await showInputModal("Add Tag", "Tag name", "", "Add");
  if (tag) await addPageTag(title, tag);
}

function startInlineTagAdd(el, title) {
  if (el.querySelector(".meta-tag-input")) return;
  const input = document.createElement("input");
  input.className = "meta-tag-input";
  input.placeholder = "tag name";
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = input.value.trim();
      if (v) await addPageTag(title, v);
    }
    if (e.key === "Escape") {
      input.remove();
      el.textContent = "+";
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (input.parentNode) {
        input.remove();
        el.textContent = "+";
      }
    }, 150);
  });
  el.textContent = "";
  el.appendChild(input);
  input.focus();
}

function startEditProperty(el, title, key) {
  if (el.querySelector("input")) return;
  const current = el.textContent;
  const input = document.createElement("input");
  input.className = "meta-val-input";
  input.value = current;
  const save = async () => {
    const v = input.value.trim();
    if (v === current) {
      el.textContent = current;
      return;
    }
    await updatePageProperty(title, key, v);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      el.textContent = current;
    }
  });
  input.addEventListener("blur", save);
  el.textContent = "";
  el.appendChild(input);
  input.focus();
  input.select();
}

async function updatePageProperty(title, key, value) {
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    const formatted = /^\d{4}-\d{2}-\d{2}/.test(value)
      ? `"${value}"`
      : /^[{\[]/.test(value)
        ? value
        : `"${value}"`;
    const newYaml = updateYamlField(bounds.yaml, key, formatted);
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    showToast("✓ Updated " + key);
  } catch (e) {
    showToast("Failed to update property");
  }
}

function startAddProperty(el, title) {
  if (
    el.nextElementSibling &&
    el.nextElementSibling.classList.contains("meta-add-prop-form")
  )
    return;
  const form = document.createElement("div");
  form.className = "meta-add-prop-form";
  form.innerHTML = `
  <input type="text" placeholder="Name" class="prop-name-input" style="width:90px"/>
  <select class="prop-type-select">
    <option value="text">Text</option>
    <option value="date">Date</option>
    <option value="url">URL</option>
    <option value="list">List</option>
  </select>
  <input type="text" placeholder="Value" class="prop-val-input" style="width:120px"/>
  <button onclick="submitAddProperty(this.parentNode,'${esc(title)}')">Add</button>
`;
  el.after(form);
  form.querySelector(".prop-name-input").focus();
  form
    .querySelector(".prop-val-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitAddProperty(form, title);
      }
      if (e.key === "Escape") {
        form.remove();
      }
    });
  form
    .querySelector(".prop-name-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        form.remove();
      }
    });
}

async function submitAddProperty(formEl, title) {
  const name = formEl.querySelector(".prop-name-input").value.trim();
  const type = formEl.querySelector(".prop-type-select").value;
  const val = formEl.querySelector(".prop-val-input").value.trim();
  if (!name) {
    showToast("Property name required");
    return;
  }
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    let formatted;
    if (type === "list")
      formatted = `[${val
        .split(",")
        .map((v) => `"${v.trim()}"`)
        .join(", ")}]`;
    else if (type === "date") formatted = `"${val}"`;
    else if (type === "url") formatted = `"${val}"`;
    else formatted = `"${val}"`;
    const newYaml = updateYamlField(bounds.yaml, name, formatted);
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    showToast("✓ Added " + name);
  } catch (e) {
    showToast("Failed to add property");
  }
}

// ── YAML helpers for sources ──
function getYamlSources(yaml) {
  const m = yaml.match(/^sources:\s*\[([\s\S]*?)\]/m);
  if (!m) return [];
  return m[1]
    ? m[1]
        .split(",")
        .map((t) => t.trim().replace(/^"|"$/g, "").trim())
        .filter(Boolean)
    : [];
}
function setYamlSources(yaml, sources) {
  const line = `sources: [${sources.map((s) => `"${s}"`).join(", ")}]`;
  if (/^sources:\s*\[/m.test(yaml))
    return yaml.replace(/^sources:\s*\[[\s\S]*?\]/m, line);
  return yaml + "\n" + line;
}

// ── YAML helpers for related ──
function getYamlRelated(yaml) {
  const m = yaml.match(/^related:\s*\[([\s\S]*?)\]/m);
  if (!m) return [];
  return m[1]
    ? m[1]
        .split(",")
        .map((t) => t.trim().replace(/^"|"$/g, "").trim())
        .filter(Boolean)
    : [];
}
function setYamlRelated(yaml, related) {
  const line = `related: [${related.map((r) => `"${r}"`).join(", ")}]`;
  if (/^related:\s*\[/m.test(yaml))
    return yaml.replace(/^related:\s*\[[\s\S]*?\]/m, line);
  return yaml + "\n" + line;
}

function flashConfirmMeta() {
  const metaEl = document.getElementById("page-meta");
  if (!metaEl) return;
  metaEl.classList.remove("meta-flash");
  void metaEl.offsetWidth;
  metaEl.classList.add("meta-flash");
  setTimeout(() => metaEl.classList.remove("meta-flash"), 600);
}

// ── Source CRUD ──
async function removePageSource(title, source) {
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    let sources = getYamlSources(bounds.yaml);
    sources = sources.filter((s) => s !== source);
    const newYaml = sources.length
      ? setYamlSources(bounds.yaml, sources)
      : removeYamlField(bounds.yaml, "sources");
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    flashConfirmMeta();
    showToast("✓ Source removed");
  } catch (e) {
    showToast("Failed to remove source");
  }
}

async function addPageSource(title, source) {
  if (!source || !source.trim()) return;
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    let sources = getYamlSources(bounds.yaml);
    if (sources.includes(source.trim())) {
      showToast("Source already exists");
      return;
    }
    sources.push(source.trim());
    const newYaml = setYamlSources(bounds.yaml, sources);
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    flashConfirmMeta();
    showToast("✓ Source added");
  } catch (e) {
    showToast("Failed to add source");
  }
}

function startInlineSourceAdd(el, title) {
  if (el.querySelector(".meta-add-input")) return;
  const input = document.createElement("input");
  input.className = "meta-add-input";
  input.placeholder = "raw/path...";
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = input.value.trim();
      if (v) await addPageSource(title, v);
    }
    if (e.key === "Escape") {
      input.remove();
      el.textContent = "+";
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (input.parentNode) {
        input.remove();
        el.textContent = "+";
      }
    }, 150);
  });
  el.textContent = "";
  el.appendChild(input);
  input.focus();
}

// ── Related CRUD ──
async function removePageRelated(title, related) {
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    let rels = getYamlRelated(bounds.yaml);
    rels = rels.filter((r) => r !== related);
    const newYaml = rels.length
      ? setYamlRelated(bounds.yaml, rels)
      : removeYamlField(bounds.yaml, "related");
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    flashConfirmMeta();
    showToast("✓ Related removed");
  } catch (e) {
    showToast("Failed to remove related");
  }
}

async function addPageRelated(title, related) {
  if (!related || !related.trim()) return;
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    let rels = getYamlRelated(bounds.yaml);
    const wrapped = related.startsWith("[[")
      ? related
      : `[[${related.trim()}]]`;
    if (rels.includes(wrapped)) {
      showToast("Already linked");
      return;
    }
    rels.push(wrapped);
    const newYaml = setYamlRelated(bounds.yaml, rels);
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    flashConfirmMeta();
    showToast("✓ Related added");
  } catch (e) {
    showToast("Failed to add related");
  }
}

function startInlineRelatedAdd(el, title) {
  if (el.querySelector(".meta-add-input")) return;
  const wrapper = document.createElement("span");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";
  const input = document.createElement("input");
  input.className = "meta-add-input";
  input.placeholder = "page title...";
  const dropdown = document.createElement("div");
  dropdown.className = "meta-related-autocomplete";
  dropdown.style.display = "none";
  wrapper.appendChild(input);
  wrapper.appendChild(dropdown);

  let acIndex = -1;
  function updateAc() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      dropdown.style.display = "none";
      return;
    }
    const matches = (state.allPages || [])
      .filter(
        (p) => p.title.toLowerCase().includes(q) && p.title !== title,
      )
      .slice(0, 8);
    if (!matches.length) {
      dropdown.style.display = "none";
      return;
    }
    acIndex = -1;
    dropdown.innerHTML = matches
      .map(
        (m, i) =>
          `<div class="ac-item" data-title="${esc(m.title)}">${esc(m.title)}</div>`,
      )
      .join("");
    dropdown.style.display = "block";
    dropdown.querySelectorAll(".ac-item").forEach((item) => {
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        addPageRelated(title, item.dataset.title);
      });
    });
  }

  input.addEventListener("input", updateAc);
  input.addEventListener("keydown", async (e) => {
    const items = dropdown.querySelectorAll(".ac-item");
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      acIndex = Math.min(acIndex + 1, items.length - 1);
      items.forEach((it, i) =>
        it.classList.toggle("active", i === acIndex),
      );
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      acIndex = Math.max(acIndex - 1, 0);
      items.forEach((it, i) =>
        it.classList.toggle("active", i === acIndex),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected =
        acIndex >= 0 && items[acIndex]
          ? items[acIndex].dataset.title
          : input.value.trim();
      if (selected) await addPageRelated(title, selected);
    } else if (e.key === "Escape") {
      wrapper.remove();
      el.textContent = "+";
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (wrapper.parentNode) {
        wrapper.remove();
        el.textContent = "+";
      }
    }, 200);
  });

  el.textContent = "";
  el.appendChild(wrapper);
  input.focus();
}

// ── Type change ──
async function changePageType(title, newType) {
  try {
    const { raw, slug } = await fetchPageRaw(title);
    const bounds = parseFrontmatterBounds(raw);
    if (!bounds) return;
    const newYaml = updateYamlField(bounds.yaml, "type", newType);
    const newRaw = "---\n" + newYaml + "\n---" + bounds.body;
    await saveRawAndRefresh(title, newRaw, slug);
    flashConfirmMeta();
    showToast("✓ Type changed to " + newType);
  } catch (e) {
    showToast("Failed to change type");
  }
}

// Legacy stubs (keep for any remaining references)
function exitEditMode(force) {
  if (force) deactivateWysiwyg();
  else cancelWysiwyg();
}
function cancelEdit() {
  cancelWysiwyg();
}
async function saveEdit() {
  await saveWysiwyg();
}
function updateLineNumbers() {}
function wrapSelection() {}
function insertLink() {}

// Global keyboard shortcuts
document.addEventListener("keydown", (e) => {
  const isMod = e.ctrlKey || e.metaKey;

  // Ctrl+E → toggle edit mode (only on wiki pages)
  if (
    isMod &&
    e.key === "e" &&
    state.viewMode === "page" &&
    state.editTabType === "wiki"
  ) {
    e.preventDefault();
    toggleEditMode();
  }

  // Ctrl+S → save if editing (WYSIWYG)
  if (isMod && e.key === "s" && state.editing) {
    e.preventDefault();
    saveWysiwyg();
  }

  // Escape → cancel edit
  if (
    e.key === "Escape" &&
    state.editing &&
    !e.target.closest("input, textarea, [contenteditable]")
  ) {
    e.preventDefault();
    cancelWysiwyg();
  }
});

// Escape inside contenteditable
document.getElementById("page-body").addEventListener("keydown", (e) => {
  if (!state.editing) return;
  const isMod = e.ctrlKey || e.metaKey;
  if (isMod && e.key === "s") {
    e.preventDefault();
    saveWysiwyg();
  }
  if (e.key === "Escape") {
    e.preventDefault();
    cancelWysiwyg();
  }
});

// ── Git History / Audit Trail ──
let historyDebounce = null;
let auditActorFilter = "all";

// UXO-087: ingest and scraper are distinct actor types (no more "agent"/"webhook")
function inferActor(entry) {
  const msg = entry.message || "";
  const msgLower = msg.toLowerCase();
  const author = (entry.author || "").toLowerCase();
  if (/^wiki:\s*feat\(observe\)/i.test(msg)) return "observer";
  if (/^wiki:\s*feat\(ingest\)/i.test(msg)) return "ingest";
  if (/^wiki:\s*feat\(scrape\)/i.test(msg)) return "scraper";
  if (msgLower.startsWith("observer:") || msgLower.includes("[observer]") || author.includes("observer")) return "observer";
  if (msgLower.startsWith("ingest:") || msgLower.includes("[ingest]") || author.includes("ingest")) return "ingest";
  if (msgLower.startsWith("scraper:") || msgLower.includes("[scrape]") || author.includes("scraper")) return "scraper";
  if (/^wiki:\s*feat\(manual\)/i.test(msg)) return "human";
  if (/^wiki:/i.test(msg) && (author.includes("wikimem") || author === "wikimem-cli")) return "ingest";
  return "human";
}

const ACTOR_BADGE_HTML = {
  human: '<span class="actor-badge actor-human">🧑 Human</span>',
  observer: '<span class="actor-badge actor-observer">🔭 Observer</span>',
  ingest: '<span class="actor-badge actor-agent">📥 Ingest</span>',
  scraper: '<span class="actor-badge actor-agent">🕷 Scraper</span>',
};

// UXO-083: advanced menu toggle
function toggleHistoryAdvancedMenu() {
  const dd = document.getElementById("history-advanced-dropdown");
  if (!dd) return;
  dd.style.display = dd.style.display === "block" ? "none" : "block";
}
function closeHistoryAdvancedMenu() {
  const dd = document.getElementById("history-advanced-dropdown");
  if (dd) dd.style.display = "none";
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".history-advanced-menu")) closeHistoryAdvancedMenu();
});

function inferCommitType(entry) {
  const msg = entry.message || "";
  if (/^wiki:\s*feat\(observe\)/i.test(msg)) return "observer";
  if (/^wiki:\s*feat\(ingest\)/i.test(msg)) return "ingest";
  if (/^wiki:\s*feat\(scrape\)/i.test(msg)) return "scraper";
  if (/^wiki:\s*feat\(manual\)/i.test(msg)) return "manual";
  if (/^wiki:/i.test(msg)) return "wiki";
  return "code";
}

const COMMIT_TYPE_LABELS = {
  observer: "Observer",
  ingest: "Ingest",
  scraper: "Scraper",
  manual: "Manual",
  wiki: "Wiki",
  code: "Code",
};

function setAuditTab(actor) {
  auditActorFilter = actor;
  document.querySelectorAll(".audit-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.actor === actor);
  });
  loadGitHistory();
}

async function loadGitHistory() {
  const timeline = document.getElementById("history-timeline");
  const branchInfo = document.getElementById("history-branch-info");
  const initBtn = document.getElementById("history-init-git");
  const searchEl = document.getElementById("history-search");

  // UXO-081: always hide migration banner
  const banner = document.getElementById("history-migrate-banner");
  if (banner) banner.style.display = "none";

  // Show loading state immediately
  timeline.innerHTML =
    '<div style="padding:20px;text-align:center;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 8px"></div>Loading audit trail\u2026</div>';

  try {
    // UXO-082: always pass wikiOnly=true
    const search = searchEl?.value?.trim() || "";
    let url = "/api/git/log?limit=50&wikiOnly=true";
    if (search) url += `&search=${encodeURIComponent(search)}`;

    // Fetch status and log in parallel
    const [status, log] = await Promise.all([
      api("/api/git/status"),
      api(url),
    ]);

    if (!status.initialized) {
      branchInfo.textContent = "Not a git repository";
      initBtn.style.display = "inline-block";
      timeline.innerHTML =
        '<p style="color:var(--text-muted);padding:20px">Initialize git to enable audit trail and checkpointing.</p>';
      return;
    }

    initBtn.style.display = "none";
    branchInfo.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg> ${esc(status.branch)}`;

    if (!log.length) {
      timeline.innerHTML =
        '<p style="color:var(--text-muted);padding:20px">No wiki commits yet. Ingest content to create wiki commits.</p>';
      return;
    }

    // Filter by actor tab
    const filtered =
      auditActorFilter === "all"
        ? log
        : log.filter((e) => inferActor(e) === auditActorFilter);

    if (!filtered.length) {
      timeline.innerHTML = `<p style="color:var(--text-muted);padding:20px">No ${auditActorFilter} entries found.</p>`;
      return;
    }

    // UXO-087: dot colors for new actor types
    const dotColors = {
      human: "var(--blue)",
      observer: "var(--orange)",
      ingest: "var(--green)",
      scraper: "var(--green)",
    };

    let html = "";
    for (const entry of filtered) {
      const date = new Date(entry.date);
      const dateStr =
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      const filesCount = entry.filesChanged?.length || 0;
      const commitId = "commit-" + entry.hashShort;
      const actor = inferActor(entry);
      const actorBadge =
        ACTOR_BADGE_HTML[actor] || ACTOR_BADGE_HTML.human;
      const typeBadge = entry.isWiki
        ? '<span class="commit-badge wiki">wiki</span>'
        : '<span class="commit-badge code">code</span>';
      const commitType = inferCommitType(entry);
      const commitTypeBadge = `<span class="commit-actor-badge ${commitType}">${COMMIT_TYPE_LABELS[commitType]}</span>`;
      const displayMsg = entry.isWiki
        ? entry.message.replace(/^wiki:\s*/, "")
        : entry.message;
      const msgEsc = esc(entry.message).replace(/'/g, "\\'");
      // UXO-084: click row expands inline diff
      html += `<div class="commit-item" onclick="expandCommitDiff('${entry.hash}','${commitId}')">
      <div class="commit-dot" style="background:${dotColors[actor] || "var(--accent)"}"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="commit-hash">${entry.hashShort}</span>
          ${actorBadge}
          ${typeBadge}
          ${commitTypeBadge}
          <span class="commit-msg">${esc(displayMsg)}</span>
        </div>
        <div class="commit-meta">${entry.author} \xb7 ${dateStr}${filesCount ? ` \xb7 ${filesCount} files` : ""}</div>
        <div class="commit-files" id="${commitId}">
          <div id="${commitId}-diff-body"></div>
          <button id="${commitId}-modal-btn" class="btn-sm" style="display:none;margin-top:6px" onclick="event.stopPropagation();openDiffModal('${entry.hash}','${entry.hashShort}','${msgEsc}')">Show Full Diff</button>
          <div style="margin-top:8px;display:flex;gap:6px">
            <button class="btn-sm" onclick="event.stopPropagation();restoreToCommit('${entry.hash}','${entry.hashShort}')">Restore</button>
          </div>
        </div>
      </div>
    </div>`;
    }
    timeline.innerHTML = html;
  } catch (err) {
    timeline.innerHTML = `<p style="color:var(--text-muted);padding:20px">Failed to load git history: ${err.message || err}</p>`;
  }
}

// UXO-084/085: expand commit diff inline, lazy-load from parsed diff API
async function expandCommitDiff(hash, commitId) {
  const filesEl = document.getElementById(commitId);
  if (!filesEl) return;
  const isOpen = filesEl.classList.toggle("open");
  if (!isOpen) return;
  const diffBody = document.getElementById(commitId + "-diff-body");
  const modalBtn = document.getElementById(commitId + "-modal-btn");
  if (!diffBody) return;
  if (diffBody.dataset.loaded === "1") return;
  diffBody.innerHTML =
    '<div style="color:var(--text-muted);padding:8px 0">Loading diff\u2026</div>';
  try {
    const data = await api("/api/git/diff/" + hash + "/parsed");
    const files = data.files;
    const stats = data.stats;
    if (!files || !files.length) {
      diffBody.innerHTML =
        '<div style="color:var(--text-muted);padding:4px 0">No diff available (initial commit)</div>';
      diffBody.dataset.loaded = "1";
      return;
    }
    let totalLines = 0;
    for (const f of files)
      for (const h of f.hunks || [])
        totalLines += (h.lines || []).length;
    // UXO-085: show "Show Full Diff" only when diff >100 lines
    if (totalLines > 100 && modalBtn)
      modalBtn.style.display = "inline-block";
    let html =
      '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">' +
      stats.filesChanged +
      " file" +
      (stats.filesChanged !== 1 ? "s" : "") +
      ' \xb7 <span style="color:var(--green)">+' +
      stats.additions +
      '</span> <span style="color:var(--red)">-' +
      stats.deletions +
      "</span></div>";
    for (const f of files) {
      const statusLabel =
        f.status.charAt(0).toUpperCase() + f.status.slice(1);
      html += '<div style="margin-bottom:8px">';
      html +=
        '<div style="font-family:var(--font-mono);font-size:11px;padding:3px 6px;background:var(--bg-card);border-radius:4px 4px 0 0;border:1px solid var(--border);">' +
        statusLabel +
        " " +
        esc(f.path) +
        " +" +
        f.insertions +
        " -" +
        f.deletions +
        "</div>";
      html +=
        '<div style="font-family:var(--font-mono);font-size:11px;border:1px solid var(--border);border-top:none;border-radius:0 0 4px 4px;overflow:hidden">';
      for (const hunk of f.hunks || []) {
        html +=
          '<div style="padding:2px 8px;background:rgba(79,158,255,0.06);color:var(--text-muted)">' +
          esc(hunk.header) +
          "</div>";
        for (const line of hunk.lines || []) {
          const prefix =
            line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
          const bg =
            line.type === "add"
              ? "rgba(78,201,176,0.08)"
              : line.type === "del"
                ? "rgba(244,71,71,0.08)"
                : "transparent";
          const color =
            line.type === "add"
              ? "var(--green)"
              : line.type === "del"
                ? "var(--red)"
                : "var(--text-secondary)";
          html +=
            '<div style="padding:1px 8px;background:' +
            bg +
            ";color:" +
            color +
            ';white-space:pre;tab-size:2">' +
            esc(prefix + line.content) +
            "</div>";
        }
      }
      html += "</div></div>";
    }
    diffBody.innerHTML = html;
    diffBody.dataset.loaded = "1";
  } catch (err) {
    diffBody.innerHTML =
      '<div style="color:var(--red);padding:4px 0">Failed to load diff: ' +
      esc(err.message || String(err)) +
      "</div>";
  }
}

// UXO-086: restore uses POST /api/git/restore, shows toast (not alert)
async function restoreToCommit(hash, hashShort) {
  if (
    !confirm(
      "Restore wiki to commit " +
        hashShort +
        "?\n\nThis will reset the wiki to this checkpoint. Uncommitted changes will be preserved as a stash.",
    )
  )
    return;
  try {
    const result = await fetch("/api/git/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash }),
    }).then((r) => r.json());
    if (result.restored) {
      showToast("Wiki restored to commit " + hashShort, 4000);
      loadGitHistory();
      loadTree();
      if (typeof loadStatus === "function") loadStatus();
      loadGitBadge();
    } else {
      showToast(
        "Restore failed: " + (result.message || "Unknown error"),
        4000,
      );
    }
  } catch (err) {
    showToast("Restore failed: " + (err.message || err), 4000);
  }
}

async function initGitRepo() {
  try {
    const result = await fetch("/api/git/init", { method: "POST" }).then(
      (r) => r.json(),
    );
    alert(result.message);
    loadGitHistory();
    loadGitBadge();
  } catch (err) {
    alert("Git init failed: " + err.message);
  }
}

// ── Git Status Badge (topbar) ──
let gitDropdownOpen = false;
async function loadGitBadge() {
  const badge = document.getElementById("git-status-badge");
  try {
    const status = await api("/api/git/status");
    if (!status.initialized) {
      badge.style.display = "none";
      return;
    }
    badge.style.display = "flex";
    document.getElementById("git-branch-name").textContent =
      status.branch || "main";
    const changesEl = document.getElementById("git-changes-count");
    const numChanges = status.changedCount || 0;
    if (numChanges > 0) {
      changesEl.textContent = numChanges;
      changesEl.style.display = "inline";
    } else {
      changesEl.style.display = "none";
    }
  } catch {
    badge.style.display = "none";
  }
}

function toggleGitDropdown() {
  const badge = document.getElementById("git-status-badge");
  let dropdown = badge.querySelector(".git-dropdown");
  if (dropdown) {
    dropdown.remove();
    gitDropdownOpen = false;
    return;
  }
  gitDropdownOpen = true;
  dropdown = document.createElement("div");
  dropdown.className = "git-dropdown";
  dropdown.innerHTML =
    '<div class="git-dropdown-header">Loading branches…</div>';
  badge.appendChild(dropdown);

  api("/api/git/status").then((status) => {
    if (!status.initialized) return;
    const current = status.branch || "main";
    const branches = status.branches || [current];
    let html = '<div class="git-dropdown-header">Branches</div>';
    for (const b of branches) {
      const isCurrent = b === current;
      html += `<div class="git-dropdown-item${isCurrent ? " current" : ""}" onclick="switchBranch('${esc(b)}')">
      <span class="check">${isCurrent ? "✓" : ""}</span>
      <span>${esc(b)}</span>
    </div>`;
    }
    html += '<div style="border-top:1px solid var(--border)">';
    html +=
      '<div class="git-dropdown-item" onclick="createNewBranch()"><span class="check">+</span><span>Create branch…</span></div>';
    html += "</div>";
    dropdown.innerHTML = html;
  });
}

async function switchBranch(branch) {
  const result = await fetch("/api/git/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch }),
  }).then((r) => r.json());
  if (result.switched) {
    loadGitBadge();
    loadTree();
    loadHome();
    if (state.viewMode === "history") loadGitHistory();
  } else alert(result.message);
  closeGitDropdown();
}

async function createNewBranch() {
  closeGitDropdown();
  const name = await showInputModal("New Branch", "Branch name (e.g. wiki/my-edits)", "", "Create");
  if (!name) return;
  const result = await fetch("/api/git/branch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }).then((r) => r.json());
  if (result.created) {
    loadGitBadge();
    if (state.viewMode === "history") loadGitHistory();
  } else alert(result.message);
}

function closeGitDropdown() {
  const dd = document.querySelector(".git-dropdown");
  if (dd) dd.remove();
  gitDropdownOpen = false;
}

document.addEventListener("click", (e) => {
  if (gitDropdownOpen && !e.target.closest("#git-status-badge"))
    closeGitDropdown();
});

// ── Rich Diff Modal ──
async function openDiffModal(hash, hashShort, message) {
  const overlay = document.getElementById("diff-modal-overlay");
  overlay.style.display = "flex";
  document.getElementById("diff-modal-hash").textContent = hashShort;
  document.getElementById("diff-modal-msg").textContent = message.replace(
    /^wiki:\s*/,
    "",
  );
  document.getElementById("diff-modal-stats").innerHTML =
    '<span style="color:var(--text-muted)">Loading diff…</span>';
  document.getElementById("diff-modal-body").innerHTML = "";

  try {
    const data = await api(`/api/git/diff/${hash}/parsed`);
    const { files, stats } = data;

    document.getElementById("diff-modal-stats").innerHTML =
      `<span>${stats.filesChanged} file${stats.filesChanged !== 1 ? "s" : ""} changed</span>` +
      `<span class="diff-stat-add">+${stats.additions}</span>` +
      `<span class="diff-stat-del">-${stats.deletions}</span>`;

    if (!files.length) {
      document.getElementById("diff-modal-body").innerHTML =
        '<div style="padding:32px;text-align:center;color:var(--text-muted)">No diff available (possibly the initial commit)</div>';
      return;
    }

    let html = "";
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const statusClass = f.status;
      const statusLabel =
        f.status.charAt(0).toUpperCase() + f.status.slice(1);
      html += `<div class="diff-file-section">`;
      html += `<div class="diff-file-header" onclick="toggleDiffFile(${i})">`;
      html += `<span class="diff-file-chevron" id="diff-chev-${i}">▶</span>`;
      html += `<span class="diff-file-status ${statusClass}">${statusLabel}</span>`;
      html += `<span class="diff-file-path">${esc(f.path)}</span>`;
      html += `<span class="diff-file-counts"><span class="diff-stat-add">+${f.insertions}</span> <span class="diff-stat-del">-${f.deletions}</span></span>`;
      html += `</div>`;
      html += `<div class="diff-hunks" id="diff-hunks-${i}">`;
      for (const hunk of f.hunks) {
        html += `<div class="diff-hunk-header">${esc(hunk.header)}</div>`;
        for (const line of hunk.lines) {
          const prefix =
            line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
          html += `<div class="diff-hunk-line ${line.type}">${esc(prefix + line.content)}</div>`;
        }
      }
      html += `</div></div>`;
    }
    document.getElementById("diff-modal-body").innerHTML = html;

    if (files.length > 0) toggleDiffFile(0);
  } catch (err) {
    document.getElementById("diff-modal-stats").innerHTML = "";
    document.getElementById("diff-modal-body").innerHTML =
      `<div style="padding:32px;text-align:center;color:var(--red)">Failed to load diff: ${esc(err.message || String(err))}</div>`;
  }
}

function toggleDiffFile(idx) {
  const hunks = document.getElementById(`diff-hunks-${idx}`);
  const chev = document.getElementById(`diff-chev-${idx}`);
  if (!hunks) return;
  const isOpen = hunks.classList.toggle("open");
  if (chev) chev.classList.toggle("open", isOpen);
}

function closeDiffModal() {
  document.getElementById("diff-modal-overlay").style.display = "none";
}

// ── PR / Submit for Review Modal ──
async function openPRModal() {
  const overlay = document.getElementById("pr-modal-overlay");
  overlay.style.display = "flex";
  document.getElementById("pr-loading").style.display = "block";
  document.getElementById("pr-content").style.display = "none";
  document.getElementById("pr-submit-btn").disabled = true;
  document.getElementById("pr-result-area").innerHTML = "";
  document.getElementById("pr-description").value = "";

  try {
    const summary = await api("/api/git/diff-summary");
    const allFiles = [
      ...(summary.filesAdded || []).map((f) => ({
        path: f,
        status: "added",
      })),
      ...(summary.filesModified || []).map((f) => ({
        path: f,
        status: "modified",
      })),
      ...(summary.filesDeleted || []).map((f) => ({
        path: f,
        status: "deleted",
      })),
    ];

    document.getElementById("pr-loading").style.display = "none";
    document.getElementById("pr-content").style.display = "block";

    if (allFiles.length === 0) {
      document.getElementById("pr-file-list").innerHTML =
        '<div style="color:var(--text-muted);padding:4px 0">No changes detected. Commit some changes first.</div>';
      document.getElementById("pr-stats-line").textContent = "";
    } else {
      let html = "";
      for (const f of allFiles) {
        html += `<div class="pr-file-item"><span class="pr-file-status ${f.status}">${f.status.charAt(0).toUpperCase()}</span><span>${esc(f.path)}</span></div>`;
      }
      document.getElementById("pr-file-list").innerHTML = html;
      document.getElementById("pr-stats-line").textContent =
        `${allFiles.length} file${allFiles.length !== 1 ? "s" : ""} · +${summary.totalAdditions || 0} / -${summary.totalDeletions || 0}`;
      document.getElementById("pr-submit-btn").disabled = false;
    }
  } catch (err) {
    document.getElementById("pr-loading").style.display = "none";
    document.getElementById("pr-content").style.display = "block";
    document.getElementById("pr-file-list").innerHTML =
      `<div style="color:var(--red)">Failed to load diff: ${esc(err.message || String(err))}</div>`;
  }
}

function closePRModal() {
  document.getElementById("pr-modal-overlay").style.display = "none";
}

async function submitPR() {
  const btn = document.getElementById("pr-submit-btn");
  const desc = document.getElementById("pr-description").value.trim();
  btn.disabled = true;
  btn.textContent = "Submitting…";
  document.getElementById("pr-result-area").innerHTML = "";

  try {
    const res = await fetch("/api/git/pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc || undefined }),
    });
    const result = await res.json();

    if (result.error) {
      document.getElementById("pr-result-area").innerHTML =
        `<div class="pr-result error">${esc(result.error)}</div>`;
      btn.textContent = "Submit";
      btn.disabled = false;
      return;
    }

    const cls = result.pushed ? "success" : "partial";
    let msg = `Branch: <strong>${esc(result.branch)}</strong> (base: ${esc(result.baseBranch)})`;
    msg += `<br>${esc(result.pushMessage)}`;
    const d = result.diff;
    if (d) {
      const total =
        (d.filesAdded?.length || 0) +
        (d.filesModified?.length || 0) +
        (d.filesDeleted?.length || 0);
      msg += `<br>${total} file${total !== 1 ? "s" : ""} changed (+${d.totalAdditions} / -${d.totalDeletions})`;
    }
    document.getElementById("pr-result-area").innerHTML =
      `<div class="pr-result ${cls}">${msg}</div>`;
    btn.textContent = "Done";
    loadGitBadge();
    if (state.viewMode === "history") loadGitHistory();
  } catch (err) {
    document.getElementById("pr-result-area").innerHTML =
      `<div class="pr-result error">Submit failed: ${esc(err.message || String(err))}</div>`;
    btn.textContent = "Submit";
    btn.disabled = false;
  }
}

// ── Push branch ──
async function pushCurrentBranch() {
  const btn = document.getElementById("history-push-btn");
  btn.disabled = true;
  btn.textContent = "Pushing…";
  try {
    const res = await fetch("/api/git/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await res.json();
    if (result.pushed) {
      showToast(`✓ ${result.message}`);
    } else {
      showToast(result.message || "Push failed", 4000);
    }
  } catch (err) {
    showToast("Push failed: " + (err.message || err), 4000);
  } finally {
    btn.disabled = false;
    btn.textContent = "Push";
  }
}

// ── Migrate history to git ──
async function migrateHistoryToGit() {
  if (
    !confirm(
      "Migrate legacy .wikimem/history snapshots to git commits? This replays snapshots as commits.",
    )
  )
    return;
  const btn = document.getElementById("history-migrate-btn");
  btn.disabled = true;
  btn.textContent = "Migrating…";
  try {
    const res = await fetch("/api/git/migrate-history", {
      method: "POST",
    });
    const result = await res.json();
    showToast(result.message || "Migration complete");
    document.getElementById("history-migrate-banner").style.display =
      "none";
    loadGitHistory();
  } catch (err) {
    showToast("Migration failed: " + (err.message || err), 4000);
  } finally {
    btn.disabled = false;
    btn.textContent = "Migrate to Git";
  }
}

async function checkMigrationBanner() {
  try {
    const history = await api("/api/history");
    const banner = document.getElementById("history-migrate-banner");
    if (history && history.length > 0) {
      banner.style.display = "flex";
    } else {
      banner.style.display = "none";
    }
  } catch {
    document.getElementById("history-migrate-banner").style.display =
      "none";
  }
}

// ── Graph ──
async function initGraph() {
  if (state.graphInit) return;
  state.graphInit = true;

  const data = await api("/api/graph");
  const container = document.getElementById("graph-view");
  if (!data.nodes.length) {
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted)">No pages yet. Ingest content to build the graph.</div>';
    return;
  }

  // ── Community detection (greedy label propagation) ─────────────────
  function detectCommunities(nodes, links) {
    const adj = new Map();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const l of links) {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      adj.get(s)?.add(t);
      adj.get(t)?.add(s);
    }
    const community = new Map(nodes.map((n) => [n.id, n.id]));
    for (let iter = 0; iter < 10; iter++) {
      let changed = false;
      for (const n of nodes) {
        const neighbors = [...(adj.get(n.id) || [])];
        if (!neighbors.length) continue;
        const votes = {};
        for (const nb of neighbors) {
          const c = community.get(nb);
          votes[c] = (votes[c] || 0) + 1;
        }
        const best = Object.entries(votes).sort(
          (a, b) => b[1] - a[1],
        )[0]?.[0];
        if (best && best !== community.get(n.id)) {
          community.set(n.id, best);
          changed = true;
        }
      }
      if (!changed) break;
    }
    return community;
  }

  // ── Compute in-degree for hub nodes ─────────────────────────────────
  const inDegree = new Map(data.nodes.map((n) => [n.id, 0]));
  for (const l of data.links) {
    const t = typeof l.target === "object" ? l.target.id : l.target;
    inDegree.set(t, (inDegree.get(t) || 0) + 1);
  }
  const totalNodes = data.nodes.length;
  const isGodNode = (id) =>
    (inDegree.get(id) || 0) >= Math.max(5, Math.ceil(totalNodes * 0.06));
  // Node radius: matches timelapse formula (based on inbound link count)
  const nR = (id) => {
    const li = inDegree.get(id) || 0;
    return Math.max(4, Math.min(18, 4 + Math.sqrt(li) * 3));
  };

  const communityMap = detectCommunities(data.nodes, data.links);
  const communityIds = [...new Set(communityMap.values())];
  const GRAPH_COLORS = [
    "#4f9eff",
    "#4ec9b0",
    "#d7ba7d",
    "#c586c0",
    "#9cdcfe",
    "#dcdcaa",
    "#ce9178",
    "#608b4e",
    "#b5cea8",
  ];
  const communityColor = (id) =>
    GRAPH_COLORS[
      communityIds.indexOf(communityMap.get(id) || id) %
        GRAPH_COLORS.length
    ];

  const svg = d3.select("#graph-svg");
  // UXO-094: Clear any previous render before re-drawing
  svg.selectAll("*").remove();
  const tooltip = document.getElementById("tooltip");
  const width = container.clientWidth;
  const height = container.clientHeight;

  const g = svg.append("g");
  const zoom = d3
    .zoom()
    .scaleExtent([0.15, 5])
    .on("zoom", (e) => g.attr("transform", e.transform));
  svg.call(zoom);

  document.getElementById("graph-zoom-in").onclick = () =>
    svg.transition().call(zoom.scaleBy, 1.4);
  document.getElementById("graph-zoom-out").onclick = () =>
    svg.transition().call(zoom.scaleBy, 0.6);
  document.getElementById("graph-reset").onclick = () =>
    svg.transition().call(zoom.transform, d3.zoomIdentity);

  // ── Graph search ───────────────────────────────────────────────────
  const graphSearchEl = document.getElementById("graph-search");
  if (graphSearchEl) {
    graphSearchEl.oninput = () => {
      const q = graphSearchEl.value.toLowerCase();
      if (!q) {
        node.attr("opacity", 1);
        label.attr("opacity", 1);
        link.attr("stroke-opacity", 0.4);
        return;
      }
      node.attr("opacity", (d) =>
        d.title.toLowerCase().includes(q) ? 1 : 0.08,
      );
      label.attr("opacity", (d) =>
        d.title.toLowerCase().includes(q) ? 1 : 0.08,
      );
      link.attr("stroke-opacity", 0.08);
    };
  }

  const sim = d3
    .forceSimulation(data.nodes)
    .alphaDecay(0.05)
    .force(
      "link",
      d3
        .forceLink(data.links)
        .id((d) => d.id)
        .distance(60),
    )
    .force(
      "charge",
      d3.forceManyBody().strength(-220).distanceMax(500),
    )
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius((d) => (isGodNode(d.id) ? 26 : 18)),
    );

  const cs = (k) =>
    getComputedStyle(document.documentElement).getPropertyValue(k).trim();

  const link = g
    .append("g")
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("class", "graph-link")
    .attr("stroke", cs("--border-subtle"))
    .attr("stroke-width", 0.8)
    .attr("stroke-opacity", 0.4);

  // Hub node outer ring (gold, matching timelapse)
  g.append("g")
    .selectAll("circle.god-ring")
    .data(data.nodes.filter((d) => isGodNode(d.id)))
    .join("circle")
    .attr("class", "god-ring")
    .attr("r", (d) => nR(d.id) + 5)
    .attr("fill", "none")
    .attr("stroke", "#d4a843")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.5);

  const node = g
    .append("g")
    .selectAll("circle")
    .data(data.nodes)
    .join("circle")
    .attr("class", (d) => (isGodNode(d.id) ? "graph-node hub-node" : "graph-node"))
    .attr("r", (d) => nR(d.id))
    .attr("fill", (d) => communityColor(d.id))
    .attr("stroke", (d) => (isGodNode(d.id) ? "#d4a843" : cs("--bg")))
    .attr("stroke-width", (d) => (isGodNode(d.id) ? 2 : 1.5))
    .attr("cursor", "pointer")
    .call(
      d3
        .drag()
        .on("start", (e, d) => {
          if (!e.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (e, d) => {
          d.fx = e.x;
          d.fy = e.y;
        })
        .on("end", (e, d) => {
          if (!e.active) sim.alphaTarget(0);
          // UXO-096: keep node pinned — double-click to unpin
        }),
    );

  // UXO-096: double-click unpins node; triple-click navigates
  node.on("dblclick.unpin", (e, d) => {
    e.stopPropagation();
    d.fx = null;
    d.fy = null;
    sim.alphaTarget(0.1).restart();
  });

  const label = g
    .append("g")
    .selectAll("text")
    .data(data.nodes)
    .join("text")
    .text((d) =>
      d.title.length > 22 ? d.title.slice(0, 20) + "…" : d.title,
    )
    .attr("font-size", (d) => (isGodNode(d.id) ? 11 : 9.5))
    .attr("font-weight", (d) => (isGodNode(d.id) ? "600" : "normal"))
    .attr("font-family", "Inter,sans-serif")
    .attr("fill", (d) =>
      isGodNode(d.id) ? cs("--text-bright") : cs("--text-dim"),
    )
    .attr("text-anchor", "middle")
    .attr(
      "dy",
      (d) =>
        (isGodNode(d.id)
          ? Math.max(7, Math.min(22, Math.sqrt(d.wordCount / 50)))
          : Math.max(4, Math.min(16, Math.sqrt(d.wordCount / 70)))) + 13,
    );

  let selectedNode = null;
  const connectedTo = new Map();
  data.links.forEach((l) => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    if (!connectedTo.has(s)) connectedTo.set(s, new Set());
    if (!connectedTo.has(t)) connectedTo.set(t, new Set());
    connectedTo.get(s).add(t);
    connectedTo.get(t).add(s);
  });

  function highlightNode(d) {
    if (selectedNode === d) {
      selectedNode = null;
      node.attr("opacity", 1);
      link.attr("stroke-opacity", 0.4);
      label.attr("opacity", 1);
      return;
    }
    selectedNode = d;
    const neighbors = connectedTo.get(d.id) || new Set();
    node.attr("opacity", (n) =>
      n.id === d.id || neighbors.has(n.id) ? 1 : 0.12,
    );
    link.attr("stroke-opacity", (l) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      return s === d.id || t === d.id ? 0.8 : 0.05;
    });
    label.attr("opacity", (n) =>
      n.id === d.id || neighbors.has(n.id) ? 1 : 0.1,
    );
  }

  node
    .on("mouseover", (e, d) => {
      tooltip.style.display = "block";
      const deg = inDegree.get(d.id) || 0;
      const hubBadge = isGodNode(d.id)
        ? '<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:3px;background:var(--accent-dim);color:var(--accent);font-weight:500;margin-left:6px">Hub</span>'
        : "";
      tooltip.innerHTML = `<div class="tt-title">${esc(d.title)}${hubBadge}</div><div class="tt-meta">${d.wordCount} words · ${d.category} · ${isGodNode(d.id) ? "Hub · " : ""}${deg} inbound links</div>`;
    })
    .on("mousemove", (e) => {
      tooltip.style.left = e.offsetX + 12 + "px";
      tooltip.style.top = e.offsetY - 10 + "px";
    })
    .on("mouseout", () => (tooltip.style.display = "none"))
    .on("click", (e, d) => {
      e.stopPropagation();
      highlightNode(d);
    });

  svg.on("click", () => {
    if (selectedNode) {
      selectedNode = null;
      node.attr("opacity", 1);
      link.attr("stroke-opacity", 0.4);
      label.attr("opacity", 1);
    }
  });

  // Sync god-ring positions
  const godRing = g.selectAll(".god-ring");

  sim.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    godRing
      .attr("cx", (d) => {
        const n = data.nodes.find((n) => n.id === d.id);
        return n?.x || 0;
      })
      .attr("cy", (d) => {
        const n = data.nodes.find((n) => n.id === d.id);
        return n?.y || 0;
      });
    label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });

  // ── Graph settings panel toggle ──
  const panelToggle = document.getElementById("graph-panel-toggle");
  const settingsPanel = document.getElementById("graph-settings-panel");
  if (panelToggle && settingsPanel) {
    panelToggle.addEventListener("click", () => {
      const open = settingsPanel.classList.toggle("collapsed");
      panelToggle.setAttribute(
        "aria-expanded",
        String(!settingsPanel.classList.contains("collapsed")),
      );
      settingsPanel.setAttribute(
        "aria-hidden",
        String(settingsPanel.classList.contains("collapsed")),
      );
    });
  }

  // ── Graph labels radio handler ──
  function applyLabelMode(mode) {
    if (mode === "all") label.attr("display", "block");
    else if (mode === "none") label.attr("display", "none");
    else
      label.attr("display", (d) => (isGodNode(d.id) ? "block" : "none"));
  }
  document.querySelectorAll('input[name="graph-labels"]').forEach((r) => {
    r.addEventListener("change", (e) => applyLabelMode(e.target.value));
  });
  // UXO-097: default to hubs-only labels on load
  applyLabelMode("hubs");

  // ── Graph force strength slider ──
  const forceRange = document.getElementById("graph-force-range");
  const forceValue = document.getElementById("graph-force-value");
  if (forceRange) {
    forceRange.addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10);
      sim.force("charge", d3.forceManyBody().strength(v));
      sim.alpha(0.3).restart();
      if (forceValue)
        forceValue.textContent =
          v < 0 ? `\u2212${Math.abs(v)}` : String(v);
    });
  }

  // ── Graph link distance slider ──
  const linkDistRange = document.getElementById("graph-link-dist-range");
  const linkDistValue = document.getElementById("graph-link-dist-value");
  if (linkDistRange) {
    linkDistRange.addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10);
      sim.force("link").distance(v);
      sim.alpha(0.3).restart();
      if (linkDistValue) linkDistValue.textContent = String(v);
    });
  }

  // ── Graph node size radio ──
  document
    .querySelectorAll('input[name="graph-node-size"]')
    .forEach((r) => {
      r.addEventListener("change", (e) => {
        const mode = e.target.value;
        if (mode === "uniform") {
          node.attr("r", 8);
        } else if (mode === "wordcount") {
          node.attr("r", (d) =>
            Math.max(4, Math.min(22, Math.sqrt(d.wordCount / 50))),
          );
        } else {
          node.attr("r", (d) =>
            isGodNode(d.id)
              ? Math.max(7, Math.min(22, Math.sqrt(d.wordCount / 50)))
              : Math.max(4, Math.min(16, Math.sqrt(d.wordCount / 70))),
          );
        }
        sim.force(
          "collision",
          d3.forceCollide().radius((d) => {
            const r =
              parseFloat(node.filter((n) => n.id === d.id).attr("r")) ||
              8;
            return r + 4;
          }),
        );
        sim.alpha(0.3).restart();
      });
    });
}

// ── Graph Export (EXPORT-001) ──
async function exportGraph() {
  try {
    const data = await api("/api/graph");
    const menu =
      document.getElementById("graph-export-menu") ||
      (() => {
        const el = document.createElement("div");
        el.id = "graph-export-menu";
        el.style.cssText =
          "position:fixed;top:50px;right:16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:6px 0;z-index:9000;min-width:160px;box-shadow:0 4px 16px rgba(0,0,0,0.4)";
        document.body.appendChild(el);
        return el;
      })();
    if (menu.style.display !== "none" && menu.style.display !== "") {
      menu.style.display = "none";
      return;
    }
    menu.innerHTML = `
    <div onclick="doExportGraph('json')" class="export-menu-item">Export JSON</div>
    <div onclick="doExportGraph('csv')" class="export-menu-item">Export CSV (edges)</div>
    <div onclick="doExportGraph('graphml')" class="export-menu-item">Export GraphML</div>
  `;
    menu.style.display = "block";
    const hide = (e) => {
      if (!menu.contains(e.target)) {
        menu.style.display = "none";
        document.removeEventListener("click", hide);
      }
    };
    setTimeout(() => document.addEventListener("click", hide), 50);
  } catch (e) {
    alert("Export failed: " + e);
  }
}

async function doExportGraph(format) {
  document.getElementById("graph-export-menu").style.display = "none";
  const data = await api("/api/graph");
  let content, filename, mimeType;
  if (format === "json") {
    content = JSON.stringify(data, null, 2);
    filename = "wiki-graph.json";
    mimeType = "application/json";
  } else if (format === "csv") {
    const rows = [["source", "target"]];
    for (const l of data.links) rows.push([l.source, l.target]);
    content = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    filename = "wiki-graph-edges.csv";
    mimeType = "text/csv";
  } else if (format === "graphml") {
    const nodeXml = data.nodes
      .map(
        (n) =>
          `  <node id="${n.id}"><data key="title">${n.title}</data><data key="category">${n.category}</data><data key="words">${n.wordCount}</data></node>`,
      )
      .join("\n");
    const edgeXml = data.links
      .map(
        (l, i) =>
          `  <edge id="e${i}" source="${typeof l.source === "object" ? l.source.id : l.source}" target="${typeof l.target === "object" ? l.target.id : l.target}"/>`,
      )
      .join("\n");
    content = `<?xml version="1.0"?>\n<graphml xmlns="http://graphml.graphdrawing.org/graphml">\n<graph edgedefault="directed">\n${nodeXml}\n${edgeXml}\n</graph>\n</graphml>`;
    filename = "wiki-graph.graphml";
    mimeType = "application/xml";
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✓ Exported ${filename}`);
}

// ── Settings ──
async function loadSettings() {
  try {
    state.configData = await api("/api/config");
  } catch {
    state.configData = {};
  }
  renderSettingsSection(state.settingsSection);
}

function renderSettingsSection(section) {
  state.settingsSection = section;
  document.querySelectorAll(".settings-nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.section === section);
  });
  const el = document.getElementById("settings-content");
  if (section === "general") {
    el.innerHTML = `
    <div class="settings-section-title">General</div>
    <div class="settings-section-desc">Configure your wiki vault settings.</div>
    <div class="settings-group">
      <label class="settings-label">Wiki Name</label>
      <input class="settings-input" id="cfg-name" value="${esc(state.configData.name || "My Wiki")}" placeholder="My Knowledge Base" />
    </div>
    <div class="settings-group">
      <label class="settings-label">Description</label>
      <input class="settings-input" id="cfg-desc" value="${esc(state.configData.description || "")}" placeholder="A personal knowledge wiki" />
    </div>
    <div class="settings-group">
      <label class="settings-label">Wiki Path</label>
      <input class="settings-input" value="${esc(state.configData.wikiPath || state.configData.path || "")}" placeholder="~/.wikimem/default" readonly style="opacity:0.6;cursor:default" />
    </div>
    <button class="settings-btn settings-btn-primary" onclick="saveGeneralSettings()">Save</button>
    <span class="settings-status" id="general-status"></span>`;
  } else if (section === "provider") {
    const cd = state.configData;
    const mkModelBlock = (id, label, desc, companyKey, modelKey, keyKey) => {
      const company = cd[companyKey] || "anthropic";
      const model = cd[modelKey] || "";
      const apiKey = "";
      const isCC = company === "claude-code";
      const modelsByCompany = {
        anthropic: ["claude-sonnet-4-20250514","claude-haiku-4-5-20251001","claude-3-5-sonnet-20241022","claude-3-haiku-20240307"],
        openai: ["gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo"],
        google: ["gemini-2.0-flash","gemini-1.5-pro","gemini-1.5-flash"],
        ollama: ["llama3.1","qwen2.5","mistral","phi3"],
        "claude-code": [],
      };
      const modelOpts = (modelsByCompany[company] || []).map(m =>
        `<option value="${m}" ${model === m ? "selected" : ""}>${m}</option>`).join("");
      return `<div class="settings-group" style="padding:16px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;color:var(--text-bright);margin-bottom:2px">${label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">${desc}</div>
        <label class="settings-label">Company</label>
        <select class="settings-select" style="margin-bottom:10px" onchange="onModelCompanyChange('${companyKey}','${modelKey}','${keyKey}',this.value)">
          <option value="anthropic" ${company==="anthropic"?"selected":""}>Anthropic</option>
          <option value="openai" ${company==="openai"?"selected":""}>OpenAI</option>
          <option value="google" ${company==="google"?"selected":""}>Google</option>
          <option value="ollama" ${company==="ollama"?"selected":""}>Ollama (local)</option>
          <option value="claude-code" ${company==="claude-code"?"selected":""}>Claude Code</option>
        </select>
        <div id="${id}-model-row" style="display:${isCC?"none":"block"}">
          <label class="settings-label">Model</label>
          <select class="settings-select" id="${id}-model" style="margin-bottom:10px">${modelOpts}</select>
        </div>
        <div id="${id}-key-row" style="display:${isCC?"none":"block"}">
          <label class="settings-label">API Key</label>
          <div class="settings-row">
            <div class="settings-group" style="margin-bottom:0;flex:1">
              <input class="settings-input" id="${id}-apikey" type="password" value="" placeholder="${company==="anthropic"?"sk-ant-...":company==="openai"?"sk-...":company==="google"?"AIza...":"(not required for Ollama)"}" />
            </div>
            <button class="settings-btn" onclick="testProviderKey('${id}','${company}')">Test</button>
          </div>
          <span class="settings-status" id="${id}-status"></span>
        </div>
        <div id="${id}-cc-note" style="display:${isCC?"block":"none"};font-size:12px;color:var(--text-muted);margin-top:4px">Uses your Claude Code subscription — no API key needed.</div>
      </div>`;
    };
    el.innerHTML = `
    <div class="settings-section-title">Models</div>
    <div class="settings-section-desc">Choose which model to use for each task. Settings are stored in config.yaml.</div>
    ${mkModelBlock("ingest","Ingestion model","Used when compiling and summarising wiki pages","ingest_company","ingest_model","ingest_api_key")}
    ${mkModelBlock("query","Query model","Used when answering Ask questions","query_company","query_model","query_api_key")}
    ${mkModelBlock("observer","Observer model","Used for self-improvement and quality scanning","observer_company","observer_model","observer_api_key")}
    <button class="settings-btn settings-btn-primary" onclick="saveProviderSettings()">Save</button>
    <span class="settings-status" id="provider-status"></span>`;
  } else if (section === "sources") {
    el.innerHTML = `
    <div class="settings-section-title">Sources & Connectors</div>
    <div class="settings-section-desc">Connect local folders, git repos, or external data sources. Files are automatically ingested when added or changed.</div>
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button class="settings-btn settings-btn-primary" onclick="showAddConnectorModal('folder')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        Connect Folder
      </button>
      <button class="settings-btn" onclick="showAddConnectorModal('git-repo')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"/></svg>
        Connect Git Repo
      </button>
      <button class="settings-btn" onclick="showAddConnectorModal('github')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        GitHub URL
      </button>
    </div>
    <div id="connectors-list">
      <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:32px 0">Loading sources…</div>
    </div>

    <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--border-subtle)">
      <div class="settings-section-title" style="margin-bottom:4px">Platform Integrations</div>
      <div class="settings-section-desc">Connect platforms to auto-sync data into your wiki.</div>
      <div id="oauth-integrations">
        <div style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0">Loading integrations…</div>
      </div>
    </div>

    <div id="connector-modal" class="connector-modal" style="display:none"></div>
  `;
    loadConnectors();
    renderOAuthIntegrations();
  } else if (section === "appearance") {
    const prefs = loadAppearancePrefs();
    el.innerHTML = `
    <div class="settings-section-title">Appearance</div>
    <div class="settings-section-desc">Customize how wikimem looks and feels.</div>

    <div class="settings-group">
      <label class="settings-label">Theme</label>
      <div style="display:flex;gap:8px">
        <button class="settings-btn ${prefs.theme === "dark" ? "settings-btn-primary" : ""}" onclick="setAppearance('theme','dark')">🌙 Dark</button>
        <button class="settings-btn ${prefs.theme === "light" ? "settings-btn-primary" : ""}" onclick="setAppearance('theme','light')">☀️ Light</button>
      </div>
    </div>

    <div class="settings-group">
      <label class="settings-label">Font Size <span style="color:var(--text-muted);font-weight:400">${prefs.fontSize}px</span></label>
      <input type="range" min="12" max="18" step="1" value="${prefs.fontSize}" class="tl-slider" style="max-width:240px;height:4px"
        oninput="document.querySelector('[data-fs-val]').textContent=this.value+'px';setAppearance('fontSize',+this.value)">
      <span data-fs-val style="display:none">${prefs.fontSize}px</span>
    </div>

    <div class="settings-group">
      <label class="settings-label">Content Width</label>
      <select class="settings-select" onchange="setAppearance('contentWidth',this.value)">
        <option value="680" ${prefs.contentWidth === 680 ? "selected" : ""}>Narrow (680px)</option>
        <option value="860" ${prefs.contentWidth === 860 ? "selected" : ""}>Default (860px)</option>
        <option value="1100" ${prefs.contentWidth === 1100 ? "selected" : ""}>Wide (1100px)</option>
        <option value="100%" ${prefs.contentWidth === "100%" ? "selected" : ""}>Full width</option>
      </select>
    </div>

    <div class="settings-group">
      <label class="settings-label">Interface Density</label>
      <select class="settings-select" onchange="setAppearance('density',this.value)">
        <option value="compact" ${prefs.density === "compact" ? "selected" : ""}>Compact</option>
        <option value="default" ${(!prefs.density || prefs.density === "default" || prefs.density === "comfortable") ? "selected" : ""}>Default</option>
        <option value="comfortable" ${prefs.density === "comfortable" ? "selected" : ""}>Comfortable</option>
      </select>
    </div>

    <div class="settings-group">
      <label class="settings-label">Accent Color</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${[
          "#4f9eff",
          "#8b5cf6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#ec4899",
          "#06b6d4",
        ]
          .map(
            (c) =>
              `<button style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${c === prefs.accent ? "var(--text-bright)" : "transparent"};cursor:pointer;transition:border 0.1s" onclick="setAppearance('accent','${c}')"></button>`,
          )
          .join("")}
      </div>
    </div>

    <div class="settings-group">
      <label class="settings-label">Show line numbers in code blocks</label>
      <label class="auto-toggle" title="Show line numbers in code blocks">
        <input type="checkbox" ${prefs.codeLineNumbers ? "checked" : ""} onchange="setAppearance('codeLineNumbers',this.checked)">
        <span class="auto-toggle-track"></span>
      </label>
    </div>

    <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border-subtle)">
      <button class="settings-btn" onclick="resetAppearance()">Reset to defaults</button>
    </div>
  `;
  } else if (section === "automations") {
    el.innerHTML = `
    <div class="settings-section-title">Automations</div>
    <div class="settings-section-desc">The three core automations that keep your wiki alive and growing.</div>

    <!-- Card 1: Scheduled Ingestion (UXO-073) -->
    <div class="auto-card">
      <div class="auto-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🔄</span>
          <div>
            <div class="auto-card-title">Scheduled Ingestion</div>
            <div class="auto-card-desc">Auto-sync connected sources (Slack, GitHub, RSS, etc.) on a schedule</div>
          </div>
        </div>
        <label class="auto-toggle" title="Enable Scheduled Ingestion">
          <input type="checkbox" id="auto-connector-sync-enabled" onchange="saveSchedulerAutomation('connector-sync','enabled',this.checked)">
          <span class="auto-toggle-track"></span>
        </label>
      </div>
      <div class="auto-card-body">
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Schedule</label>
          <select class="settings-select" id="auto-connector-sync-schedule" onchange="saveSchedulerAutomation('connector-sync','schedulePreset',this.value)">
            <option value="hourly">Every hour</option>
            <option value="every-6h" selected>Every 6 hours</option>
            <option value="daily">Daily at 3am</option>
            <option value="weekly">Weekly (Monday 3am)</option>
          </select>
        </div>
        <div class="settings-group" style="margin-bottom:0">
          <label class="settings-label">Connected Sources</label>
          <div id="auto-connector-sync-sources" style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">
            <div style="color:var(--text-muted);font-size:12px;padding:4px 0">Loading sources…</div>
          </div>
          <div class="auto-hint">Manage connectors in the <strong>Connectors</strong> settings tab.</div>
        </div>
        <div class="auto-card-footer">
          <div>
            <span class="auto-last-run" id="auto-connector-sync-last">Last run: never</span>
            <span class="auto-status-badge" id="auto-connector-sync-status" style="display:none"></span>
          </div>
          <button class="settings-btn settings-btn-primary auto-run-btn" id="auto-connector-sync-run-btn" onclick="triggerAutomationRun('connector-sync')">Run Now</button>
        </div>
      </div>
    </div>

    <!-- Card 2: Pipeline Watcher (UXO-074) -->
    <div class="auto-card">
      <div class="auto-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">👁️</span>
          <div>
            <div class="auto-card-title">Pipeline Watcher</div>
            <div class="auto-card-desc">Watch your raw/ folder for new files and auto-process them through the ingest pipeline</div>
          </div>
        </div>
        <label class="auto-toggle" title="Enable Pipeline Watcher">
          <input type="checkbox" id="auto-pipeline-watcher-enabled" onchange="saveSchedulerAutomation('pipeline-watcher','enabled',this.checked)">
          <span class="auto-toggle-track"></span>
        </label>
      </div>
      <div class="auto-card-body">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-surface);border-radius:6px;border:1px solid var(--border);margin-bottom:14px">
          <span id="auto-watcher-dot" style="width:8px;height:8px;border-radius:50%;background:var(--text-muted);flex-shrink:0;transition:background 0.3s"></span>
          <span id="auto-watcher-status-text" style="font-size:12px;color:var(--text-secondary)">Loading…</span>
        </div>
        <div id="auto-watcher-notification" style="display:none;padding:10px 12px;background:var(--accent-dim, rgba(79,158,255,0.1));border:1px solid var(--accent);border-radius:6px;font-size:12px;color:var(--text);margin-bottom:14px">
          <span id="auto-watcher-notification-text"></span>
        </div>
        <div class="auto-hint">Drop any supported file (PDF, MD, TXT, CSV, HTML, MP3…) into the <code style="font-size:10px;background:var(--bg-surface);padding:1px 4px;border-radius:3px">raw/</code> folder — it will be detected and ingested automatically.</div>
        <div class="auto-card-footer">
          <div>
            <span class="auto-last-run" id="auto-pipeline-watcher-last">Last run: never</span>
            <span class="auto-status-badge" id="auto-pipeline-watcher-status" style="display:none"></span>
          </div>
          <button class="settings-btn auto-run-btn" id="auto-pipeline-watcher-run-btn" onclick="triggerAutomationRun('pipeline-watcher')">Scan Now</button>
        </div>
      </div>
    </div>

    <!-- Card 3: Observer (UXO-078) -->
    <div class="auto-card">
      <div class="auto-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🔭</span>
          <div>
            <div class="auto-card-title">Observer</div>
            <div class="auto-card-desc">Quality scan, orphan detection, gap analysis, and auto-improvement of wiki pages</div>
          </div>
        </div>
        <label class="auto-toggle" title="Enable Observer">
          <input type="checkbox" id="auto-observer-enabled" onchange="saveSchedulerAutomation('observer','enabled',this.checked)">
          <span class="auto-toggle-track"></span>
        </label>
      </div>
      <div class="auto-card-body">
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Cadence</label>
          <select class="settings-select" id="auto-observer-schedule" onchange="saveSchedulerAutomation('observer','schedulePreset',this.value)">
            <option value="daily" selected>Daily at 3am</option>
            <option value="weekly">Weekly (Monday 3am)</option>
            <option value="every-6h">Every 6 hours</option>
            <option value="hourly">Every hour</option>
          </select>
        </div>
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Model</label>
          <select class="settings-select" id="auto-observer-model" onchange="saveAutoSetting('observer','model',this.value)">
            <option value="" selected>Use default (from Provider settings)</option>
            <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4o-mini">GPT-4o mini</option>
            <option value="ollama/llama3.1">Ollama — Llama 3.1</option>
            <option value="ollama/qwen2.5">Ollama — Qwen 2.5</option>
          </select>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Choose which model scores and improves pages</div>
        </div>
        <div class="settings-group" style="margin-bottom:0">
          <label class="settings-label">Last run stats</label>
          <div id="auto-observer-last-report" style="font-size:12px;color:var(--text-muted);padding:4px 0">Loading…</div>
          <div id="observer-report-detail" style="margin-top:8px;display:none"></div>
          <div id="observer-cx-list" style="margin-top:10px;max-height:220px;overflow-y:auto"></div>
        </div>
        <div class="auto-card-footer">
          <div>
            <span class="auto-last-run" id="auto-observer-last">Last run: never</span>
            <span class="auto-status-badge" id="auto-observer-status" style="display:none"></span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="settings-btn auto-run-btn" onclick="runAutomation('observer')">Scan Only</button>
            <button class="settings-btn settings-btn-primary auto-run-btn" id="auto-observer-run-btn" onclick="triggerAutomationRun('observer')">Run Now</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 4: Webhook Receiver -->
    <div class="auto-card">
      <div class="auto-card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">🔗</span>
          <div>
            <div class="auto-card-title">Webhook Receiver</div>
            <div class="auto-card-desc">Accept documents and text via HTTP from external tools and agents</div>
          </div>
        </div>
        <label class="auto-toggle" title="Enable Webhook Receiver">
          <input type="checkbox" id="auto-webhook-enabled" onchange="toggleWebhookUrl(this.checked)">
          <span class="auto-toggle-track"></span>
        </label>
      </div>
      <div class="auto-card-body">
        <div id="auto-webhook-url-row" style="display:none;margin-bottom:14px">
          <label class="settings-label">Webhook URL</label>
          <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
            <code class="auto-webhook-url" id="auto-webhook-url">http://localhost:3456/api/webhook/ingest</code>
            <button class="settings-btn" onclick="copyWebhookUrl()" title="Copy webhook URL">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </button>
          </div>
        </div>
        <div class="settings-group" style="margin-bottom:0">
          <label class="settings-label">Auth Token <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
          <input class="settings-input" id="auto-webhook-token" type="password" placeholder="Bearer token for verification" onchange="saveAutoSetting('webhook','token',this.value)" />
          <div class="auto-hint">If set, requests must include <code style="font-size:10px;background:var(--bg-surface);padding:1px 4px;border-radius:3px">Authorization: Bearer &lt;token&gt;</code></div>
        </div>
        <div class="auto-card-footer">
          <span class="auto-last-run">
            Recent webhooks received: <span class="auto-webhook-count" id="auto-webhook-count">0</span>
          </span>
        </div>
      </div>
    </div>
    <!-- Pipeline Configuration -->
    <div class="pipe-cfg-section">
      <div class="pipe-cfg-title">Pipeline Configuration</div>
      <div class="pipe-cfg-desc">Toggle core steps and add custom LLM processing steps to the ingest pipeline. Drag to reorder.</div>
      <div class="pipe-step-list" id="pipe-cfg-steps">
        <div style="color:var(--text-muted);font-size:12px;padding:12px 0;text-align:center">Loading…</div>
      </div>
      <button class="pipe-cfg-add-btn" onclick="openAddPipeStepModal()">
        <span style="font-size:16px">+</span> Add Custom Step
      </button>
    </div>
    <div id="pipe-cfg-modal" class="pipe-modal" style="display:none"></div>
    <span class="settings-status" id="automations-status"></span>
  `;
    loadAutomationsFromScheduler();
    loadAutoSettings();
    loadPipelineConfig();
    initAutomationSSE();
  } else if (section === "hotkeys") {
    const shortcuts = [
      ["⌘K", "Search pages", "Navigate"],
      ["⌘P", "Command palette", "Navigate"],
      ["⌘G", "Toggle graph view", "Navigate"],
      ["⌘,", "Open settings", "Navigate"],
      ["⌘E", "Toggle edit mode", "Edit"],
      ["⌘S", "Save current edit", "Edit"],
      ["⌘N", "New note", "Edit"],
      ["⌘W", "Close current tab", "Tabs"],
      ["⌘Tab", "Next tab", "Tabs"],
      ["Esc", "Close overlay/cancel edit", "General"],
    ];
    const groups = {};
    shortcuts.forEach(([k, d, g]) => {
      if (!groups[g]) groups[g] = [];
      groups[g].push([k, d]);
    });
    let hotkeysHtml = `<div class="settings-section-title">Keyboard Shortcuts</div>
    <div class="settings-section-desc">All keyboard shortcuts. More can be configured in future versions.</div>`;
    for (const [group, items] of Object.entries(groups)) {
      hotkeysHtml += `<div style="margin-top:16px"><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-dim);margin-bottom:6px">${group}</div>`;
      hotkeysHtml += items
        .map(
          ([
            k,
            d,
          ]) => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-subtle)">
      <span style="color:var(--text);font-size:13px">${d}</span>
      <kbd style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim);background:var(--bg);padding:2px 8px;border-radius:4px;border:1px solid var(--border-subtle)">${k}</kbd>
    </div>`,
        )
        .join("");
      hotkeysHtml += `</div>`;
    }
    el.innerHTML = hotkeysHtml;
  } else if (section === "about") {
    el.innerHTML = `
    <div class="settings-section-title">About</div>
    <div class="settings-section-desc">wikimem — self-improving knowledge bases with LLMs</div>
    <div style="color:var(--text-dim);font-size:13px;line-height:1.8">
      <p><strong style="color:var(--text)">Version:</strong> 0.8.0</p>
      <p><strong style="color:var(--text)">Author:</strong> Naman Parikh</p>
      <p><strong style="color:var(--text)">GitHub:</strong> <a href="https://github.com/naman10parikh/wikimem" style="color:var(--accent)" target="_blank">naman10parikh/wikimem</a></p>
      <p><strong style="color:var(--text)">npm:</strong> <a href="https://www.npmjs.com/package/wikimem" style="color:var(--accent)" target="_blank">wikimem</a></p>
      <p><strong style="color:var(--text)">License:</strong> MIT</p>
    </div>`;
  }
}

async function saveGeneralSettings() {
  const s = document.getElementById("general-status");
  try {
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("cfg-name").value,
        description: document.getElementById("cfg-desc").value,
      }),
    });
    s.className = "settings-status ok";
    s.textContent = "✓ Saved";
    setTimeout(() => (s.textContent = ""), 2000);
  } catch {
    s.className = "settings-status err";
    s.textContent = "✗ Failed";
  }
}

// ── Automations Settings ──────────────────────────────────────────────
let autoSources = [];
let _cxPairs = [];

function stripFrontmatter(md) {
  if (typeof md !== "string") return "";
  const t = md.trim();
  if (t.startsWith("---")) {
    const end = t.indexOf("\n---", 3);
    if (end !== -1) return t.slice(end + 4).trim();
  }
  return t;
}

function closeCxModal() {
  const o = document.getElementById("cx-modal-overlay");
  if (o) o.style.display = "none";
}

async function openContradictionCompare(idx) {
  const c = _cxPairs[idx];
  if (!c) return;
  const titleA = c.titleA || "";
  const titleB = c.titleB || "";
  document.getElementById("cx-modal-title").textContent =
    "Potential contradiction";
  document.getElementById("cx-modal-reason").textContent = c.reason || "";
  document.getElementById("cx-head-a").textContent = titleA;
  document.getElementById("cx-head-b").textContent = titleB;
  document.getElementById("cx-body-a").textContent = "Loading…";
  document.getElementById("cx-body-b").textContent = "Loading…";
  const overlay = document.getElementById("cx-modal-overlay");
  if (overlay) overlay.style.display = "flex";
  try {
    const [ra, rb] = await Promise.all([
      fetch("/api/pages/" + encodeURIComponent(titleA) + "/raw").then(
        (r) => r.json(),
      ),
      fetch("/api/pages/" + encodeURIComponent(titleB) + "/raw").then(
        (r) => r.json(),
      ),
    ]);
    document.getElementById("cx-body-a").textContent = stripFrontmatter(
      ra.raw || "",
    );
    document.getElementById("cx-body-b").textContent = stripFrontmatter(
      rb.raw || "",
    );
  } catch (e) {
    document.getElementById("cx-body-a").textContent =
      "Could not load page A.";
    document.getElementById("cx-body-b").textContent =
      "Could not load page B.";
  }
}

function renderContradictionRows(contradictions) {
  const container = document.getElementById("observer-cx-list");
  if (!container) return;
  if (!contradictions || contradictions.length === 0) {
    container.innerHTML =
      '<div style="font-size:11px;color:var(--text-muted)">No potential contradictions in the latest scan.</div>';
    return;
  }
  _cxPairs = contradictions;
  container.innerHTML = contradictions
    .slice(0, 14)
    .map(
      (c, i) => `
  <div class="cx-row">
    <div class="cx-row-reason">${esc(c.reason || "")}</div>
    <button type="button" class="settings-btn" style="font-size:11px;padding:3px 10px;flex-shrink:0" onclick="openContradictionCompare(${i})">Compare</button>
  </div>`,
    )
    .join("");
}

async function refreshObserverReportPanel(partial) {
  const summaryEl = document.getElementById("auto-observer-last-report");
  if (!summaryEl) return;
  try {
    let report = partial;
    if (!report || !report.date) {
      const list = await api("/api/observer/reports");
      if (!list.reports || list.reports.length === 0) {
        summaryEl.innerHTML =
          "No reports yet — run <strong>Scan Only</strong> or <strong>Scan &amp; Improve</strong>.";
        renderContradictionRows([]);
        return;
      }
      const date = list.reports[0];
      report = await api(
        "/api/observer/reports/" + encodeURIComponent(date),
      );
    }
    const avg = report.averageScore != null ? report.averageScore : "—";
    const maxS = report.maxScore != null ? report.maxScore : "14";
    const orphans =
      report.orphanCount != null
        ? report.orphanCount
        : report.orphans
          ? report.orphans.length
          : 0;
    const gaps =
      report.gapCount != null
        ? report.gapCount
        : report.gaps
          ? report.gaps.length
          : 0;
    const cx =
      report.contradictionCount != null
        ? report.contradictionCount
        : report.contradictions
          ? report.contradictions.length
          : 0;
    summaryEl.innerHTML = `Latest <span style="color:var(--text-secondary)">${esc(report.date || "")}</span> — avg score <strong>${avg}/${maxS}</strong>, ${orphans} orphans, ${gaps} gaps, <strong style="color:var(--amber)">${cx}</strong> contradiction flags`;
    renderContradictionRows(report.contradictions || []);
  } catch (e) {
    summaryEl.textContent = "Could not load observer reports.";
    renderContradictionRows([]);
  }
}

// ── Scheduler Automation API ─────────────────────────────────────────────

let automationSSESource = null;

async function loadAutomationsFromScheduler() {
  try {
    const data = await api('/api/automations');
    const automations = data.automations || [];
    for (const state of automations) {
      updateAutomationCard(state);
    }
    // Also load connectors for the sources list
    try {
      const connData = await api('/api/connectors');
      const connectors = connData.connectors || connData || [];
      renderConnectorSyncSources(connectors);
    } catch (e) {
      // connectors endpoint may not exist yet
    }
  } catch (e) {
    console.warn('[automations] Could not load from scheduler:', e.message);
  }
}

function updateAutomationCard(state) {
  const id = state.id;
  const el = (sel) => document.getElementById(sel);

  if (id === 'connector-sync') {
    if (el('auto-connector-sync-enabled')) el('auto-connector-sync-enabled').checked = !!state.enabled;
    if (el('auto-connector-sync-schedule')) el('auto-connector-sync-schedule').value = state.schedulePreset || 'daily';
    if (el('auto-connector-sync-last')) {
      el('auto-connector-sync-last').textContent = state.lastRunAt
        ? 'Last run: ' + new Date(state.lastRunAt).toLocaleString()
        : 'Never run';
    }
    const badge = el('auto-connector-sync-status');
    if (badge) {
      badge.textContent = state.status || 'idle';
      badge.className = 'auto-status-badge auto-status-' + (state.status || 'idle');
    }
  }

  if (id === 'pipeline-watcher') {
    if (el('auto-pipeline-watcher-enabled')) el('auto-pipeline-watcher-enabled').checked = !!state.enabled;
    if (el('auto-pipeline-watcher-last')) {
      el('auto-pipeline-watcher-last').textContent = state.lastRunAt
        ? 'Last scan: ' + new Date(state.lastRunAt).toLocaleString()
        : 'Never run';
    }
    const badge = el('auto-pipeline-watcher-status');
    if (badge) {
      badge.textContent = state.status || 'idle';
      badge.className = 'auto-status-badge auto-status-' + (state.status || 'idle');
    }
    updateWatcherStatus(state);
  }

  if (id === 'observer') {
    if (el('auto-observer-enabled')) el('auto-observer-enabled').checked = !!state.enabled;
    if (el('auto-observer-schedule')) el('auto-observer-schedule').value = state.schedulePreset || 'weekly';
    if (el('auto-observer-last')) {
      el('auto-observer-last').textContent = state.lastRunAt
        ? 'Last run: ' + new Date(state.lastRunAt).toLocaleString() + (state.lastRunDuration ? ' (' + (state.lastRunDuration / 1000).toFixed(1) + 's)' : '')
        : 'Never run';
    }
    const badge = el('auto-observer-status');
    if (badge) {
      badge.textContent = state.status || 'idle';
      badge.className = 'auto-status-badge auto-status-' + (state.status || 'idle');
    }
  }
}

function renderConnectorSyncSources(connectors) {
  const el = document.getElementById('auto-connector-sync-sources');
  if (!el) return;
  if (!connectors || connectors.length === 0) {
    el.innerHTML = '<div class="auto-source-empty">No connectors configured. Add connectors in the Connectors tab.</div>';
    return;
  }
  el.innerHTML = connectors.map(c => {
    const name = c.name || c.id || c.type || 'Unknown';
    const status = c.connected ? 'connected' : (c.status || 'disconnected');
    const dot = c.connected ? '#22c55e' : '#6b7280';
    return '<div class="auto-connector-source-row">'
      + '<span class="auto-source-dot" style="background:' + dot + '"></span>'
      + '<span class="auto-source-name">' + name + '</span>'
      + '<span class="auto-source-status">' + status + '</span>'
      + '</div>';
  }).join('');
}

function updateWatcherStatus(state) {
  const dot = document.getElementById('auto-watcher-dot');
  const text = document.getElementById('auto-watcher-status-text');
  if (!dot || !text) return;
  const statusMap = {
    idle: { color: '#22c55e', label: 'Watching for new files' },
    running: { color: '#f59e0b', label: 'Scanning…' },
    error: { color: '#ef4444', label: 'Error — check logs' },
    disabled: { color: '#6b7280', label: 'Watcher disabled' },
  };
  const s = (state.enabled === false) ? 'disabled' : (state.status || 'idle');
  const info = statusMap[s] || statusMap.idle;
  dot.style.background = info.color;
  text.textContent = info.label;
}

function showWatcherNotification(filename) {
  const notif = document.getElementById('auto-watcher-notification');
  const text = document.getElementById('auto-watcher-notification-text');
  if (!notif || !text) return;
  text.textContent = 'New source detected: ' + filename + ' — Processing…';
  notif.style.display = 'flex';
  setTimeout(() => { notif.style.display = 'none'; }, 6000);
}

async function saveSchedulerAutomation(id, field, value) {
  try {
    const body = {};
    body[field] = value;
    const updated = await api('/api/automations/' + id, { method: 'PUT', body: JSON.stringify(body) });
    updateAutomationCard(updated);
    showToast('Automation updated', 'success');
  } catch (e) {
    console.warn('[automations] Save failed:', e.message);
    showToast('Could not save automation setting', 'error');
  }
}

async function triggerAutomationRun(id) {
  const btnId = 'auto-' + id + '-run-btn';
  const btn = document.getElementById(btnId);
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  try {
    const result = await api('/api/automations/' + id + '/run', { method: 'POST' });
    showToast('Automation started', 'success');
    // If observer returned improvements, show banner
    if (id === 'observer' && result && result.improved > 0) {
      showObserverBanner(result.improved, result);
    }
    // Reload card state after short delay
    setTimeout(async () => {
      try {
        const state = await api('/api/automations/' + id);
        updateAutomationCard(state);
      } catch (e) { /* ignore */ }
    }, 2000);
  } catch (e) {
    console.warn('[automations] Run failed:', e.message);
    showToast('Run failed: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Run Now'; }
  }
}

function initAutomationSSE() {
  if (automationSSESource) {
    automationSSESource.close();
    automationSSESource = null;
  }
  try {
    automationSSESource = new EventSource('/api/automations/events');
    automationSSESource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === 'automation-status') {
          // Build a minimal state object from the event
          const partial = {
            id: event.automationId,
            status: event.status,
          };
          updateAutomationCard(partial);
          // Pipeline watcher: if running → show notification if filename provided
          if (event.automationId === 'pipeline-watcher' && event.detail && event.detail.filename) {
            showWatcherNotification(event.detail.filename);
          }
          // Observer: if completed with improvements, show banner
          if (event.automationId === 'observer' && event.status === 'idle' && event.detail && event.detail.improved > 0) {
            showObserverBanner(event.detail.improved, event.detail);
          }
        }
      } catch (parseErr) { /* ignore malformed events */ }
    };
    automationSSESource.onerror = () => {
      // SSE will auto-reconnect; no user-visible error needed
    };
  } catch (e) {
    console.warn('[automations] SSE not available:', e.message);
  }
}

// UXO-079: Observer improvement banner
function showObserverBanner(count, details) {
  let banner = document.getElementById('observer-improvement-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'observer-improvement-banner';
    banner.className = 'observer-banner';
    banner.innerHTML =
      '<span class="observer-banner-text"></span>'
      + '<div class="observer-banner-actions">'
      + '<button class="btn-sm btn-green" onclick="acceptObserverChanges()">Accept</button>'
      + '<button class="btn-sm btn-red" onclick="rejectObserverChanges()">Reject</button>'
      + '<button class="btn-sm btn-ghost" onclick="viewObserverChanges()">View Changes</button>'
      + '</div>'
      + '<button class="observer-banner-close" onclick="this.closest(&quot;.observer-banner&quot;).style.display=&quot;none&quot;" title="Dismiss">\u2715</button>';
    // Insert at top of automations settings section
    const section = document.querySelector('.settings-section-content') || document.querySelector('.auto-cards-grid') || document.body;
    section.insertBefore(banner, section.firstChild);
  }
  const text = banner.querySelector('.observer-banner-text');
  if (text) text.textContent = 'Observer improved ' + count + ' page' + (count === 1 ? '' : 's') + '. Review and accept the changes.';
  banner._details = details;
  banner.style.display = 'flex';
}

async function acceptObserverChanges() {
  const banner = document.getElementById('observer-improvement-banner');
  if (!banner) return;
  try {
    await api('/api/observer/accept', { method: 'POST' });
    showToast('Observer changes accepted', 'success');
  } catch (e) {
    showToast('Accepted (changes already applied)', 'info');
  }
  banner.style.display = 'none';
}

async function rejectObserverChanges() {
  const banner = document.getElementById('observer-improvement-banner');
  if (!banner) return;
  try {
    await api('/api/observer/reject', { method: 'POST' });
    showToast('Observer changes rejected', 'info');
  } catch (e) {
    showToast('Rejected', 'info');
  }
  banner.style.display = 'none';
}

function viewObserverChanges() {
  // Navigate to wiki tab and show observer diff view
  const wikiTab = document.querySelector('[data-tab="wiki"]') || document.querySelector('[onclick*="wiki"]');
  if (wikiTab) wikiTab.click();
  showToast('Showing observer changes in wiki view', 'info');
}

async function loadAutoSettings() {
  try {
    const data = await api("/api/automations/settings").catch(() => ({}));
    const sourcing = data.sourcing || {};
    const observer = data.observer || {};
    const webhook = data.webhook || {};

    const el = (id) => document.getElementById(id);

    if (el("auto-sourcing-enabled"))
      el("auto-sourcing-enabled").checked = !!sourcing.enabled;
    if (el("auto-observer-enabled"))
      el("auto-observer-enabled").checked = !!observer.enabled;
    if (el("auto-webhook-enabled"))
      el("auto-webhook-enabled").checked = !!webhook.enabled;

    if (el("auto-sourcing-schedule") && sourcing.schedule)
      el("auto-sourcing-schedule").value = sourcing.schedule;
    if (el("auto-observer-schedule") && observer.schedule)
      el("auto-observer-schedule").value = observer.schedule;

    if (el("auto-sourcing-topics") && sourcing.topics)
      el("auto-sourcing-topics").value = sourcing.topics;
    if (el("auto-webhook-token") && webhook.token)
      el("auto-webhook-token").value = webhook.token;

    if (el("auto-sourcing-last") && sourcing.lastRun)
      el("auto-sourcing-last").textContent =
        "Last run: " + formatTimeAgo(sourcing.lastRun);
    if (el("auto-observer-last") && observer.lastRun)
      el("auto-observer-last").textContent =
        "Last run: " + formatTimeAgo(observer.lastRun);

    if (el("auto-observer-last-report") && observer.lastReportPath) {
      el("auto-observer-last-report").innerHTML =
        `<span style="color:var(--text-muted)">Report file: </span><span style="font-family:var(--font-mono);font-size:11px">${esc(observer.lastReportPath)}</span>`;
    }

    if (el("auto-webhook-count") && webhook.count != null)
      el("auto-webhook-count").textContent = webhook.count;

    // Show/hide webhook URL
    toggleWebhookUrl(!!webhook.enabled);

    // Render sources list
    autoSources = sourcing.sources || [];
    renderAutoSources();

    await refreshObserverReportPanel(null);
  } catch (e) {
    /* settings endpoint may not exist yet */
  }
}

function renderAutoSources() {
  const list = document.getElementById("auto-sources-list");
  if (!list) return;
  if (!autoSources.length) {
    list.innerHTML =
      '<div style="color:var(--text-muted);font-size:12px;padding:4px 0">No sources configured</div>';
    return;
  }
  list.innerHTML = autoSources
    .map(
      (src, i) => `
  <div class="auto-source-row">
    <span>${esc(src)}</span>
    <button onclick="removeAutoSource(${i})" title="Remove source">×</button>
  </div>`,
    )
    .join("");
}

async function addAutoSource() {
  const url = await showInputModal("Add Source URL", "https://example.com/feed", "", "Add");
  if (!url || !url.trim()) return;
  autoSources.push(url.trim());
  renderAutoSources();
  saveAutoSetting("sourcing", "sources", autoSources);
}

function removeAutoSource(idx) {
  autoSources.splice(idx, 1);
  renderAutoSources();
  saveAutoSetting("sourcing", "sources", autoSources);
}

function toggleWebhookUrl(enabled) {
  const row = document.getElementById("auto-webhook-url-row");
  if (row) row.style.display = enabled ? "block" : "none";
  saveAutoSetting("webhook", "enabled", enabled);
}

function copyWebhookUrl() {
  const url =
    document.getElementById("auto-webhook-url")?.textContent ||
    "http://localhost:3456/api/webhook/ingest";
  navigator.clipboard
    .writeText(url)
    .then(() => showToast("✓ Webhook URL copied"));
}

// ── Appearance Preferences ──
const APPEARANCE_DEFAULTS = {
  theme: "dark",
  fontSize: 14,
  contentWidth: 860,
  density: "comfortable",
  accent: "#4f9eff",
  codeLineNumbers: false,
};
function loadAppearancePrefs() {
  try {
    return {
      ...APPEARANCE_DEFAULTS,
      ...JSON.parse(localStorage.getItem("wikimem-appearance") || "{}"),
    };
  } catch {
    return { ...APPEARANCE_DEFAULTS };
  }
}
function saveAppearancePrefs(prefs) {
  localStorage.setItem("wikimem-appearance", JSON.stringify(prefs));
}
function setAppearance(key, value) {
  const prefs = loadAppearancePrefs();
  prefs[key] = value;
  saveAppearancePrefs(prefs);
  applyAppearance(prefs);
  if (state.settingsSection === "appearance")
    renderSettingsSection("appearance");
}
function resetAppearance() {
  localStorage.removeItem("wikimem-appearance");
  applyAppearance(APPEARANCE_DEFAULTS);
  renderSettingsSection("appearance");
  showToast("✓ Appearance reset");
}
function applyAppearance(prefs) {
  const r = document.documentElement;
  if (prefs.theme === "light") {
    r.style.setProperty("--bg-deep", "#f0f0f0");
    r.style.setProperty("--bg-inset", "#e8e8e8");
    r.style.setProperty("--bg", "#ffffff");
    r.style.setProperty("--bg-surface", "#f5f5f5");
    r.style.setProperty("--bg-card", "#eeeeee");
    r.style.setProperty("--bg-hover", "#e0e0e0");
    r.style.setProperty("--bg-active", "#d5d5d5");
    r.style.setProperty("--text", "#1e1e1e");
    r.style.setProperty("--text-secondary", "#555");
    r.style.setProperty("--text-bright", "#000");
    r.style.setProperty("--text-dim", "#888");
    r.style.setProperty("--text-muted", "#999");
    r.style.setProperty("--border", "#d0d0d0");
    r.style.setProperty("--border-subtle", "#e0e0e0");
  } else {
    r.style.removeProperty("--bg-deep");
    r.style.removeProperty("--bg-inset");
    r.style.removeProperty("--bg");
    r.style.removeProperty("--bg-surface");
    r.style.removeProperty("--bg-card");
    r.style.removeProperty("--bg-hover");
    r.style.removeProperty("--bg-active");
    r.style.removeProperty("--text");
    r.style.removeProperty("--text-secondary");
    r.style.removeProperty("--text-bright");
    r.style.removeProperty("--text-dim");
    r.style.removeProperty("--text-muted");
    r.style.removeProperty("--border");
    r.style.removeProperty("--border-subtle");
  }
  r.style.setProperty("--font-size-base", prefs.fontSize + "px");
  r.style.setProperty("--accent", prefs.accent);
  r.style.setProperty("--accent-dim", prefs.accent + "22");
  document.querySelectorAll(".page-layout").forEach((el) => {
    el.style.maxWidth =
      typeof prefs.contentWidth === "number"
        ? prefs.contentWidth + "px"
        : prefs.contentWidth;
  });
  const spacingUnit =
    prefs.density === "compact"
      ? "4px"
      : prefs.density === "comfortable"
        ? "12px"
        : "8px";
  r.style.setProperty("--spacing-unit", spacingUnit);
  r.style.setProperty("--density-pad", spacingUnit);
}
applyAppearance(loadAppearancePrefs());

async function saveAutoSetting(automation, key, value) {
  try {
    await fetch("/api/automations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation, key, value }),
    });
    const s = document.getElementById("automations-status");
    if (s) {
      s.className = "settings-status ok";
      s.textContent = "✓ Saved";
      setTimeout(() => (s.textContent = ""), 2000);
    }
  } catch (e) {
    /* backend not wired yet */
  }
}

async function runAutomation(type) {
  const endpointMap = {
    sourcing: "/api/automations/sourcing/run",
    observer: "/api/observer/run",
  };
  const endpoint = endpointMap[type];
  if (!endpoint) return;
  const lastEl = document.getElementById(`auto-${type}-last`);
  if (lastEl) {
    lastEl.textContent = "⟳ Running…";
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const result = await res.json();
    if (lastEl) {
      lastEl.textContent = "Last run: just now";
    }
    const s = document.getElementById("automations-status");
    if (s) {
      s.className = "settings-status ok";
      s.textContent = "✓ Complete";
      setTimeout(() => (s.textContent = ""), 3000);
    }
    if (type === "observer") {
      const cx =
        result.contradictionCount != null ? result.contradictionCount : 0;
      showToast(
        `Observer: ${result.pagesReviewed} pages, avg ${result.averageScore}/${result.maxScore}, ${result.orphanCount} orphans, ${cx} contradiction flags`,
      );
      refreshObserverReportPanel(result);
      renderObserverDetailPanel(result);
    }
  } catch (e) {
    if (lastEl) {
      lastEl.textContent = "✗ Failed to start";
    }
  }
}

async function runObserverWithImprove() {
  const lastEl = document.getElementById("auto-observer-last");
  if (lastEl) {
    lastEl.textContent = "⟳ Scanning & improving…";
  }
  try {
    const modelSel = document.getElementById("auto-observer-model");
    const model = modelSel ? modelSel.value : "";
    const body = { autoImprove: true, maxImprovements: 3 };
    if (model) body.model = model;
    const res = await fetch("/api/observer/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (lastEl) {
      lastEl.textContent = "Last run: just now";
    }
    const improved = result.improvementCount || 0;
    showToast(
      `Observer: ${result.pagesReviewed} pages scanned, ${improved} pages improved, avg score ${result.averageScore}/${result.maxScore}`,
    );
    refreshObserverReportPanel(result);
    renderObserverDetailPanel(result);
    if (improved > 0) {
      loadTree();
      loadHome();
    }
  } catch (e) {
    if (lastEl) {
      lastEl.textContent = "✗ Failed";
    }
    showToast("Observer run failed: " + (e.message || e));
  }
}

function renderObserverDetailPanel(result) {
  const panel = document.getElementById("observer-report-detail");
  if (!panel) return;
  let html = "";
  const pct =
    result.maxScore > 0
      ? Math.round((result.averageScore / result.maxScore) * 100)
      : 0;
  const barColor =
    pct >= 80
      ? "var(--green)"
      : pct >= 50
        ? "var(--amber)"
        : "var(--red)";
  html +=
    '<div style="margin-bottom:12px">' +
    '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
    '<span style="color:var(--text-secondary)">Average Quality</span>' +
    '<span style="color:' +
    barColor +
    ';font-weight:600">' +
    result.averageScore +
    "/" +
    result.maxScore +
    " (" +
    pct +
    "%)</span></div>" +
    '<div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">' +
    '<div style="height:100%;width:' +
    pct +
    "%;background:" +
    barColor +
    ';border-radius:3px;transition:width 0.5s"></div></div></div>';
  html +=
    '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
    '<span style="font-size:11px;padding:3px 7px;background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border)">📊 ' +
    result.totalPages +
    " pages</span>" +
    '<span style="font-size:11px;padding:3px 7px;background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border)">🔗 ' +
    result.orphanCount +
    " orphans</span>" +
    '<span style="font-size:11px;padding:3px 7px;background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border)">🕳️ ' +
    result.gapCount +
    " gaps</span>" +
    '<span style="font-size:11px;padding:3px 7px;background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border)">⚡ ' +
    result.contradictionCount +
    " contradictions</span></div>";
  if (result.improvements && result.improvements.length > 0) {
    html +=
      '<div style="margin-bottom:12px"><div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:500">Improvements</div>';
    for (const imp of result.improvements) {
      const icon = imp.improved ? "✅" : "❌";
      const sc =
        imp.newScore != null
          ? imp.originalScore + " → " + imp.newScore
          : "was " + imp.originalScore;
      const bg = imp.improved ? "var(--green-dim)" : "var(--red-dim)";
      html +=
        '<div style="font-size:11px;padding:5px 8px;margin-bottom:3px;background:' +
        bg +
        ';border-radius:var(--radius-sm)">' +
        icon +
        " <strong>" +
        esc(imp.title) +
        '</strong> <span style="color:var(--text-muted)">(' +
        sc +
        "/" +
        result.maxScore +
        ")</span>" +
        '<div style="color:var(--text-dim);margin-top:2px;font-size:10px">' +
        esc(imp.action) +
        "</div></div>";
    }
    html += "</div>";
  }
  if (result.weakestPages && result.weakestPages.length > 0) {
    html +=
      '<div style="margin-bottom:8px"><div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:500">Weakest Pages</div>';
    for (const p of result.weakestPages) {
      html +=
        '<div style="font-size:11px;padding:3px 8px;margin-bottom:2px;display:flex;justify-content:space-between;background:var(--bg-surface);border-radius:var(--radius-sm);border:1px solid var(--border)">' +
        "<span>" +
        esc(p.title) +
        "</span>" +
        '<span style="color:var(--amber);font-weight:500">' +
        p.score +
        "/" +
        p.maxScore +
        "</span></div>";
    }
    html += "</div>";
  }
  if (result.topIssues && result.topIssues.length > 0) {
    html +=
      '<div><div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:500">Top Issues</div>';
    for (const iss of result.topIssues.slice(0, 5)) {
      html +=
        '<div style="font-size:11px;padding:2px 0;color:var(--text-dim)">' +
        '<span style="color:var(--amber);font-weight:500">' +
        iss.count +
        "×</span> " +
        esc(iss.issue) +
        "</div>";
    }
    html += "</div>";
  }
  panel.innerHTML = html;
  panel.style.display = "block";
}

// ── Pipeline Configuration ───────────────────────────────────────────
const CORE_STEPS = [
  { id: "detect", icon: "🔍", label: "Detect file type" },
  { id: "extract", icon: "📝", label: "Extract content" },
  { id: "dedup", icon: "🔄", label: "Check for duplicates" },
  { id: "copy-raw", icon: "💾", label: "Save original file" },
  { id: "llm-compile", icon: "🤖", label: "AI compile to wiki page" },
  { id: "write-pages", icon: "📄", label: "Write wiki pages" },
  { id: "embed", icon: "🧮", label: "Generate embeddings" },
  { id: "update-index", icon: "📇", label: "Update search index" },
  { id: "git-commit", icon: "📦", label: "Commit to git" },
];
let pipeCustomSteps = [];
let pipeDisabledSteps = [];
let pipeDragSrcIdx = null;

async function loadPipelineConfig() {
  try {
    const data = await api("/api/pipeline/config");
    pipeCustomSteps = data.custom_steps || [];
    pipeDisabledSteps = data.disabled_steps || [];
    renderPipelineConfig();
  } catch {
    renderPipelineConfig();
  }
}

function renderPipelineConfig() {
  const container = document.getElementById("pipe-cfg-steps");
  if (!container) return;
  const allSteps = buildPipeStepsList();
  if (allSteps.length === 0) {
    container.innerHTML =
      '<div style="color:var(--text-muted);font-size:12px;padding:12px 0;text-align:center">No steps configured</div>';
    return;
  }
  container.innerHTML = allSteps
    .map((s, i) => {
      const isDisabled = pipeDisabledSteps.includes(s.id);
      const isCustom = s.type === "custom";
      const checkedAttr = isDisabled ? "" : "checked";
      const disabledClass = isDisabled ? " disabled-step" : "";
      const modelBadge = s.model
        ? `<span class="pipe-step-model">${esc(s.model)}</span>`
        : "";
      const editBtn = isCustom
        ? `<button class="pipe-step-edit" onclick="editPipeStep(${i})" title="Edit step">✎</button>`
        : "";
      const delBtn = isCustom
        ? `<button class="pipe-step-del" onclick="deletePipeStep('${esc(s.id)}')" title="Remove step">×</button>`
        : "";
      return `<div class="pipe-step-row${disabledClass}" draggable="${isCustom}" data-idx="${i}" data-id="${esc(s.id)}"
    ondragstart="pipeDragStart(event,${i})" ondragover="pipeDragOver(event,${i})" ondragleave="pipeDragLeave(event)"
    ondrop="pipeDrop(event,${i})" ondragend="pipeDragEnd(event)">
    <span class="pipe-step-drag" title="${isCustom ? "Drag to reorder" : "Core step (fixed order)"}">${isCustom ? "⠿" : "┃"}</span>
    <span class="pipe-step-icon">${s.icon}</span>
    <div class="pipe-step-info">
      <div class="pipe-step-name">${esc(s.label)}</div>
      <div class="pipe-step-meta">
        <span class="pipe-step-badge ${s.type}">${s.type}</span>
        ${modelBadge}
        ${isCustom && s.prompt ? `<span title="${esc(s.prompt)}" style="cursor:help">💬 prompt</span>` : ""}
      </div>
    </div>
    <div class="pipe-step-actions">
      ${editBtn}
      ${delBtn}
      <label class="auto-toggle" title="${isDisabled ? "Enable" : "Disable"} step">
        <input type="checkbox" ${checkedAttr} onchange="togglePipeStep('${esc(s.id)}',this.checked)">
        <span class="auto-toggle-track"></span>
      </label>
    </div>
  </div>`;
    })
    .join("");
}

function buildPipeStepsList() {
  const core = CORE_STEPS.map((s) => ({ ...s, type: "core" }));
  const custom = pipeCustomSteps.map((s) => ({
    id: s.id,
    icon: "⚡",
    label: s.name,
    type: "custom",
    model: s.model || "",
    prompt: s.system_prompt || "",
  }));
  const all = [];
  let coreIdx = 0;
  const customByPos = custom.map((c, i) => ({
    ...c,
    origIdx: i,
    pos: pipeCustomSteps[i].position ?? 999,
  }));
  customByPos.sort((a, b) => a.pos - b.pos);
  let ci = 0;
  for (let i = 0; i <= core.length; i++) {
    while (ci < customByPos.length && customByPos[ci].pos <= i) {
      all.push(customByPos[ci]);
      ci++;
    }
    if (i < core.length) all.push(core[i]);
  }
  while (ci < customByPos.length) {
    all.push(customByPos[ci]);
    ci++;
  }
  return all;
}

function togglePipeStep(stepId, enabled) {
  if (enabled) {
    pipeDisabledSteps = pipeDisabledSteps.filter((id) => id !== stepId);
  } else {
    if (!pipeDisabledSteps.includes(stepId))
      pipeDisabledSteps.push(stepId);
  }
  savePipelineConfig();
  renderPipelineConfig();
}

async function savePipelineConfig() {
  const s = document.getElementById("automations-status");
  try {
    await fetch("/api/pipeline/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        custom_steps: pipeCustomSteps,
        disabled_steps: pipeDisabledSteps,
      }),
    });
    if (s) {
      s.className = "settings-status ok";
      s.textContent = "✓ Pipeline saved";
      setTimeout(() => (s.textContent = ""), 2000);
    }
  } catch {
    if (s) {
      s.className = "settings-status err";
      s.textContent = "✗ Save failed";
    }
  }
}

function openAddPipeStepModal(editIdx) {
  const modal = document.getElementById("pipe-cfg-modal");
  if (!modal) return;
  const isEdit = editIdx !== undefined;
  const existing = isEdit ? pipeCustomSteps[editIdx] : null;
  modal.style.display = "flex";
  modal.innerHTML = `
  <div class="pipe-modal-inner">
    <div class="pipe-modal-header">
      <h3>${isEdit ? "Edit Custom Step" : "Add Custom Step"}</h3>
      <button class="pipe-modal-close" onclick="closePipeModal()">×</button>
    </div>
    <div class="settings-group" style="margin-bottom:14px">
      <label class="settings-label">Step Name</label>
      <input class="settings-input" id="pipe-step-name" placeholder="e.g. Summarize for Executives" value="${isEdit ? esc(existing.name) : ""}" />
    </div>
    <div class="settings-group" style="margin-bottom:14px">
      <label class="settings-label">System Prompt</label>
      <textarea class="settings-input auto-textarea" id="pipe-step-prompt" rows="6"
        placeholder="You are a document processor. For each document, generate a concise executive summary..."
        style="min-height:120px;resize:vertical;font-family:var(--font-mono);font-size:12px">${isEdit ? esc(existing.system_prompt || "") : ""}</textarea>
      <div class="auto-hint">This prompt runs on every ingested document. The document content is appended as the user message.</div>
    </div>
    <div class="settings-group" style="margin-bottom:14px">
      <label class="settings-label">LLM Model <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <select class="settings-select" id="pipe-step-model">
        <option value="">Use default</option>
        <option value="claude-sonnet-4-20250514" ${isEdit && existing.model === "claude-sonnet-4-20250514" ? "selected" : ""}>Claude Sonnet 4</option>
        <option value="claude-3-5-haiku-20241022" ${isEdit && existing.model === "claude-3-5-haiku-20241022" ? "selected" : ""}>Claude 3.5 Haiku</option>
        <option value="gpt-4o" ${isEdit && existing.model === "gpt-4o" ? "selected" : ""}>GPT-4o</option>
        <option value="gpt-4o-mini" ${isEdit && existing.model === "gpt-4o-mini" ? "selected" : ""}>GPT-4o Mini</option>
        <option value="llama3" ${isEdit && existing.model === "llama3" ? "selected" : ""}>Llama 3 (Ollama)</option>
      </select>
    </div>
    <div class="settings-group" style="margin-bottom:14px">
      <label class="settings-label">Position</label>
      <select class="settings-select" id="pipe-step-position">
        ${[
          { v: 4, l: "Before LLM Compile" },
          { v: 5, l: "After LLM Compile" },
          { v: 6, l: "After Write Pages" },
          { v: 8, l: "Before Git Commit" },
          { v: 999, l: "End of pipeline" },
        ]
          .map(
            (o) =>
              `<option value="${o.v}" ${isEdit && existing.position == o.v ? "selected" : ""}>${o.l}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="settings-btn settings-btn-primary" onclick="savePipeStep(${isEdit ? editIdx : -1})">${isEdit ? "Update Step" : "Add Step"}</button>
      <button class="settings-btn" onclick="closePipeModal()">Cancel</button>
    </div>
    <div id="pipe-modal-status" class="settings-status" style="margin-top:8px"></div>
  </div>`;
  setTimeout(
    () => document.getElementById("pipe-step-name")?.focus(),
    100,
  );
}

function editPipeStep(allIdx) {
  const allSteps = buildPipeStepsList();
  const step = allSteps[allIdx];
  if (!step || step.type !== "custom") return;
  const customIdx = pipeCustomSteps.findIndex((s) => s.id === step.id);
  if (customIdx >= 0) openAddPipeStepModal(customIdx);
}

function closePipeModal() {
  const modal = document.getElementById("pipe-cfg-modal");
  if (modal) modal.style.display = "none";
}

function savePipeStep(editIdx) {
  const name = document.getElementById("pipe-step-name").value.trim();
  const prompt = document.getElementById("pipe-step-prompt").value.trim();
  const model = document.getElementById("pipe-step-model").value;
  const position = parseInt(
    document.getElementById("pipe-step-position").value,
    10,
  );
  const statusEl = document.getElementById("pipe-modal-status");
  if (!name) {
    statusEl.className = "settings-status err";
    statusEl.textContent = "✗ Name is required";
    return;
  }
  if (!prompt) {
    statusEl.className = "settings-status err";
    statusEl.textContent = "✗ System prompt is required";
    return;
  }

  if (editIdx >= 0) {
    pipeCustomSteps[editIdx] = {
      ...pipeCustomSteps[editIdx],
      name,
      system_prompt: prompt,
      model: model || undefined,
      position,
      enabled: true,
    };
  } else {
    const id = "custom-" + Date.now().toString(36);
    pipeCustomSteps.push({
      id,
      name,
      system_prompt: prompt,
      model: model || undefined,
      position,
      enabled: true,
    });
  }
  savePipelineConfig();
  renderPipelineConfig();
  closePipeModal();
}

function deletePipeStep(stepId) {
  pipeCustomSteps = pipeCustomSteps.filter((s) => s.id !== stepId);
  pipeDisabledSteps = pipeDisabledSteps.filter((id) => id !== stepId);
  savePipelineConfig();
  renderPipelineConfig();
}

function pipeDragStart(e, idx) {
  const allSteps = buildPipeStepsList();
  if (allSteps[idx]?.type !== "custom") {
    e.preventDefault();
    return;
  }
  pipeDragSrcIdx = idx;
  e.currentTarget.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}
function pipeDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  e.currentTarget.classList.add("drag-over");
}
function pipeDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}
function pipeDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document
    .querySelectorAll(".pipe-step-row")
    .forEach((el) => el.classList.remove("drag-over"));
}
function pipeDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  if (pipeDragSrcIdx === null || pipeDragSrcIdx === targetIdx) return;
  const allSteps = buildPipeStepsList();
  const srcStep = allSteps[pipeDragSrcIdx];
  if (!srcStep || srcStep.type !== "custom") return;

  let newPosition;
  const targetStep = allSteps[targetIdx];
  if (targetStep) {
    if (targetStep.type === "core") {
      const coreIdx = CORE_STEPS.findIndex((s) => s.id === targetStep.id);
      newPosition = targetIdx < pipeDragSrcIdx ? coreIdx : coreIdx + 1;
    } else {
      newPosition = targetStep.pos ?? 999;
    }
  } else {
    newPosition = 999;
  }

  const customIdx = pipeCustomSteps.findIndex((s) => s.id === srcStep.id);
  if (customIdx >= 0) {
    pipeCustomSteps[customIdx] = {
      ...pipeCustomSteps[customIdx],
      position: newPosition,
    };
    savePipelineConfig();
    renderPipelineConfig();
  }
  pipeDragSrcIdx = null;
}

// ── Connectors / Sources ──────────────────────────────────────────────
let connectorAddType = "folder";

async function loadConnectors() {
  const list = document.getElementById("connectors-list");
  if (!list) return;
  try {
    const data = await api("/api/connectors");
    const { connectors = [] } = data;
    if (connectors.length === 0) {
      list.innerHTML = `<div class="conn-empty">
      <div style="font-size:32px;margin-bottom:12px">📡</div>
      <div style="font-size:14px;font-weight:500;margin-bottom:6px">No connected sources</div>
      <div style="font-size:12px;color:var(--text-muted)">Connect a folder or git repo to automatically ingest files into your wiki.</div>
    </div>`;
      return;
    }
    list.innerHTML = connectors
      .map((c) => {
        const statusColor =
          {
            active: "var(--green)",
            syncing: "var(--accent)",
            error: "var(--red)",
            idle: "var(--text-muted)",
          }[c.status] || "var(--text-muted)";
        const typeIcon =
          { folder: "dir", "git-repo": "git", github: "gh" }[c.type] ||
          "src";
        const lastSync = c.lastSyncAt
          ? `Last sync: ${formatTimeAgo(c.lastSyncAt)}`
          : "Never synced";
        return `<div class="conn-card" id="conn-${c.id}">
      <div class="conn-card-header">
        <span class="conn-icon">${typeIcon}</span>
        <div class="conn-info">
          <div class="conn-name">${esc(c.name)}</div>
          <div class="conn-path" title="${esc(c.path)}">${esc(c.path)}</div>
          <div class="conn-meta">
            <span style="color:${statusColor}">● ${c.status}</span>
            ${c.totalFiles ? `· ${c.totalFiles} files` : ""}
            · ${lastSync}
            ${c.autoSync ? '· <span style="color:var(--accent)">Auto-watch ✓</span>' : ""}
          </div>
          ${c.errorMessage ? `<div class="conn-error">${esc(c.errorMessage)}</div>` : ""}
        </div>
        <div class="conn-actions">
          <button class="btn-sm" onclick="syncConnector('${c.id}')" title="Sync now">⟳ Sync</button>
          <button class="btn-sm" onclick="previewConnector('${c.id}')" title="Preview files">Preview</button>
          <button class="btn-sm btn-danger" onclick="removeConnector('${c.id}')" title="Remove">✕</button>
        </div>
      </div>
      <div id="conn-preview-${c.id}" class="conn-preview" style="display:none"></div>
    </div>`;
      })
      .join("");
  } catch (e) {
    list.innerHTML = `<div style="color:var(--red);font-size:13px">Failed to load connectors: ${String(e)}</div>`;
  }
}

function showAddConnectorModal(type) {
  connectorAddType = type;
  const modal = document.getElementById("connector-modal");
  if (!modal) return;
  const isRepo = type === "git-repo" || type === "github";
  const label = {
    folder: "Local Folder",
    "git-repo": "Local Git Repo",
    github: "GitHub Repository",
  }[type];
  modal.style.display = "flex";
  modal.innerHTML = `
  <div class="conn-modal-inner">
    <div class="conn-modal-header">
      <h3 style="margin:0;font-size:16px">Connect ${label}</h3>
      <button onclick="document.getElementById('connector-modal').style.display='none'" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">×</button>
    </div>
    <div class="settings-group">
      <label class="settings-label">Display Name</label>
      <input class="settings-input" id="conn-name" placeholder="${isRepo ? "My Project Docs" : "My Documents"}" />
    </div>
    ${
      isRepo && type === "github"
        ? `
    <div class="settings-group">
      <label class="settings-label">GitHub Repository URL</label>
      <input class="settings-input" id="conn-url" placeholder="https://github.com/owner/repo" />
    </div>`
        : `
    <div class="settings-group">
      <label class="settings-label">${isRepo ? "Local Repo Path" : "Folder Path"}</label>
      <input class="settings-input" id="conn-path" placeholder="${isRepo ? "/Users/me/projects/my-repo" : "/Users/me/Documents"}" />
    </div>`
    }
    <div class="settings-group">
      <label class="settings-label">Include Only (optional, comma-separated globs)</label>
      <input class="settings-input" id="conn-include" placeholder="*.md, *.txt, *.pdf" />
    </div>
    <div class="settings-group">
      <label class="settings-label">Exclude Patterns (optional)</label>
      <input class="settings-input" id="conn-exclude" placeholder="node_modules/**, .git/**, dist/**" />
    </div>
    <div class="settings-group">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text)">
        <input type="checkbox" id="conn-autosync" checked style="accent-color:var(--accent)">
        Auto-watch for new files (watches for changes and auto-ingests)
      </label>
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="settings-btn settings-btn-primary" onclick="addConnector()">Connect Source</button>
      <button class="settings-btn" onclick="document.getElementById('connector-modal').style.display='none'">Cancel</button>
    </div>
    <div id="conn-add-status" class="settings-status" style="margin-top:8px"></div>
  </div>`;
}

async function addConnector() {
  const s = document.getElementById("conn-add-status");
  const isGithub = connectorAddType === "github";
  const name = document.getElementById("conn-name")?.value?.trim();
  const path = document.getElementById("conn-path")?.value?.trim();
  const url = document.getElementById("conn-url")?.value?.trim();
  const include = document.getElementById("conn-include")?.value?.trim();
  const exclude = document.getElementById("conn-exclude")?.value?.trim();
  const autoSync =
    document.getElementById("conn-autosync")?.checked ?? true;

  s.className = "settings-status";
  s.innerHTML = '<span class="spinner"></span> Connecting…';

  try {
    const body = {
      type: connectorAddType,
      name: name || undefined,
      path: path || undefined,
      url: url || undefined,
      includeGlobs: include
        ? include
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean)
        : undefined,
      excludeGlobs: exclude
        ? exclude
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean)
        : undefined,
      autoSync,
    };
    const result = await fetch("/api/connectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    if (result.error) {
      s.className = "settings-status err";
      s.textContent = "✗ " + result.error;
      return;
    }
    s.className = "settings-status ok";
    s.textContent = "✓ Connected!";
    setTimeout(() => {
      document.getElementById("connector-modal").style.display = "none";
      loadConnectors();
    }, 800);
  } catch (e) {
    s.className = "settings-status err";
    s.textContent = "✗ " + String(e);
  }
}

async function syncConnector(id) {
  const card = document.getElementById("conn-" + id);
  const btn = card?.querySelector('[onclick*="syncConnector"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⟳ Syncing…";
  }
  try {
    const result = await fetch(`/api/connectors/${id}/sync`, {
      method: "POST",
    }).then((r) => r.json());
    if (result.error) {
      alert("Sync failed: " + result.error);
    } else {
      const msg = `✓ Synced: ${result.filesIngested} files, ${result.pagesCreated} pages created in ${Math.round(result.duration / 1000)}s`;
      if (btn) {
        btn.textContent = "✓ Done";
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = "⟳ Sync";
        }, 3000);
      }
      loadConnectors();
      // Show toast
      showToast(msg, 3000);
      loadTree();
      loadHome();
    }
  } catch (e) {
    alert("Sync error: " + String(e));
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⟳ Sync";
    }
  }
}

async function previewConnector(id) {
  const preview = document.getElementById("conn-preview-" + id);
  if (!preview) return;
  if (preview.style.display !== "none") {
    preview.style.display = "none";
    return;
  }
  preview.style.display = "block";
  preview.innerHTML =
    '<div style="padding:8px;color:var(--text-muted);font-size:12px">Scanning files…</div>';
  try {
    const data = await api(`/api/connectors/${id}/scan`);
    const { files = [], total = 0 } = data;
    const byExt = {};
    for (const f of files) {
      const ext = f.split(".").pop().toLowerCase() || "other";
      byExt[ext] = (byExt[ext] || 0) + 1;
    }
    const extSummary = Object.entries(byExt)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(
        ([e, n]) =>
          `<span class="conn-ext-badge">.${e} <strong>${n}</strong></span>`,
      )
      .join("");
    preview.innerHTML = `<div class="conn-preview-inner">
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Found ${total} ingestible files ${total > 200 ? "(showing first 200)" : ""}:</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">${extSummary}</div>
    <div class="conn-file-list">${files
      .slice(0, 30)
      .map(
        (f) =>
          `<div class="conn-file-item">📄 ${esc(f.split("/").slice(-2).join("/"))}</div>`,
      )
      .join("")}
    ${files.length > 30 ? `<div style="color:var(--text-muted);font-size:11px;padding:4px 0">…and ${files.length - 30} more</div>` : ""}
    </div>
    <button class="settings-btn settings-btn-primary" style="margin-top:8px" onclick="syncConnector('${id}')">⟳ Ingest All Files Now</button>
  </div>`;
  } catch (e) {
    preview.innerHTML = `<div style="color:var(--red);font-size:12px">Failed: ${String(e)}</div>`;
  }
}

async function removeConnector(id) {
  if (
    !confirm(
      "Remove this connected source? The wiki pages generated from it will NOT be deleted.",
    )
  )
    return;
  try {
    await fetch(`/api/connectors/${id}`, { method: "DELETE" });
    loadConnectors();
  } catch (e) {
    alert("Failed to remove: " + String(e));
  }
}

// ── Sweet-alert modal (UXO-057) ──
function showSweetAlert({ icon = "⚠️", title = "Alert", body = "", buttons = [] } = {}) {
  const overlay = document.getElementById("sweet-alert-overlay");
  if (!overlay) return;
  document.getElementById("sweet-alert-icon").textContent = icon;
  document.getElementById("sweet-alert-title").textContent = title;
  document.getElementById("sweet-alert-body").textContent = body;
  const btnsEl = document.getElementById("sweet-alert-btns");
  btnsEl.innerHTML = "";
  buttons.forEach(btn => {
    const el = document.createElement("button");
    el.className = btn.primary ? "settings-btn settings-btn-primary" : "settings-btn";
    el.style.cssText = "font-size: 13px; padding: 7px 18px;";
    el.textContent = btn.label;
    el.onclick = btn.action || closeSweetAlert;
    btnsEl.appendChild(el);
  });
  if (!buttons.length) {
    const el = document.createElement("button");
    el.className = "settings-btn";
    el.style.cssText = "font-size: 13px; padding: 7px 18px;";
    el.textContent = "OK";
    el.onclick = closeSweetAlert;
    btnsEl.appendChild(el);
  }
  overlay.classList.remove("hidden");
  overlay.onclick = (e) => { if (e.target === overlay) closeSweetAlert(); };
}
function closeSweetAlert() {
  const overlay = document.getElementById("sweet-alert-overlay");
  if (overlay) overlay.classList.add("hidden");
}
function showToast(msg, duration = 2500) {
  const t =
    document.getElementById("toast") ||
    (() => {
      const el = document.createElement("div");
      el.id = "toast";
      el.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:10px 18px;font-size:13px;color:var(--text);z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.4);opacity:0;transition:opacity 0.2s;pointer-events:none";
      document.body.appendChild(el);
      return el;
    })();
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.style.opacity = "0"), duration);
}

async function saveProviderSettings() {
  const s = document.getElementById("provider-status");
  const body = {};
  const llmModeRadio = document.querySelector(
    'input[name="llm-mode"]:checked',
  );
  if (llmModeRadio) body.llm_mode = llmModeRadio.value;
  const key = document.getElementById("cfg-apikey").value;
  if (key) body.apiKey = key;
  const model = document.getElementById("cfg-model").value;
  if (model) body.model = model;
  const gemini = document.getElementById("cfg-gemini").value;
  if (gemini) body.geminiApiKey = gemini;
  try {
    await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    s.className = "settings-status ok";
    s.textContent = "✓ Keys saved";
    setTimeout(() => (s.textContent = ""), 2000);
  } catch {
    s.className = "settings-status err";
    s.textContent = "✗ Failed";
  }
}

async function testProvider(name) {
  const s = document.getElementById("claude-status");
  const key = document.getElementById("cfg-apikey").value;
  if (!key) {
    s.className = "settings-status err";
    s.textContent = "Enter a key first";
    return;
  }
  s.className = "settings-status";
  s.innerHTML = '<span class="spinner"></span> Testing...';
  try {
    const res = await fetch("/api/config/test-provider", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: name, apiKey: key }),
    });
    const data = await res.json();
    if (data.status === "ok") {
      s.className = "settings-status ok";
      s.textContent = "✓ Connected";
    } else {
      s.className = "settings-status err";
      s.textContent = "✗ " + data.error;
    }
  } catch {
    s.className = "settings-status err";
    s.textContent = "✗ Request failed";
  }
}

function toggleLlmMode() {
  const checked = document.querySelector(
    'input[name="llm-mode"]:checked',
  );
  const mode = checked ? checked.value : "api";
  const fields = document.getElementById("api-key-fields");
  const note = document.getElementById("claude-code-note");
  if (!fields) return;
  if (mode === "claude-code") {
    fields.style.opacity = "0.4";
    fields.style.pointerEvents = "none";
    if (note) note.style.display = "block";
  } else {
    fields.style.opacity = "1";
    fields.style.pointerEvents = "auto";
    if (note) note.style.display = "none";
  }
  document.querySelectorAll(".llm-mode-option").forEach((el) => {
    const radio = el.querySelector('input[type="radio"]');
    el.classList.toggle("active", radio && radio.checked);
  });
}

// ── Home ──
async function loadHome() {
  const [stats, pages, wikiConfig] = await Promise.all([
    api("/api/status"),
    api("/api/pages"),
    api("/api/config").catch(() => ({})),
  ]);
  const wikiName = (wikiConfig && wikiConfig.name) ? wikiConfig.name : "My Wiki";
  const wikiDesc = (wikiConfig && wikiConfig.description) ? wikiConfig.description : "";
  const heroH1 = document.querySelector("#home-dashboard .home-hero h1");
  const heroP = document.querySelector("#home-dashboard .home-hero p");
  if (heroH1) heroH1.textContent = wikiName;
  if (heroP) {
    heroP.textContent = wikiDesc || "";
    heroP.style.display = wikiDesc ? "" : "none";
  }
  const graphData = { nodes: [], links: [] };
  state.allPages = pages;

  // Onboarding gate: empty vault → show first-time experience
  const onboardEl = document.getElementById("home-onboarding");
  const dashEl = document.getElementById("home-dashboard");
  if (stats.pageCount === 0) {
    onboardEl.style.display = "";
    dashEl.style.display = "none";
    return;
  }
  onboardEl.style.display = "none";
  dashEl.style.display = "";
  renderHomeConnectors();

  const statusText = `${stats.pageCount} pages · ${stats.wordCount.toLocaleString()} words`;
  document
    .querySelectorAll("#status-text")
    .forEach((el) => (el.textContent = statusText));
  document.getElementById("sb-pages").textContent =
    stats.pageCount + " pages";
  document.getElementById("sb-words").textContent =
    stats.wordCount.toLocaleString() + " words";

  const statsEl = document.getElementById("home-stats");
  const items = [
    { v: stats.pageCount, l: "Pages" },
    { v: stats.wordCount.toLocaleString(), l: "Words" },
    { v: stats.sourceCount, l: "Sources" },
    { v: stats.wikilinks, l: "Links" },
    { v: stats.orphanPages, l: "Orphans" },
  ];
  statsEl.innerHTML = items
    .map(
      (s) =>
        `<div class="stat-card"><div class="stat-value">${s.v}</div><div class="stat-label">${s.l}</div></div>`,
    )
    .join("");

  const recent = pages.slice(-8).reverse();
  document.getElementById("home-recent").innerHTML = recent
    .map(
      (p) =>
        `<div class="recent-item" onclick="openPage('${esc(p.title)}')">
    <span class="recent-item-icon">◇</span>
    <span class="recent-item-title">${esc(p.title)}</span>
    <span class="category-badge ${catClass(p.category)}">${esc(p.category)}</span>
    <span class="recent-item-meta">${p.wordCount}w</span>
  </div>`,
    )
    .join("");

  // God nodes section — top 5 most connected pages
  if (graphData?.nodes?.length > 3) {
    const inDeg = {};
    for (const l of graphData.links || []) {
      const t = typeof l.target === "object" ? l.target : l.target;
      inDeg[t] = (inDeg[t] || 0) + 1;
    }
    const godNodes = graphData.nodes
      .map((n) => ({ ...n, deg: inDeg[n.id] || 0 }))
      .filter((n) => n.deg >= 2)
      .sort((a, b) => b.deg - a.deg)
      .slice(0, 5);

    const godEl = document.getElementById("home-god-nodes");
    if (godEl && godNodes.length > 0) {
      godEl.innerHTML = `<div class="home-section-label">Hub Pages</div>
      ${godNodes
        .map(
          (n) => `
      <div class="recent-item" onclick="openPage('${esc(n.title)}')">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0"></span>
        <span class="recent-item-title">${esc(n.title)}</span>
        <span class="category-badge ${catClass(n.category)}">${esc(n.category)}</span>
        <span class="recent-item-meta">${n.deg} links</span>
      </div>`,
        )
        .join("")}`;
      godEl.style.display = "";
    }
  }
}

// ── Onboarding action helpers ──
function showConnectorModal(type) {
  showAddConnectorModal(type);
}
function startUrlIngest() {
  showView("home");
  const urlInput = document.getElementById("url-input");
  if (urlInput) {
    urlInput.scrollIntoView({ behavior: "smooth", block: "center" });
    urlInput.focus();
  }
  document.getElementById("home-onboarding").style.display = "none";
  document.getElementById("home-dashboard").style.display = "";
}

// ── Search ──
function openSearch() {
  document.getElementById("search-overlay").classList.add("visible");
  document.getElementById("rail-search").classList.add("active");
  const input = document.getElementById("search-input");
  input.value = "";
  input.focus();
  state.searchResults = [];
  state.searchIndex = 0;
  renderSearchResults();
}
function closeSearch() {
  document.getElementById("search-overlay").classList.remove("visible");
  document.getElementById("rail-search").classList.remove("active");
}
let _searchDebounce = null;
function doSearch(query) {
  if (!query.trim()) {
    state.searchResults = [];
    renderSearchResults();
    return;
  }
  const q = query.toLowerCase();

  // Immediate client-side filter (titles, categories, tags)
  const titleMatches = state.allPages
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.frontmatter?.tags || []).some((t) =>
          t.toLowerCase().includes(q),
        ),
    )
    .map((p) => ({ ...p, matchType: "title" }));
  state.searchResults = titleMatches.slice(0, 15);
  state.searchIndex = 0;
  renderSearchResults();

  // Debounced server-side full-text search
  clearTimeout(_searchDebounce);
  _searchDebounce = setTimeout(async () => {
    try {
      const data = await api(
        "/api/search?q=" + encodeURIComponent(query) + "&limit=10",
      );
      if (data?.results?.length) {
        const existing = new Set(state.searchResults.map((r) => r.title));
        const fullTextResults = data.results
          .filter((r) => !existing.has(r.title))
          .map((r) => ({
            ...r,
            matchType: "content",
            snippet: r.snippet,
          }));
        state.searchResults = [
          ...state.searchResults,
          ...fullTextResults,
        ].slice(0, 20);
        renderSearchResults();
      }
    } catch {}
  }, 200);
}

function renderSearchResults() {
  const container = document.getElementById("search-results");
  if (!state.searchResults.length) {
    const q = document.getElementById("search-input").value.trim();
    container.innerHTML = q
      ? `<div id="search-empty">No results for "${esc(q)}"</div>`
      : `<div id="search-empty">Type to search across all pages, content, and metadata</div>`;
    return;
  }
  // Check if we can just update selection classes (avoids DOM destruction on hover)
  const existingItems = container.querySelectorAll(".search-result");
  if (
    existingItems.length === state.searchResults.length &&
    existingItems.length > 0
  ) {
    existingItems.forEach((el, i) =>
      el.classList.toggle("selected", i === state.searchIndex),
    );
    return;
  }
  container.innerHTML = state.searchResults
    .map((r, i) => {
      const snippet = r.snippet
        ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:400px">${esc(r.snippet)}</div>`
        : "";
      const matchIcon = r.matchType === "content" ? "📝" : "◇";
      return `<div class="search-result${i === state.searchIndex ? " selected" : ""}"
        onclick="closeSearch();openPage('${esc(r.title)}')"
        onmouseenter="state.searchIndex=${i};renderSearchResults()">
    <span class="search-result-icon">${matchIcon}</span>
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="search-result-title">${esc(r.title)}</span>
        <span class="category-badge ${catClass(r.category)}">${esc(r.category || "")}</span>
      </div>
      ${snippet}
    </div>
  </div>`;
    })
    .join("");
}

document
  .getElementById("search-input")
  .addEventListener("input", (e) => doSearch(e.target.value));
document
  .getElementById("search-input")
  .addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.searchIndex = Math.min(
        state.searchIndex + 1,
        state.searchResults.length - 1,
      );
      renderSearchResults();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      state.searchIndex = Math.max(state.searchIndex - 1, 0);
      renderSearchResults();
    }
    if (e.key === "Enter" && state.searchResults[state.searchIndex]) {
      closeSearch();
      openPage(state.searchResults[state.searchIndex].title);
    }
  });
document
  .getElementById("search-overlay")
  .addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeSearch();
  });

// ── Command Palette (Cmd+P) ──
const commands = [
  {
    icon: "⌂",
    label: "Go Home",
    shortcut: "",
    action: () => showView("home"),
  },
  {
    icon: "⊛",
    label: "Toggle Graph View",
    shortcut: "⌘G",
    action: railGraphClick,
  },
  {
    icon: "⌕",
    label: "Search Pages",
    shortcut: "⌘K",
    action: openSearch,
  },
  {
    icon: "⚙",
    label: "Open Settings",
    shortcut: "⌘,",
    action: railSettingsClick,
  },
  {
    icon: "⚙",
    label: "Ingestion Pipeline",
    shortcut: "",
    action: railPipelineClick,
  },
  {
    icon: "◷",
    label: "Audit Trail / History",
    shortcut: "",
    action: railHistoryClick,
  },
  {
    icon: "▶",
    label: "Time-Lapse",
    shortcut: "",
    action: railTimelapseClick,
  },
  {
    icon: "☰",
    label: "Toggle Sidebar",
    shortcut: "",
    action: () =>
      document.getElementById("sidebar").classList.toggle("collapsed"),
  },
  {
    icon: "↓",
    label: "Upload Files",
    shortcut: "",
    action: () => document.getElementById("file-input").click(),
  },
  {
    icon: "⟲",
    label: "Refresh Data",
    shortcut: "",
    action: () => {
      loadTree();
      loadHome();
    },
  },
  {
    icon: "▼",
    label: "Collapse All Folders",
    shortcut: "",
    action: collapseAllFolders,
  },
];
let paletteFiltered = [...commands];
let paletteIndex = 0;

function openPalette() {
  document.getElementById("palette-overlay").classList.add("visible");
  const input = document.getElementById("palette-input");
  input.value = "";
  input.focus();
  paletteFiltered = [...commands];
  paletteIndex = 0;
  renderPalette();
}
function closePalette() {
  document.getElementById("palette-overlay").classList.remove("visible");
}

function filterPalette(q) {
  if (!q.trim()) {
    paletteFiltered = [...commands];
  } else {
    const lower = q.toLowerCase();
    paletteFiltered = commands.filter((c) =>
      c.label.toLowerCase().includes(lower),
    );
  }
  paletteIndex = 0;
  renderPalette();
}

function renderPalette() {
  const el = document.getElementById("palette-results");
  if (!paletteFiltered.length) {
    el.innerHTML =
      '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">No matching commands</div>';
    return;
  }
  el.innerHTML = paletteFiltered
    .map(
      (c, i) =>
        `<div class="palette-item${i === paletteIndex ? " selected" : ""}" onclick="executePaletteItem(${i})" onmouseenter="paletteIndex=${i};renderPalette()">
    <span class="palette-icon">${c.icon}</span>
    <span class="palette-label">${esc(c.label)}</span>
    ${c.shortcut ? `<span class="palette-shortcut">${c.shortcut}</span>` : ""}
  </div>`,
    )
    .join("");
}

function executePaletteItem(idx) {
  const cmd = paletteFiltered[idx];
  if (cmd) {
    closePalette();
    cmd.action();
  }
}

document
  .getElementById("palette-input")
  .addEventListener("input", (e) => filterPalette(e.target.value));
document
  .getElementById("palette-input")
  .addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePalette();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      paletteIndex = Math.min(
        paletteIndex + 1,
        paletteFiltered.length - 1,
      );
      renderPalette();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      paletteIndex = Math.max(paletteIndex - 1, 0);
      renderPalette();
    }
    if (e.key === "Enter") {
      executePaletteItem(paletteIndex);
    }
  });
document
  .getElementById("palette-overlay")
  .addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closePalette();
  });

// ── Upload ──
const fileInput = document.getElementById("file-input");
const dropZone = document.getElementById("sidebar-drop-zone");
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("dragover"),
);
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files.length) uploadFiles(fileInput.files);
});
document.body.addEventListener("dragover", (e) => e.preventDefault());
document.body.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});

async function uploadFiles(files) {
  const statusEl = document.getElementById("sb-path");
  for (const file of files) {
    statusEl.textContent = `Uploading ${file.name}...`;
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Filename": file.name,
        },
        body: buf,
      });
      const data = await res.json();
      if (data.status === "ingested")
        statusEl.textContent = `✓ ${file.name} — ${data.pagesUpdated || 0} pages`;
      else if (data.ingestError)
        statusEl.textContent = `⚠ ${file.name} — ${data.ingestError}`;
      else statusEl.textContent = `✓ ${file.name} uploaded`;
    } catch {
      statusEl.textContent = `✗ ${file.name} failed`;
    }
  }
  loadHome();
  loadTree();
  setTimeout(() => (statusEl.textContent = ""), 5000);
}

// ── Query ──
document
  .getElementById("query-btn")
  .addEventListener("click", submitQuery);
document
  .getElementById("query-input")
  .addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitQuery();
  });
async function submitQuery() {
  const input = document.getElementById("query-input");
  const result = document.getElementById("query-result");
  const btn = document.getElementById("query-btn");
  const modelSelect = document.getElementById("query-model");
  const q = input.value.trim();
  if (!q) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  result.classList.add("visible");
  result.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--text-muted)"><span class="spinner"></span> Thinking...</div>`;
  try {
    const model = modelSelect?.value || "claude-sonnet-4-20250514";
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, model }),
    });
    const data = await res.json();
    if (data.error) {
      result.innerHTML = `<div style="color:var(--red);font-size:13px">Error: ${esc(data.error)}</div>`;
    } else {
      let html = `<div class="md" style="font-size:14px;line-height:1.7">${renderWikilinks(renderMarkdown(data.answer || "No results found in your knowledge base."))}</div>`;
      if (data.sourcesConsulted?.length) {
        html += `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle)">
        <div style="font-size:10px;color:var(--text-dim);font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px">Sources consulted</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${data.sourcesConsulted
          .map(
            (s) =>
              `<span style="font-size:11px;padding:3px 8px;background:var(--bg-hover);border-radius:4px;cursor:pointer;color:var(--accent);border:1px solid var(--border-subtle)" onclick="openPage('${esc(s)}')">${esc(s)}</span>`,
          )
          .join("")}</div>
      </div>`;
      }
      result.innerHTML = html;
    }
  } catch {
    result.innerHTML =
      '<div style="color:var(--red)">Query failed. Check your API key in Settings.</div>';
  }
  btn.disabled = false;
  btn.textContent = "Ask";
}

// ── URL Ingest ──
document.getElementById("url-btn").addEventListener("click", ingestUrl);
document.getElementById("url-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") ingestUrl();
});
async function ingestUrl() {
  const input = document.getElementById("url-input");
  const result = document.getElementById("url-result");
  const btn = document.getElementById("url-btn");
  const url = input.value.trim();
  if (!url) return;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    result.style.display = "block";
    result.style.color = "var(--red)";
    result.textContent =
      "Enter a valid URL starting with http:// or https://";
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  result.style.display = "block";
  result.style.color = "var(--text-dim)";
  result.innerHTML = '<span class="spinner"></span> Ingesting...';
  try {
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: url }),
    });
    const data = await res.json();
    if (data.error) {
      result.style.color = "var(--red)";
      result.textContent = "Error: " + data.error;
    } else {
      result.style.color = "var(--green)";
      result.textContent = `✓ Ingested — ${data.pagesCreated || 0} pages created, ${data.pagesUpdated || 0} pages updated`;
      input.value = "";
      loadHome();
      loadTree();
    }
  } catch {
    result.style.color = "var(--red)";
    result.textContent = "Ingestion failed";
  }
  btn.disabled = false;
  btn.textContent = "Ingest";
}

// ── Sidebar history ──
let historyLoaded = false;
async function loadSidebarHistory() {
  if (historyLoaded) return;
  historyLoaded = true;
  try {
    const entries = await api("/api/history");
    const el = document.getElementById("sidebar-history");
    const countEl = document.getElementById("history-count");
    if (!entries || !entries.length) {
      el.innerHTML =
        '<div style="font-size:11px;color:var(--text-muted);padding:8px 0;">No history yet</div>';
      countEl.textContent = "0";
      return;
    }
    countEl.textContent = entries.length;
    const icons = {
      ingest: "↓",
      scrape: "⟲",
      improve: "✦",
      manual: "✎",
      restore: "↩",
    };
    const colors = {
      ingest: "var(--green)",
      scrape: "var(--blue)",
      improve: "var(--accent)",
      manual: "var(--text-dim)",
      restore: "var(--amber)",
    };
    el.innerHTML = entries
      .slice(0, 15)
      .map((e) => {
        const icon = icons[e.automation] || "•";
        const color = colors[e.automation] || "var(--text-dim)";
        const date = new Date(e.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        return `<div class="tree-item" style="padding-left:8px;gap:6px">
      <span style="color:${color};font-size:13px;min-width:16px;text-align:center">${icon}</span>
      <span class="tree-label" style="font-size:11px">${esc(e.summary).substring(0, 40)}</span>
      <span style="font-size:10px;color:var(--text-muted);margin-left:auto">${date}</span>
    </div>`;
      })
      .join("");
  } catch {}
}

// ── Sidebar connectors ──
let connectorsLoaded = false;
async function loadSidebarConnectors() {
  if (connectorsLoaded) return;
  connectorsLoaded = true;
  const el = document.getElementById("sidebar-connectors");
  const countEl = document.getElementById("connectors-count");
  try {
    const data = await api("/api/connectors");
    const { connectors = [] } = data;
    countEl.textContent = connectors.length;
    if (!connectors.length) {
      el.innerHTML = `<div style="font-size:11px;color:var(--text-muted);padding:4px 0 8px">No sources connected.
      <span onclick="openViewTab('settings');renderSettingsSection('sources')" style="color:var(--accent);cursor:pointer">Add one →</span></div>`;
      return;
    }
    const statusColors = {
      active: "var(--green)",
      syncing: "var(--accent)",
      error: "var(--red)",
      idle: "var(--text-muted)",
    };
    el.innerHTML = connectors
      .map((c) => {
        const icon =
          { folder: "dir", "git-repo": "git", github: "gh" }[c.type] ||
          "src";
        const dot = `<span style="color:${statusColors[c.status] || "var(--text-muted)"};font-size:10px">●</span>`;
        const lastSync = c.lastSyncAt
          ? formatTimeAgo(c.lastSyncAt)
          : "never";
        return `<div class="tree-item" style="padding-left:8px;gap:6px;flex-direction:column;align-items:flex-start;height:auto;padding-top:6px;padding-bottom:6px">
      <div style="display:flex;align-items:center;gap:6px;width:100%">
        <span style="font-size:10px;font-family:var(--font-mono);color:var(--text-dim);background:var(--bg-surface);padding:1px 4px;border-radius:3px">${icon}</span>
        <span class="tree-label" style="font-size:12px;font-weight:500">${esc(c.name)}</span>
        ${dot}
      </div>
      <div style="font-size:10px;color:var(--text-muted);padding-left:20px">synced ${lastSync} · ${c.totalFiles || 0} files</div>
    </div>`;
      })
      .join("");
  } catch {
    el.innerHTML =
      '<div style="font-size:11px;color:var(--text-muted)">Failed to load</div>';
    countEl.textContent = "!";
  }
}

// ── Resize ──
let resizing = false;
const handle = document.getElementById("resize-handle");
handle.addEventListener("mousedown", (e) => {
  resizing = true;
  handle.classList.add("active");
  e.preventDefault();
});
document.addEventListener("mousemove", (e) => {
  if (!resizing) return;
  const sidebar = document.getElementById("sidebar");
  const railW = 44;
  const newW = Math.max(180, Math.min(360, e.clientX - railW));
  sidebar.style.width = newW + "px";
});
document.addEventListener("mouseup", () => {
  resizing = false;
  handle.classList.remove("active");
});

// ── Keyboard shortcuts ──
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    openSearch();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "p") {
    e.preventDefault();
    openPalette();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "g") {
    e.preventDefault();
    railGraphClick();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === ",") {
    e.preventDefault();
    railSettingsClick();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "w") {
    e.preventDefault();
    if (state.activeTabId) closeTab(state.activeTabId);
  }
  // Cmd+N — new note
  if ((e.metaKey || e.ctrlKey) && e.key === "n") {
    e.preventDefault();
    document.getElementById("sa-new-note")?.click();
  }
  // Cmd+Tab / Ctrl+Tab — next tab
  if ((e.ctrlKey || e.metaKey) && e.key === "Tab") {
    e.preventDefault();
    if (state.tabs.length > 1) {
      const idx = state.tabs.findIndex((t) => t.id === state.activeTabId);
      const next = e.shiftKey
        ? (idx - 1 + state.tabs.length) % state.tabs.length
        : (idx + 1) % state.tabs.length;
      activateTab(state.tabs[next].id);
    }
  }
  if (e.key === "Escape") {
    closeSearch();
    closePalette();
  }
});

// ── Icon rail handlers ──
// BUG FIX UXO-007: Explorer icon always shows sidebar + navigates to home/page
function railFilesClick() {
  const sb = document.getElementById("sidebar");
  // Always ensure sidebar is visible
  if (sb.classList.contains("collapsed")) sb.classList.remove("collapsed");

  // If we are on a non-files view (graph, settings, pipeline, history, timelapse),
  // switch back to the last open page tab or fall through to home.
  if (
    isViewTab(state.activeTabId) ||
    ["graph", "settings", "pipeline", "history", "timelapse", "connectors"].includes(
      state.viewMode,
    )
  ) {
    const pageTab = [...state.tabs]
      .reverse()
      .find((t) => !isViewTab(t.id));
    if (pageTab) {
      activateTab(pageTab.id);
      return;
    }
  }

  // If we are already on home, do nothing extra (sidebar is now open).
  if (state.viewMode === "home") return;

  // Otherwise (page view with no page tab, or any other state) → go home.
  state.activeTabId = null;
  showView("home");
  renderTabs();
}
function railSearchClick() {
  openSearch();
}
function railGraphClick() {
  if (state.activeTabId === VIEW_TABS.graph.id) {
    closeTab(VIEW_TABS.graph.id);
  } else {
    openViewTab("graph");
  }
}
function railSettingsClick() {
  if (state.activeTabId === VIEW_TABS.settings.id) {
    closeTab(VIEW_TABS.settings.id);
  } else {
    openViewTab("settings");
  }
}
function railPipelineClick() {
  if (state.activeTabId === VIEW_TABS.pipeline.id) {
    closeTab(VIEW_TABS.pipeline.id);
  } else {
    openViewTab("pipeline");
  }
}

const PIPELINE_STEPS = [
  {
    id: "detect",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    label: "Detect",
  },
  {
    id: "extract",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    label: "Extract",
  },
  {
    id: "dedup",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>',
    label: "Dedup",
  },
  {
    id: "copy-raw",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>',
    label: "Save",
  },
  {
    id: "llm-compile",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93L12 22"/><path d="M12 2a4 4 0 00-4 4c0 1.95 1.4 3.58 3.25 3.93"/><line x1="4.5" y1="9" x2="19.5" y2="9"/></svg>',
    label: "Compile",
  },
  {
    id: "write-pages",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    label: "Write",
  },
  {
    id: "embed",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    label: "Embed",
  },
  {
    id: "update-index",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    label: "Index",
  },
  {
    id: "git-commit",
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg>',
    label: "Commit",
  },
];

let pipelineEventSource = null;
let currentPipelineSteps = {};
let pipelineStepPrevStatuses = {};

let pipelineAutoSwitch = true;

function parsePagesFromPipelineComplete(ev) {
  if (!ev) return null;
  const d = ev.detail != null ? String(ev.detail) : "";
  const m = d.match(/(\d+)\s*pages?/i);
  if (m) return parseInt(m[1], 10);
  if (ev.pagesCreated != null && Number.isFinite(Number(ev.pagesCreated)))
    return Number(ev.pagesCreated);
  return null;
}

function connectPipelineSSE() {
  if (pipelineEventSource) pipelineEventSource.close();
  pipelineEventSource = new EventSource("/api/pipeline/events");
  pipelineEventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === "connected") return;

      if (data.step === "run-start") {
        currentPipelineSteps = {};
        if (pipelineAutoSwitch && state.viewMode !== "pipeline") {
          openViewTab("pipeline");
        }
        renderPipelineSteps();
        return;
      }

      if (data.step === "complete" || data.step === "error") {
        currentPipelineSteps[data.step] = data;
        renderPipelineSteps();
        setTimeout(() => {
          currentPipelineSteps = {};
          loadPipelineRuns();
        }, 3000);
        loadGitBadge();
        loadTree();
        loadHome();
        return;
      }
      currentPipelineSteps[data.step] = data;
      renderPipelineSteps();
    } catch {}
  };
  pipelineEventSource.onerror = () => {
    setTimeout(connectPipelineSSE, 3000);
  };
}

function renderPipelineSteps() {
  const container = document.getElementById("pipe-factory-line");
  if (!container) return;
  const dropzone = document.getElementById("pipe-dropzone");
  const celebEl = document.getElementById("pipe-celebration");
  const hasActivity = Object.keys(currentPipelineSteps).length > 0;

  // Toggle dropzone visibility
  if (dropzone) dropzone.classList.toggle("has-activity", hasActivity);

  if (!hasActivity) {
    container.innerHTML = "";
    pipelineStepPrevStatuses = {};
    if (celebEl) celebEl.innerHTML = "";
    return;
  }

  const prev = pipelineStepPrevStatuses;

  let doneLike = 0;
  let hasRunningStep = false;
  let hasStepError = false;
  for (const step of PIPELINE_STEPS) {
    const ev = currentPipelineSteps[step.id];
    const st = ev ? ev.status : "pending";
    if (st === "done" || st === "skipped") doneLike++;
    if (st === "running") hasRunningStep = true;
    if (st === "error") hasStepError = true;
  }
  if (currentPipelineSteps.error) hasStepError = true;

  let progressPct = Math.min(
    100,
    Math.round(
      ((doneLike + (hasRunningStep ? 0.5 : 0)) / PIPELINE_STEPS.length) *
        100,
    ),
  );
  if (
    currentPipelineSteps.complete &&
    currentPipelineSteps.complete.status === "done"
  )
    progressPct = 100;

  const nextPrev = {};

  let html = '<div class="factory-line-wrap"><div class="factory-line">';
  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    const step = PIPELINE_STEPS[i];
    const event = currentPipelineSteps[step.id];
    const status = event ? event.status : "pending";
    const detail = event ? event.detail || "" : "";
    nextPrev[step.id] = status;

    if (i > 0) {
      const left = PIPELINE_STEPS[i - 1];
      const leftEv = currentPipelineSteps[left.id];
      const leftSt = leftEv ? leftEv.status : "pending";
      let connClass = "";
      if (leftSt === "done" || leftSt === "skipped") {
        if (status === "running") connClass = "active";
        else if (
          status === "done" ||
          status === "skipped" ||
          status === "error"
        )
          connClass = "done";
        else connClass = "done";
      } else if (leftSt === "running") connClass = "active";
      html += `<div class="factory-conn ${connClass}"><svg viewBox="0 0 28 10"><line class="conn-line" x1="0" y1="5" x2="28" y2="5" stroke="var(--border)" stroke-width="1.5" fill="none"/></svg></div>`;
    }

    const was = prev[step.id];
    const fsJustStarted =
      status === "running" &&
      was !== "running" &&
      (was === undefined || was === "pending");
    const fsJustDone = status === "done" && was === "running";
    const extra = `${fsJustStarted ? " fs-just-started" : ""}${fsJustDone ? " fs-just-done" : ""}`;

    html += `<div class="factory-stage ${status}${extra}" onclick="showStageDetail('${step.id}')">
    <div class="fs-icon">${step.icon}</div>
    <div class="fs-label">${step.label}</div>
    ${detail ? `<div class="fs-detail" title="${esc(detail)}">${esc(detail)}</div>` : ""}
  </div>`;
  }
  html += "</div>";

  const progErr = hasStepError ? " factory-progress--error" : "";
  html += `<div class="factory-progress${progErr}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progressPct)}" aria-label="Pipeline progress"><div class="factory-progress-fill" style="transform:scaleX(${Math.min(1, progressPct / 100)})"></div></div>`;
  html += `<div class="factory-progress-label"><span>Processing</span><span>${Math.round(progressPct)}%</span></div></div>`;

  container.innerHTML = html;

  if (celebEl) {
    const completeEv = currentPipelineSteps.complete;
    if (
      completeEv &&
      completeEv.status === "done" &&
      !currentPipelineSteps.error
    ) {
      const n = parsePagesFromPipelineComplete(completeEv);
      const pageWord = n === 1 ? "page" : "pages";
      const pages = completeEv.pagesCreated || [];
      const pageLinksHtml = Array.isArray(pages) && pages.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:10px">${pages.map(p => `<a href="#" onclick="openPage('${p.replace(/'/g,"\'")}');return false;" style="font-size:12px;color:var(--accent);text-decoration:none;background:var(--bg-surface);border:1px solid var(--border);border-radius:6px;padding:3px 10px;display:inline-block">📄 ${esc(p)}</a>`).join('')}</div>`
        : '';
      const summaryHtml =
        n != null
          ? `Your document found a home in <strong>${n}</strong> ${pageWord}.`
          : "Your document found a home in your wiki.";
      celebEl.innerHTML = `<div class="pipe-celebration pipe-celebration--all-done" role="status">
      <div class="celeb-confetti" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <h3>🎉 Pipeline complete</h3>
      <p class="celeb-summary">${summaryHtml}</p>
      ${pageLinksHtml}
    </div>`;
    } else {
      celebEl.innerHTML = "";
    }
  }

  pipelineStepPrevStatuses = nextPrev;
}

const SOURCE_ICONS = {
  ".md": "📄",
  ".txt": "📝",
  ".pdf": "📕",
  ".csv": "📊",
  ".json": "⚙️",
  ".yaml": "⚙️",
  ".mp3": "🎵",
  ".wav": "🎵",
  ".mp4": "🎬",
  ".docx": "📃",
  ".png": "🖼",
  ".jpg": "🖼",
  ".html": "🌐",
};
function srcIcon(name) {
  const ext = "." + (name || "").split(".").pop().toLowerCase();
  return SOURCE_ICONS[ext] || "📄";
}

async function loadPipelineRuns() {
  try {
    const data = await api("/api/pipeline/runs");
    const list = document.getElementById("pipe-runs-list");
    if (!list) return;
    if (!data.runs || data.runs.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:32px 20px;color:var(--text-muted)">
      <div style="font-size:32px;margin-bottom:10px;opacity:0.5">📭</div>
      <div style="font-size:13px">No pipeline runs yet</div>
      <div style="font-size:11px;margin-top:4px;color:var(--text-dim)">Upload a file or ingest a URL to get started</div>
    </div>`;
      return;
    }
    list.innerHTML = data.runs
      .map((run, idx) => {
        const srcName = String(run.source).split("/").pop() || run.source;
        const icon = srcIcon(srcName);
        const inProgress = !run.result;
        const timeAgo = formatTimeAgo(run.startedAt);

        const triggerType = run.triggeredBy || "human";
        const triggerLabels = {
          human: "🧑 Human",
          agent: "🤖 Agent",
          webhook: "🔗 Webhook",
          observer: "🔭 Observer",
        };
        const triggerColors = {
          human: "var(--accent)",
          agent: "var(--green)",
          webhook: "var(--purple)",
          observer: "var(--amber)",
        };

        let statusHtml = "";
        if (inProgress) {
          statusHtml = `<span class="pipe-status-badge running">⟳ Processing</span>`;
        } else if (run.result) {
          statusHtml = `<span class="pipe-status-badge success">✓ Complete</span>`;
        }

        let metricsHtml = "";
        if (run.result) {
          metricsHtml = `<div style="display:flex;gap:16px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border-subtle)">
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:600;color:var(--green)">${run.result.pagesCreated}</div>
          <div style="font-size:10px;color:var(--text-muted)">pages</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:600;color:var(--accent)">${run.result.linksAdded}</div>
          <div style="font-size:10px;color:var(--text-muted)">links</div>
        </div>
        <div style="flex:1"></div>
        ${run.hasSummary || run.hasLLMTrace ? `<button class="btn-sm" onclick="showRunDetail('${run.id}')" style="align-self:center">What the AI Did</button>` : ""}
      </div>`;
        }

        const pagesN = run.result?.pagesCreated || 0;
        const durationMs = run.result && run.startedAt && run.endedAt
          ? (new Date(run.endedAt) - new Date(run.startedAt)) : null;
        const durationStr = durationMs != null
          ? (durationMs >= 60000 ? `${Math.round(durationMs/60000)}m` : `${Math.round(durationMs/1000)}s`)
          : null;
        const cardTitle = run.result
          ? `${pagesN} page${pagesN !== 1 ? "s" : ""} from ${srcName}`
          : srcName;
        const runPages = (run.result?.pages || []);
        const pageLinksHtml = runPages.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px">${runPages.slice(0,5).map(p => `<a href="#" onclick="openPage('${p.replace(/'/g,"\'")}');return false;" style="font-size:11px;color:var(--accent);text-decoration:none;background:var(--bg-surface);border:1px solid var(--border);border-radius:5px;padding:2px 8px">📄 ${esc(p)}</a>`).join("")}${runPages.length > 5 ? `<span style="font-size:11px;color:var(--text-muted)">+${runPages.length-5} more</span>` : ""}</div>`
          : "";
        return `<div class="pipe-run-item" style="animation:pipeSlideIn .3s ease ${idx * 0.05}s both;cursor:pointer" onclick="showRunDetail('${run.id}')">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:24px;flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:var(--bg-surface);border-radius:8px">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px">
            <strong style="font-size:13px;color:var(--text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cardTitle)}</strong>
            ${statusHtml}
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:3px;font-size:11px;color:var(--text-muted)">
            <span>${timeAgo}</span>
            ${durationStr ? `<span>⏱ ${durationStr}</span>` : ""}
            <span style="color:${triggerColors[triggerType] || "var(--text-muted)"};font-weight:500">${triggerLabels[triggerType] || "🧑 Human"}</span>
          </div>
        </div>
      </div>
      ${pageLinksHtml}
      ${metricsHtml}
      <div id="run-detail-${run.id}" class="run-detail" style="display:none"></div>
    </div>`;
      })
      .join("");
  } catch {}
}

async function loadPipelineView() {
  renderPipelineSteps();
  await loadPipelineRuns();
  loadOAuthStatus();
  const countEl = document.getElementById("pipe-runs-count");
  if (countEl) {
    try {
      const d = await api("/api/pipeline/runs");
      countEl.textContent = `${d.runs?.length || 0} total`;
    } catch {}
  }
  // Update gateway URL with actual port
  const gwUrl = document.getElementById("gw-endpoint-url");
  if (gwUrl) {
    const base = window.location.origin;
    gwUrl.textContent = `POST ${base}/api/gateway/ingest`;
    const curlBlock = document.getElementById("gw-curl-block");
    if (curlBlock) {
      const btn = curlBlock.querySelector(".gw-curl-copy");
      const curlText = `curl -X POST ${base}/api/gateway/ingest \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "content": "Your text content here",\n    "source": "api",\n    "title": "My Note",\n    "tags": ["inbox"]\n  }'`;
      curlBlock.textContent = curlText;
      if (btn) curlBlock.appendChild(btn);
    }
  }
}

function copyGatewayUrl() {
  const url = `${window.location.origin}/api/gateway/ingest`;
  navigator.clipboard.writeText(url);
  const btn = event.target;
  btn.textContent = "Copied!";
  setTimeout(() => (btn.textContent = "Copy"), 1500);
}

function copyGatewayCurl() {
  const base = window.location.origin;
  const curl = `curl -X POST ${base}/api/gateway/ingest \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "content": "Your text content here",\n    "source": "api",\n    "title": "My Note",\n    "tags": ["inbox"]\n  }'`;
  navigator.clipboard.writeText(curl);
  const btn = event.target;
  btn.textContent = "Copied!";
  setTimeout(() => (btn.textContent = "Copy"), 1500);
}

async function handlePipeUpload(input) {
  if (!input.files?.length) return;
  await processBatchUpload(Array.from(input.files));
  input.value = "";
}

// UXO-054: Batch upload with queue UI
async function processBatchUpload(files) {
  if (!files.length) return;
  const queueEl = document.getElementById("pipe-upload-queue");
  if (queueEl) queueEl.style.display = "flex";
  const FILE_ICONS = { pdf:"📕", md:"📄", txt:"📝", csv:"📊", json:"⚙️",
    docx:"📃", xlsx:"📊", pptx:"📋", mp3:"🎵", mp4:"🎬", wav:"🎵",
    png:"🖼", jpg:"🖼", jpeg:"🖼", gif:"🖼", webp:"🖼", default:"📁" };
  const getIcon = f => {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    return FILE_ICONS[ext] || FILE_ICONS.default;
  };
  // Render queue items
  if (queueEl) {
    queueEl.innerHTML = files.map((f, i) =>
      `<div class="upload-queue-item" id="uq-item-${i}">
        <div class="upload-queue-row">
          <span class="upload-queue-icon">${getIcon(f)}</span>
          <span class="upload-queue-name" title="${esc(f.name)}">${esc(f.name)}</span>
          <span class="upload-queue-status pending" id="uq-status-${i}">Pending</span>
        </div>
        <div class="upload-queue-bar"><div class="upload-queue-bar-fill" id="uq-bar-${i}" style="width:0%"></div></div>
      </div>`
    ).join("");
  }
  let anySuccess = false;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const statusEl = document.getElementById(`uq-status-${i}`);
    const barEl = document.getElementById(`uq-bar-${i}`);
    if (statusEl) { statusEl.className = "upload-queue-status processing"; statusEl.textContent = "Processing"; }
    if (barEl) barEl.style.width = "30%";
    try {
      const data = await uploadFileWithFallback(file);
      if (barEl) barEl.style.width = "100%";
      if (data && statusEl) {
        statusEl.className = "upload-queue-status done";
        statusEl.textContent = data.pagesUpdated > 0 ? `✓ ${data.pagesUpdated} pages` : "✓ Done";
        anySuccess = true;
      } else if (!data && statusEl) {
        statusEl.className = "upload-queue-status error";
        statusEl.textContent = "Skipped";
      }
    } catch (err) {
      if (statusEl) { statusEl.className = "upload-queue-status error"; statusEl.textContent = "Error"; }
      if (barEl) barEl.style.width = "0%";
    }
  }
  if (anySuccess) { loadTree(); loadHome(); }
  setTimeout(() => { if (queueEl) queueEl.style.display = "none"; }, 4000);
}

async function uploadFile(file) {
  const buf = await file.arrayBuffer();
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "x-filename": file.name,
      "Content-Type": "application/octet-stream",
    },
    body: buf,
  });
  return await res.json();
}

// UXO-058: Try to read unsupported files as plain text, never crash
const SUPPORTED_EXTS = new Set([
  ".md",".txt",".pdf",".csv",".json",".yaml",".yml",
  ".html",".docx",".xlsx",".pptx",
  ".mp3",".mp4",".wav",".webm",".ogg",
  ".png",".jpg",".jpeg",".gif",".webp"
]);
async function uploadFileWithFallback(file) {
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (SUPPORTED_EXTS.has(ext)) {
    return uploadFile(file);
  }
  // Try reading as plain text
  try {
    const text = await file.text();
    if (!text || !text.trim()) throw new Error("empty");
    const blob = new Blob([text], { type: "text/plain" });
    const fakeName = file.name + ".txt";
    const buf = await blob.arrayBuffer();
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "x-filename": fakeName, "Content-Type": "application/octet-stream" },
      body: buf,
    });
    return await res.json();
  } catch {
    showToast(`Unsupported format: ${file.name}`);
    return null;
  }
}

async function handleTreeDrop(event) {
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  for (const file of files) {
    try {
      const data = await uploadFile(file);
      showToast(`✓ ${file.name}: ${data.pagesUpdated || 0} pages`);
    } catch (err) {
      showToast("Upload failed: " + (err.message || "unknown"));
    }
  }
  loadTree();
  loadHome();
}

async function handlePipeDrop(event) {
  const files = event.dataTransfer?.files;
  if (files?.length) {
    await processBatchUpload(Array.from(files));
    return;
  }
  // Check for dropped URL text
  const text = event.dataTransfer?.getData("text/plain") || event.dataTransfer?.getData("text/uri-list");
  if (text?.trim()) {
    const textarea = document.getElementById("pipe-text-input");
    if (textarea) { textarea.value = text.trim(); ingestRawText(); }
  }
}

// UXO-052: Dropzone click — open file picker (not on links/buttons inside)
function handleDropzoneClick(event) {
  if (event.target.closest("a, button, input")) return;
  document.getElementById("pipe-file-input").click();
}

// UXO-052: Dropzone paste — handle pasted text or files
function handleDropzonePaste(event) {
  event.preventDefault();
  const items = event.clipboardData?.items || [];
  const fileItems = Array.from(items).filter(it => it.kind === "file");
  if (fileItems.length) {
    processBatchUpload(fileItems.map(it => it.getAsFile()).filter(Boolean));
    return;
  }
  const text = event.clipboardData?.getData("text/plain")?.trim();
  if (text) {
    const textarea = document.getElementById("pipe-text-input");
    if (textarea) {
      textarea.value = text;
      textarea.focus();
    }
  }
}

async function ingestRawText() {
  const textarea = document.getElementById("pipe-text-input");
  const text = textarea?.value?.trim();
  if (!text) {
    showToast("Enter some text first");
    return;
  }
  const title =
    await showInputModal("Title for this text", "Untitled Note", "Untitled Note", "Ingest") || "Untitled Note";
  const filename =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + ".md";
  try {
    const content = `# ${title}\n\n${text}`;
    const buf = new TextEncoder().encode(content);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "x-filename": filename,
        "Content-Type": "application/octet-stream",
      },
      body: buf,
    });
    const data = await res.json();
    if (data.status === "ingested") {
      showToast(
        `✓ ${data.pagesUpdated || 0} pages created from "${title}"`,
      );
      textarea.value = "";
      loadTree();
      loadHome();
    } else {
      showToast("Text saved but ingest pending");
    }
  } catch (err) {
    showToast("Failed: " + (err.message || "unknown"));
  }
}

// ── Voice Recording ──
let voiceMediaRecorder = null;
let voiceChunks = [];
let voiceTimerInterval = null;
let voiceStartTime = 0;

async function toggleVoiceRecording() {
  const btn = document.getElementById("voice-record-btn");
  const statusEl = document.getElementById("voice-recording-status");
  if (voiceMediaRecorder && voiceMediaRecorder.state === "recording") {
    voiceMediaRecorder.stop();
    btn.classList.remove("recording");
    statusEl.style.display = "none";
    clearInterval(voiceTimerInterval);
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    voiceChunks = [];
    voiceMediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm",
    });
    voiceMediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) voiceChunks.push(e.data);
    };
    voiceMediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(voiceChunks, { type: "audio/webm" });
      const filename = `voice-${Date.now()}.webm`;
      showToast("Uploading voice recording...");
      try {
        const buf = await blob.arrayBuffer();
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "x-filename": filename,
            "Content-Type": "application/octet-stream",
          },
          body: buf,
        });
        const data = await res.json();
        if (data.status === "ingested") {
          showToast(
            `✓ Voice note: ${data.pagesUpdated || 0} pages created`,
          );
          loadTree();
          loadHome();
        } else {
          showToast("✓ Voice note uploaded");
        }
      } catch (err) {
        showToast("Voice upload failed: " + (err.message || "unknown"));
      }
    };
    voiceMediaRecorder.start(250);
    btn.classList.add("recording");
    statusEl.style.display = "flex";
    voiceStartTime = Date.now();
    voiceTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - voiceStartTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      const timer = document.getElementById("voice-timer");
      if (timer)
        timer.textContent = `${m}:${s.toString().padStart(2, "0")}`;
    }, 500);
  } catch (err) {
    showSweetAlert({
      icon: "🎙️",
      title: "Microphone access denied",
      body: "WikiMem needs microphone access to record voice notes. Please allow it in your browser settings.",
      buttons: [
        { label: "Go to Settings", primary: true, action: () => { closeSweetAlert(); openSettings("sources"); } },
        { label: "Dismiss", action: closeSweetAlert }
      ]
    });
  }
}

// ── Folder Upload ──
async function handleFolderUpload(input) {
  if (!input.files?.length) return;
  const INGESTIBLE = new Set([
    ".md",
    ".txt",
    ".pdf",
    ".csv",
    ".json",
    ".yaml",
    ".yml",
    ".html",
    ".docx",
    ".xlsx",
    ".pptx",
    ".mp3",
    ".mp4",
    ".wav",
    ".png",
    ".jpg",
    ".jpeg",
  ]);
  let uploaded = 0;
  for (const file of input.files) {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!INGESTIBLE.has(ext)) continue;
    try {
      const buf = await file.arrayBuffer();
      await fetch("/api/upload", {
        method: "POST",
        headers: {
          "x-filename": file.webkitRelativePath || file.name,
          "Content-Type": "application/octet-stream",
        },
        body: buf,
      });
      uploaded++;
    } catch {}
  }
  showToast(`✓ Uploaded ${uploaded} files from folder`);
  input.value = "";
  loadTree();
  loadHome();
}

// ── Open Settings to a specific section ──
function openSettings(section) {
  showView("settings");
  // showView triggers loadSettings() which renders the default section;
  // after config loads, switch to the requested section
  const waitForSettings = () => {
    if (document.getElementById("settings-content")) {
      renderSettingsSection(section || "sources");
      // Highlight the matching nav item
      document.querySelectorAll(".settings-nav-item").forEach((el) => {
        el.classList.toggle(
          "active",
          el.dataset.section === (section || "sources"),
        );
      });
    } else {
      requestAnimationFrame(waitForSettings);
    }
  };
  requestAnimationFrame(waitForSettings);
}

// ── OAuth Connect ──
async function startOAuthConnect(provider) {
  try {
    const res = await fetch(
      "/api/auth/start/" + encodeURIComponent(provider),
    );
    const data = await res.json();
    if (data.error === "no_credentials") {
      // GitHub: try device flow (no client_secret needed — just needs client_id)
      if (provider === "github") {
        showPipelineDeviceFlow();
        return;
      }
      // Show inline credential setup modal — don't redirect to Settings
      showCredentialSetupModal(provider);
      return;
    }
    if (data.error) {
      showToast("OAuth: " + (data.message || data.error));
      return;
    }
    if (data.url) {
      const popup = window.open(
        data.url,
        "_blank",
        "width=600,height=700",
      );
      // Poll for completion — when the popup closes, refresh status
      if (popup) {
        const poll = setInterval(() => {
          if (popup.closed) {
            clearInterval(poll);
            loadOAuthStatus();
            renderOAuthIntegrations();
          }
        }, 1000);
      }
    }
  } catch (err) {
    showToast("OAuth failed: " + (err.message || "unknown"));
  }
}

// Listen for OAuth completion postMessage from callback popup
window.addEventListener("message", function (event) {
  if (
    event.data &&
    event.data.type === "wikimem-oauth-connected" &&
    event.data.provider
  ) {
    showToast(
      event.data.provider.charAt(0).toUpperCase() +
        event.data.provider.slice(1) +
        " connected — syncing data...",
    );
    loadOAuthStatus();
    renderOAuthIntegrations();
    renderHomeConnectors();
    loadSidebarConnectors();
    syncOAuthProvider(event.data.provider);
  }
});

// Pipeline-page device flow modal for GitHub (no client_secret needed)
async function showPipelineDeviceFlow() {
  // Create modal overlay
  let modal = document.getElementById("device-flow-modal");
  if (modal) modal.remove();
  modal = document.createElement("div");
  modal.id = "device-flow-modal";
  modal.style.cssText =
    "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)";
  modal.innerHTML = `<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.4)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <h3 style="margin:0;font-size:15px;color:var(--text-bright)">Connect GitHub</h3>
    <button onclick="document.getElementById('device-flow-modal').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">&times;</button>
  </div>
  <p style="color:var(--text-secondary);font-size:12px;margin:0 0 16px">No app registration needed — uses GitHub Device Flow.</p>
  <div id="pipeline-device-flow-content" style="text-align:center;padding:8px 0">
    <div class="device-flow-spinner" style="margin:0 auto"></div>
    <div style="margin-top:8px;color:var(--text-muted);font-size:12px">Starting device flow...</div>
  </div>
</div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.remove();
  });

  // Start device flow
  try {
    const res = await fetch("/api/auth/device-flow/start", {
      method: "POST",
    });
    const data = await res.json();
    const content = document.getElementById(
      "pipeline-device-flow-content",
    );
    if (!content) return;

    if (data.error === "no_client_id") {
      content.innerHTML = `<div style="text-align:left">
      <p style="color:var(--text-secondary);font-size:12px;margin:0 0 12px">Device flow requires a GitHub OAuth App client ID. Set the env var or enter credentials:</p>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input class="settings-input" id="pipeline-gh-id" type="text" placeholder="GitHub Client ID" style="width:100%;box-sizing:border-box" />
        <input class="settings-input" id="pipeline-gh-secret" type="password" placeholder="GitHub Client Secret" style="width:100%;box-sizing:border-box" />
        <button class="settings-btn settings-btn-primary" onclick="savePipelineGitHubCreds()" style="font-size:12px;padding:6px 16px;align-self:flex-end">Save & Connect</button>
      </div>
    </div>`;
      return;
    }

    if (data.error) {
      content.innerHTML =
        '<div style="color:var(--red);font-size:12px">' +
        (data.message || data.error) +
        "</div>";
      return;
    }

    // Show device code
    content.innerHTML = `<div style="text-align:left">
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
      1. Go to <a href="${data.verification_uri}" target="_blank" style="color:var(--accent)">${data.verification_uri}</a><br/>
      2. Enter this code:
    </div>
    <div style="font-size:28px;font-weight:700;letter-spacing:4px;text-align:center;padding:12px;background:var(--bg-secondary);border-radius:8px;color:var(--text-bright);font-family:monospace;margin-bottom:8px">${data.user_code}</div>
    <div style="text-align:center;margin-bottom:12px">
      <button class="settings-btn" onclick="navigator.clipboard.writeText('${data.user_code}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Code',1500)" style="font-size:11px;padding:4px 12px">Copy Code</button>
    </div>
    <div id="pipeline-device-status" style="text-align:center;font-size:12px;color:var(--text-muted)">
      <span class="device-flow-spinner" style="display:inline-block;width:12px;height:12px;border-width:2px;vertical-align:middle;margin-right:6px"></span>
      Waiting for authorization...
    </div>
  </div>`;

    // Poll for completion
    pollPipelineDeviceFlow(data.device_code, data.interval || 5);
  } catch (err) {
    const content = document.getElementById(
      "pipeline-device-flow-content",
    );
    if (content)
      content.innerHTML =
        '<div style="color:var(--red);font-size:12px">Failed to start: ' +
        (err.message || "unknown") +
        "</div>";
  }
}

function pollPipelineDeviceFlow(deviceCode, interval) {
  const pollMs = Math.max((interval || 5) * 1000, 5000);
  const timer = setInterval(async () => {
    try {
      const res = await fetch("/api/auth/device-flow/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode }),
      });
      const data = await res.json();
      const statusEl = document.getElementById("pipeline-device-status");

      if (data.status === "complete") {
        clearInterval(timer);
        if (statusEl)
          statusEl.innerHTML =
            '<span style="color:var(--green);font-weight:600">Connected! Syncing your data...</span>';
        showToast("GitHub connected — syncing data...");
        loadOAuthStatus();
        syncOAuthProvider("github");
        // Close modal after brief delay
        setTimeout(() => {
          const m = document.getElementById("device-flow-modal");
          if (m) m.remove();
        }, 2500);
      } else if (data.status === "expired") {
        clearInterval(timer);
        if (statusEl)
          statusEl.innerHTML =
            '<span style="color:var(--red)">Code expired. </span><a href="#" onclick="event.preventDefault();document.getElementById(\'device-flow-modal\').remove();showPipelineDeviceFlow()" style="color:var(--accent)">Try again</a>';
      }
    } catch {
      /* network error — keep trying */
    }
  }, pollMs);
}

async function savePipelineGitHubCreds() {
  const idInput = document.getElementById("pipeline-gh-id");
  const secretInput = document.getElementById("pipeline-gh-secret");
  if (!idInput || !secretInput) return;
  const clientId = idInput.value.trim();
  const clientSecret = secretInput.value.trim();
  if (!clientId || !clientSecret) {
    showToast("Enter both Client ID and Secret");
    return;
  }
  try {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        github_client_id: clientId,
        github_client_secret: clientSecret,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast("GitHub credentials saved — connecting...");
    const modal = document.getElementById("device-flow-modal");
    if (modal) modal.remove();
    startOAuthConnect("github");
  } catch (err) {
    showToast("Save failed: " + (err.message || "unknown"));
  }
}

// ── Credential Setup Modal (shown when user clicks Connect but no credentials exist) ──
function showCredentialSetupModal(provider) {
  const meta = OAUTH_PROVIDER_META[provider];
  if (!meta) return;
  const port = location.port || "3456";
  const callbackUrl = `http://localhost:${port}/api/auth/callback`;
  const stepsHtml = meta.steps
    .map(
      (s) =>
        `<li>${s.replace(/CALLBACK/g, '<code style="font-size:11px;color:var(--accent)">' + esc(callbackUrl) + "</code>").replace(/PORT/g, port)}</li>`,
    )
    .join("");

  let modal = document.getElementById("cred-setup-modal");
  if (modal) modal.remove();
  modal = document.createElement("div");
  modal.id = "cred-setup-modal";
  modal.style.cssText =
    "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)";
  modal.innerHTML = `<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:12px;padding:24px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.4);max-height:80vh;overflow-y:auto">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <h3 style="margin:0;font-size:15px;color:var(--text-bright)">Connect ${meta.name}</h3>
    <button onclick="document.getElementById('cred-setup-modal').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">&times;</button>
  </div>
  <p style="color:var(--text-secondary);font-size:12px;margin:0 0 16px;line-height:1.5">
    Enter your ${meta.name} OAuth credentials to connect. You can set them as environment variables or enter them below.
  </p>
  <div style="background:var(--bg-surface);border-radius:8px;padding:12px;margin-bottom:16px">
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Environment variables</div>
    <code style="font-size:11px;color:var(--accent);word-break:break-all">WIKIMEM_${provider.toUpperCase()}_CLIENT_ID</code><br/>
    <code style="font-size:11px;color:var(--accent);word-break:break-all">WIKIMEM_${provider.toUpperCase()}_CLIENT_SECRET</code>
  </div>
  <details style="margin-bottom:16px">
    <summary style="font-size:12px;color:var(--text-muted);cursor:pointer;font-weight:500">How to register a ${meta.name} OAuth app</summary>
    <ol class="oauth-setup-steps" style="margin-top:8px">${stepsHtml}</ol>
  </details>
  <div style="display:flex;flex-direction:column;gap:8px">
    <input class="settings-input" id="cred-modal-id" type="text" placeholder="Client ID" style="width:100%;box-sizing:border-box" />
    <input class="settings-input" id="cred-modal-secret" type="password" placeholder="Client Secret" style="width:100%;box-sizing:border-box" />
    <button class="settings-btn settings-btn-primary" onclick="saveCredModalAndConnect('${provider}')" style="font-size:12px;padding:8px 16px;align-self:flex-end">Save & Connect</button>
  </div>
</div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) modal.remove();
  });
}

async function saveCredModalAndConnect(provider) {
  const meta = OAUTH_PROVIDER_META[provider];
  const idInput = document.getElementById("cred-modal-id");
  const secretInput = document.getElementById("cred-modal-secret");
  if (!idInput || !secretInput) return;
  const clientId = idInput.value.trim();
  const clientSecret = secretInput.value.trim();
  if (!clientId || !clientSecret) {
    showToast("Enter both Client ID and Secret");
    return;
  }
  try {
    const body = {};
    body[meta.idKey] = clientId;
    body[meta.secretKey] = clientSecret;
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    showToast(`${meta.name} credentials saved — connecting...`);
    const modal = document.getElementById("cred-setup-modal");
    if (modal) modal.remove();
    startOAuthConnect(provider);
  } catch (err) {
    showToast("Save failed: " + (err.message || "unknown"));
  }
}

async function loadOAuthStatus() {
  try {
    const data = await fetch("/api/auth/tokens").then((r) => r.json());
    for (const [provider, info] of Object.entries(data)) {
      const badge = document.getElementById("oauth-badge-" + provider);
      if (!badge) continue;
      if (info.connected) {
        badge.innerHTML =
          '<span class="connected-badge">Connected</span>';
      } else if (info.hasCredentials || info.hasDeviceFlow) {
        badge.innerHTML =
          '<button class="connect-btn" onclick="event.stopPropagation();startOAuthConnect(\'' +
          provider +
          "')\">Connect</button>";
      } else {
        badge.innerHTML =
          '<button class="connect-btn" onclick="event.stopPropagation();startOAuthConnect(\'' +
          provider +
          "')\">Connect</button>";
      }
    }
    // Gmail mirrors google token
    const gmailBadge = document.getElementById("oauth-badge-gmail");
    if (gmailBadge && data.google) {
      if (data.google.connected) {
        gmailBadge.innerHTML =
          '<span class="connected-badge">Connected</span>';
      } else {
        gmailBadge.innerHTML =
          '<button class="connect-btn" onclick="event.stopPropagation();startOAuthConnect(\'google\')">Connect</button>';
      }
    }
  } catch {}
}

async function renderHomeConnectors() {
  const container = document.getElementById("home-oauth-cards");
  if (!container) return;
  const providers = ["github", "slack", "google", "linear", "jira"];
  let tokenData = {};
  try {
    tokenData = await fetch("/api/auth/tokens").then((r) => r.json());
  } catch {}
  container.innerHTML = providers
    .map((p) => {
      const meta = OAUTH_PROVIDER_META[p];
      if (!meta) return "";
      const info = tokenData[p] || {};
      const connected = !!info.connected;
      const btnHtml = connected
        ? '<span style="font-size:10px;color:#34d399;font-weight:600">Connected</span>'
        : `<button class="connect-btn" onclick="event.stopPropagation();startOAuthConnect('${p}')" style="font-size:10px;padding:2px 8px">Connect</button>`;
      return `<div style="display:flex;align-items:center;gap:8px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;padding:8px 12px;min-width:140px;cursor:pointer" onclick="showView('settings');setTimeout(()=>{const t=document.querySelector('.settings-nav-item[data-section=sources]');if(t)t.click()},100)">
    <span style="color:var(--text-secondary);flex-shrink:0">${meta.icon}</span>
    <span style="font-size:12px;color:var(--text-bright);font-weight:500;flex:1">${meta.name}</span>
    ${btnHtml}
  </div>`;
    })
    .join("");
}

// ── OAuth Setup Wizard ──
const OAUTH_PROVIDER_META = {
  github: {
    name: "GitHub",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
    desc: "Repos, issues, PRs, and starred projects",
    idKey: "github_client_id",
    secretKey: "github_client_secret",
    steps: [
      'Go to <a href="https://github.com/settings/developers" target="_blank" style="color:var(--accent)">GitHub → Settings → Developer Settings → OAuth Apps</a>',
      "Click <strong>New OAuth App</strong>",
      "Set <strong>Homepage URL</strong> to <code>http://localhost:PORT</code>",
      "Set <strong>Authorization callback URL</strong> to <code>CALLBACK</code>",
      "Copy the <strong>Client ID</strong> and generate a <strong>Client Secret</strong>",
      "Paste both values below and click <strong>Save Credentials</strong>",
    ],
  },
  slack: {
    name: "Slack",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.164 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.164 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.164 24a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.314A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.521h-6.314z"/></svg>',
    desc: "Channels, messages, and threads",
    idKey: "slack_client_id",
    secretKey: "slack_client_secret",
    steps: [
      'Go to <a href="https://api.slack.com/apps" target="_blank" style="color:var(--accent)">api.slack.com/apps</a> and click <strong>Create New App → From scratch</strong>',
      'Name it (e.g. "WikiMem") and select your workspace',
      "Go to <strong>OAuth & Permissions</strong> → add <code>channels:history</code>, <code>channels:read</code>, <code>users:read</code> scopes",
      "Under <strong>Redirect URLs</strong>, add <code>CALLBACK</code>",
      "Go to <strong>Basic Information</strong> → copy <strong>Client ID</strong> and <strong>Client Secret</strong>",
      "Paste both values below and click <strong>Save Credentials</strong>",
    ],
  },
  google: {
    name: "Google",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
    desc: "Gmail messages and Google Drive files",
    idKey: "google_client_id",
    secretKey: "google_client_secret",
    steps: [
      'Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--accent)">Google Cloud Console → Credentials</a>',
      "Click <strong>Create Credentials → OAuth client ID</strong> (create consent screen first if prompted)",
      "Application type: <strong>Web application</strong>",
      "Add <code>CALLBACK</code> under <strong>Authorized redirect URIs</strong>",
      "Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>",
      "Enable <strong>Gmail API</strong> and <strong>Google Drive API</strong> in the API Library",
      "Paste both values below and click <strong>Save Credentials</strong>",
    ],
  },
  linear: {
    name: "Linear",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#635BFF"><path d="M2.513 12.833l8.654 8.654a10.478 10.478 0 0 1-8.654-8.654zm-.362-2.584a10.478 10.478 0 0 1 3.388-5.725l10.937 10.937a10.478 10.478 0 0 1-5.725 3.388L2.151 10.249zm4.858-6.707a10.478 10.478 0 0 1 3.624-1.391l10.216 10.216a10.48 10.48 0 0 1-1.391 3.624L7.009 3.542zm5.088-1.735a10.478 10.478 0 0 1 4.37.117l6.571 6.571a10.478 10.478 0 0 1 .117 4.37L12.097 1.807zm5.845.904a10.444 10.444 0 0 1 3.37 2.924l-1.237-1.237.092-.092a10.478 10.478 0 0 0-2.924-2.294l.699.699z"/></svg>',
    desc: "Issues, projects, and team activity",
    idKey: "linear_client_id",
    secretKey: "linear_client_secret",
    steps: [
      'Go to <a href="https://linear.app/settings/api" target="_blank" style="color:var(--accent)">Linear → Settings → API → OAuth Applications</a>',
      "Click <strong>Create new</strong>",
      "Set <strong>Callback URL</strong> to <code>CALLBACK</code>",
      "Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>",
      "Paste both values below and click <strong>Save Credentials</strong>",
    ],
  },
  jira: {
    name: "Jira",
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#0052CC"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.593 24V12.518a1.005 1.005 0 0 0-1.022-1.005zM6.348 6.294H17.87a5.218 5.218 0 0 1-5.231 5.214h-2.13V13.565A5.215 5.215 0 0 1 5.277 8.35V6.294h1.071zM12.798.042H1.276a5.218 5.218 0 0 0 5.232 5.214h2.13V7.313a5.215 5.215 0 0 0 5.231 5.215V1.047A1.005 1.005 0 0 0 12.798.042z"/></svg>',
    desc: "Issues, boards, and project tracking",
    idKey: "jira_client_id",
    secretKey: "jira_client_secret",
    steps: [
      'Go to <a href="https://developer.atlassian.com/console/myapps/" target="_blank" style="color:var(--accent)">Atlassian Developer Console</a>',
      "Click <strong>Create → OAuth 2.0 integration</strong>",
      "Under <strong>Authorization</strong>, add callback URL: <code>CALLBACK</code>",
      "Add scopes: <code>read:jira-work</code>, <code>read:jira-user</code>, <code>offline_access</code>",
      "Copy the <strong>Client ID</strong> and <strong>Secret</strong>",
      "Paste both values below and click <strong>Save Credentials</strong>",
    ],
  },
};

// ── Active device flow polling state ──
let _deviceFlowPollTimer = null;

async function renderOAuthIntegrations() {
  const container = document.getElementById("oauth-integrations");
  if (!container) return;
  const port = location.port || "3456";
  const callbackUrl = `http://localhost:${port}/api/auth/callback`;

  let tokenStatus = {};
  let configData = {};
  try {
    [tokenStatus, configData] = await Promise.all([
      fetch("/api/auth/tokens").then((r) => r.json()),
      fetch("/api/config").then((r) => r.json()),
    ]);
  } catch {
    container.innerHTML =
      '<div style="color:var(--red);font-size:13px;padding:16px 0">Failed to load integration status</div>';
    return;
  }

  let cards = "";
  for (const [provider, meta] of Object.entries(OAUTH_PROVIDER_META)) {
    const token = tokenStatus[provider];
    const isConnected = token?.connected;
    const hasCredentials = !!token?.hasCredentials;

    // Badge (only shown when connected or has credentials)
    let badgeHtml = "";
    if (isConnected)
      badgeHtml =
        '<span class="oauth-card-badge connected">Connected</span>';
    else if (hasCredentials)
      badgeHtml = '<span class="oauth-card-badge ready">Ready</span>';

    // Action area
    let actionHtml = "";
    if (isConnected) {
      const connDate = token.connectedAt
        ? new Date(token.connectedAt).toLocaleDateString()
        : "";
      actionHtml = `
      <div class="oauth-connected-meta">Connected ${connDate}</div>
      <div class="oauth-card-actions">
        <button class="oauth-connect-btn secondary" onclick="syncOAuthProvider('${provider}')">Sync Now</button>
        <button class="oauth-connect-btn danger" onclick="disconnectOAuth('${provider}')">Disconnect</button>
      </div>`;
    } else if (hasCredentials) {
      actionHtml = `
      <div class="oauth-card-actions">
        <button class="oauth-connect-btn primary" onclick="startOAuthConnect('${provider}')">Connect</button>
      </div>`;
    } else if (provider === "github") {
      // GitHub: one-click Device Flow (no credentials needed)
      actionHtml = `
      <div class="oauth-card-actions">
        <button class="oauth-connect-btn primary" id="gh-device-btn" onclick="startGitHubDeviceFlow()">Connect with GitHub</button>
      </div>
      <div id="gh-device-flow-ui"></div>`;
    } else {
      // Other providers without credentials: show Connect button (credentials resolved at connect time)
      actionHtml = `
      <div class="oauth-card-actions">
        <button class="oauth-connect-btn primary" onclick="startOAuthConnect('${provider}')" id="oauth-connect-${provider}">Connect</button>
      </div>`;
    }

    // Advanced setup (collapsible, for non-connected providers without credentials)
    let advancedHtml = "";
    if (!isConnected && !hasCredentials && provider !== "github") {
      const stepsHtml = meta.steps
        .map(
          (s) =>
            `<li>${s.replace(/CALLBACK/g, "<code>" + esc(callbackUrl) + "</code>").replace(/PORT/g, port)}</li>`,
        )
        .join("");
      const hasId = !!configData[meta.idKey];
      const hasSecret = !!configData[meta.secretKey];
      advancedHtml = `
      <div class="oauth-advanced-body" id="oauth-adv-${provider}">
        <ol class="oauth-setup-steps">${stepsHtml}</ol>
        <div class="oauth-input-row">
          <input class="settings-input" id="oauth-id-${provider}" type="text" placeholder="Client ID" value="${hasId ? "••••••••" : ""}" ${hasId ? 'data-saved="true"' : ""} onfocus="if(this.dataset.saved){this.value='';this.dataset.saved=''}" />
          <input class="settings-input" id="oauth-secret-${provider}" type="password" placeholder="Client Secret" value="${hasSecret ? "••••••••" : ""}" ${hasSecret ? 'data-saved="true"' : ""} onfocus="if(this.dataset.saved){this.value='';this.dataset.saved=''}" />
        </div>
        <div class="oauth-actions">
          <button class="settings-btn settings-btn-primary" onclick="saveOAuthCredentials('${provider}')" style="font-size:12px;padding:5px 14px">Save & Connect</button>
          <span class="settings-status" id="oauth-save-status-${provider}"></span>
        </div>
      </div>`;
    }

    cards += `<div class="oauth-card${isConnected ? " oauth-connected" : ""}" id="oauth-card-${provider}">
    <div class="oauth-card-top">
      <div class="oauth-card-icon ${provider}">${meta.icon}</div>
      <div class="oauth-card-info">
        <div class="oauth-card-name">${meta.name}</div>
        <div class="oauth-card-desc">${meta.desc}</div>
      </div>
      ${badgeHtml}
    </div>
    ${actionHtml}
    ${advancedHtml}
  </div>`;
  }
  container.innerHTML = `<div class="oauth-grid">${cards}</div>`;
}

function toggleAdvancedSetup(provider) {
  const body = document.getElementById("oauth-adv-" + provider);
  if (!body) return;
  body.classList.toggle("open");
}

// ── GitHub Device Flow ──
async function startGitHubDeviceFlow() {
  const btn = document.getElementById("gh-device-btn");
  const ui = document.getElementById("gh-device-flow-ui");
  if (!ui) return;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Starting...";
  }

  try {
    const res = await fetch("/api/auth/device-flow/start", {
      method: "POST",
    });
    const data = await res.json();

    if (data.error === "no_client_id") {
      // No device client ID configured — fall back to credential setup
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Connect with GitHub";
      }
      ui.innerHTML = `<div class="oauth-info-tip" style="margin-top:4px">
      Device flow requires a GitHub OAuth App client ID.<br/>
      Set <code style="font-size:10px;color:var(--accent)">WIKIMEM_GITHUB_CLIENT_ID</code> env var, or <a href="https://github.com/settings/developers" target="_blank">create an OAuth App</a> and enter credentials below.
    </div>
    <div class="oauth-advanced-body open" style="padding-top:8px">
      <div class="oauth-input-row">
        <input class="settings-input" id="oauth-id-github" type="text" placeholder="Client ID" />
        <input class="settings-input" id="oauth-secret-github" type="password" placeholder="Client Secret" />
      </div>
      <div class="oauth-actions">
        <button class="settings-btn settings-btn-primary" onclick="saveOAuthCredentials('github')" style="font-size:12px;padding:5px 14px">Save & Connect</button>
        <span class="settings-status" id="oauth-save-status-github"></span>
      </div>
    </div>`;
      return;
    }

    if (data.error) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Connect with GitHub";
      }
      showToast("Device flow error: " + (data.message || data.error));
      return;
    }

    // Show the device code UI
    if (btn) btn.style.display = "none";
    ui.innerHTML = `<div class="device-flow-box">
    <div class="device-flow-steps">
      1. Go to <a href="${data.verification_uri}" target="_blank">${data.verification_uri}</a><br/>
      2. Enter this code:
    </div>
    <div class="device-flow-code">${data.user_code}</div>
    <div style="margin-top:4px">
      <button class="oauth-connect-btn secondary" style="flex:0;padding:5px 14px;font-size:11px" onclick="navigator.clipboard.writeText('${data.user_code}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy Code',1500)">Copy Code</button>
    </div>
    <div class="device-flow-status" id="gh-device-status">
      <span class="device-flow-spinner"></span>
      Waiting for authorization...
    </div>
  </div>`;

    // Start polling
    pollGitHubDeviceFlow(data.device_code, data.interval || 5);
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Connect with GitHub";
    }
    showToast("Device flow failed: " + (err.message || "unknown"));
  }
}

function pollGitHubDeviceFlow(deviceCode, interval) {
  if (_deviceFlowPollTimer) clearInterval(_deviceFlowPollTimer);
  const pollMs = Math.max((interval || 5) * 1000, 5000);

  _deviceFlowPollTimer = setInterval(async () => {
    try {
      const res = await fetch("/api/auth/device-flow/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode }),
      });
      const data = await res.json();
      const statusEl = document.getElementById("gh-device-status");

      if (data.status === "complete") {
        clearInterval(_deviceFlowPollTimer);
        _deviceFlowPollTimer = null;
        if (statusEl)
          statusEl.innerHTML =
            '<span style="color:var(--green);font-weight:600">Connected! Syncing...</span>';
        showToast("GitHub connected — syncing data...");
        setTimeout(() => renderOAuthIntegrations(), 1000);
        loadOAuthStatus();
        syncOAuthProvider("github");
      } else if (data.status === "expired") {
        clearInterval(_deviceFlowPollTimer);
        _deviceFlowPollTimer = null;
        if (statusEl)
          statusEl.innerHTML =
            '<span style="color:var(--red)">Code expired. </span><a href="#" onclick="event.preventDefault();startGitHubDeviceFlow()" style="color:var(--accent)">Try again</a>';
      } else if (data.status === "slow_down") {
        // GitHub asked us to slow down — we'll just wait for next interval
      }
      // 'pending' — keep polling
    } catch {
      // Network error — keep trying
    }
  }, pollMs);
}

async function saveOAuthCredentials(provider) {
  const meta = OAUTH_PROVIDER_META[provider];
  if (!meta) return;
  const idInput = document.getElementById("oauth-id-" + provider);
  const secretInput = document.getElementById("oauth-secret-" + provider);
  const statusEl = document.getElementById(
    "oauth-save-status-" + provider,
  );
  if (!idInput || !secretInput) return;

  const clientId = idInput.value.trim();
  const clientSecret = secretInput.value.trim();

  if (idInput.dataset.saved && !clientId) {
    showToast("Client ID is empty — clear field and enter new value");
    return;
  }
  if (secretInput.dataset.saved && !clientSecret) {
    showToast("Client Secret is empty — clear field and enter new value");
    return;
  }

  const updates = {};
  if (clientId && clientId !== "••••••••") updates[meta.idKey] = clientId;
  if (clientSecret && clientSecret !== "••••••••")
    updates[meta.secretKey] = clientSecret;

  if (Object.keys(updates).length === 0) {
    showToast("Enter Client ID and Secret first");
    return;
  }

  if (statusEl) {
    statusEl.textContent = "Saving…";
    statusEl.style.color = "var(--text-muted)";
  }

  try {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (statusEl) {
      statusEl.textContent = "Saved";
      statusEl.style.color = "var(--green)";
    }
    showToast(`${meta.name} credentials saved`);
    setTimeout(() => renderOAuthIntegrations(), 800);
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = "Failed: " + (err.message || "unknown");
      statusEl.style.color = "var(--red)";
    }
  }
}

async function disconnectOAuth(provider) {
  const meta = OAUTH_PROVIDER_META[provider];
  try {
    await fetch("/api/auth/tokens/" + encodeURIComponent(provider), {
      method: "DELETE",
    });
    showToast(`${meta?.name || provider} disconnected`);
    renderOAuthIntegrations();
  } catch (err) {
    showToast("Disconnect failed: " + (err.message || "unknown"));
  }
}

async function syncOAuthProvider(provider) {
  const meta = OAUTH_PROVIDER_META[provider];
  showToast(`Syncing ${meta?.name || provider}…`);
  try {
    const res = await fetch("/api/sync/" + encodeURIComponent(provider), {
      method: "POST",
    });
    const data = await res.json();
    if (data.error || data.errors?.length) {
      showToast(`Sync error: ${data.errors?.[0] || data.error}`);
    } else {
      showToast(
        `✓ ${meta?.name || provider}: ${data.filesWritten || 0} files synced in ${((data.duration || 0) / 1000).toFixed(1)}s`,
      );
      loadTree();
    }
  } catch (err) {
    showToast("Sync failed: " + (err.message || "unknown"));
  }
}

function showStageDetail(stepId) {
  const step = PIPELINE_STEPS.find((s) => s.id === stepId);
  const event = currentPipelineSteps[stepId];
  if (!step) return;
  const container = document.getElementById("pipe-stage-detail");
  if (!container) return;
  const statusLabel =
    event?.status === "done"
      ? "✓ Complete"
      : event?.status === "running"
        ? "⟳ Running..."
        : event?.status === "error"
          ? "✗ Error"
          : "○ Pending";
  const statusColor =
    event?.status === "done"
      ? "var(--green)"
      : event?.status === "running"
        ? "var(--accent)"
        : event?.status === "error"
          ? "var(--red)"
          : "var(--text-muted)";
  container.innerHTML = `<div class="stage-detail">
  <div class="sd-header">
    <div class="sd-title"><span>${step.icon}</span> ${step.label} <span style="font-size:11px;font-weight:400;color:${statusColor}">${statusLabel}</span></div>
    <button class="sd-close" onclick="document.getElementById('pipe-stage-detail').innerHTML=''">×</button>
  </div>
  ${event?.detail ? `<div class="sd-desc">${esc(event.detail)}</div>` : ""}
</div>`;
}

async function showRunDetail(runId) {
  const container = document.getElementById("run-detail-" + runId);
  if (!container) return;
  if (container.style.display !== "none") {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";
  container.innerHTML =
    '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:12px"><div class="spinner" style="margin:0 auto 8px"></div>Loading AI analysis...</div>';
  try {
    const run = await api(`/api/pipeline/runs/${runId}`);
    let html =
      '<div style="padding:12px 0;border-top:1px solid var(--border-subtle);animation:pipeSlideIn .3s ease">';

    if (run.summary) {
      const s = run.summary;
      html += `<div style="background:rgba(79,158,255,0.04);border:1px solid rgba(79,158,255,0.12);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:16px">🤖</span>
        <span style="font-size:13px;font-weight:600;color:var(--text-bright)">AI Analysis</span>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:var(--text-secondary);line-height:1.6">${esc(s.whatHappened)}</p>`;

      if (s.entitiesFound?.length) {
        html += `<div style="margin-bottom:8px">
        <span style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.3px">Entities Found</span>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">${s.entitiesFound
          .map(
            (e) =>
              `<span style="font-size:11px;padding:3px 9px;border-radius:6px;background:var(--green-dim);color:var(--green)">${esc(e)}</span>`,
          )
          .join("")}</div>
      </div>`;
      }

      if (s.conceptsFound?.length) {
        html += `<div style="margin-bottom:8px">
        <span style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.3px">Concepts</span>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">${s.conceptsFound
          .map(
            (c) =>
              `<span style="font-size:11px;padding:3px 9px;border-radius:6px;background:var(--purple-dim);color:var(--purple)">${esc(c)}</span>`,
          )
          .join("")}</div>
      </div>`;
      }

      if (s.pagesCreated?.length) {
        html += `<div style="margin-bottom:8px">
        <span style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.3px">Pages Created</span>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">${s.pagesCreated
          .map(
            (p) =>
              `<span style="font-size:11px;padding:3px 9px;border-radius:6px;background:var(--accent-dim);color:var(--accent);cursor:pointer" onclick="openPage('${esc(p)}')">${esc(p)}</span>`,
          )
          .join("")}</div>
      </div>`;
      }

      if (s.decisionsExplained) {
        html += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(79,158,255,0.1)">
        <span style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.3px">Reasoning</span>
        <p style="margin:4px 0 0;font-size:12px;color:var(--text-secondary);line-height:1.6">${esc(s.decisionsExplained)}</p>
      </div>`;
      }
      html += `</div>`;
    }

    if (run.events?.length) {
      html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${run.events
        .map((e) => {
          const icon =
            e.status === "done"
              ? "✓"
              : e.status === "error"
                ? "✗"
                : e.status === "skipped"
                  ? "–"
                  : "⋯";
          const color =
            e.status === "done"
              ? "var(--green)"
              : e.status === "error"
                ? "var(--red)"
                : "var(--text-muted)";
          return `<span style="color:${color};font-size:10px;padding:2px 6px;background:var(--bg-surface);border-radius:4px" title="${esc(e.detail || "")}">${icon} ${e.step}</span>`;
        })
        .join("")}</div>`;
    }

    if (run.llmTrace) {
      const t = run.llmTrace;
      html += `<details style="margin-top:8px">
      <summary style="cursor:pointer;font-size:11px;color:var(--text-muted);padding:4px 0;user-select:none">
        🔬 LLM Trace ${t.durationMs ? `· ${(t.durationMs / 1000).toFixed(1)}s` : ""} ${t.model ? `· ${t.model}` : ""}
      </summary>
      <div style="background:var(--bg-surface);border-radius:6px;padding:10px;margin-top:6px">
        ${t.systemPrompt ? `<div style="margin-bottom:8px"><div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:3px">System Prompt</div><pre style="font-size:11px;font-family:var(--font-mono);background:var(--bg);padding:8px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;max-height:120px;overflow-y:auto;margin:0;color:var(--text-secondary)">${esc(t.systemPrompt)}</pre></div>` : ""}
        ${t.userPrompt ? `<div style="margin-bottom:8px"><div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:3px">User Prompt</div><pre style="font-size:11px;font-family:var(--font-mono);background:var(--bg);padding:8px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;max-height:120px;overflow-y:auto;margin:0;color:var(--text-secondary)">${esc((t.userPrompt || "").substring(0, 800))}${(t.userPrompt || "").length > 800 ? "…" : ""}</pre></div>` : ""}
        ${t.response ? `<div><div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:3px">Response</div><pre style="font-size:11px;font-family:var(--font-mono);background:var(--bg);padding:8px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;max-height:160px;overflow-y:auto;margin:0;color:var(--text-secondary)">${esc((t.response || "").substring(0, 1200))}${(t.response || "").length > 1200 ? "…" : ""}</pre></div>` : ""}
      </div>
    </details>`;
    }

    html += "</div>";
    container.innerHTML =
      html ||
      '<p style="color:var(--text-muted);font-size:12px;padding:8px 0">No details available for this run.</p>';
  } catch {
    container.innerHTML =
      '<p style="color:var(--red);font-size:12px;padding:8px 0">Failed to load run details.</p>';
  }
}

function formatTimeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function railHistoryClick() {
  if (state.activeTabId === VIEW_TABS.history.id) {
    closeTab(VIEW_TABS.history.id);
  } else {
    openViewTab("history");
  }
}

// ── Time-Lapse ──
const tlState = {
  commits: [],
  currentIdx: 0,
  playing: false,
  interval: null,
  mode: "tree",
  treeCache: {},
  graphCache: {},
  _graphNodePos: {},
  _tlGraphSim: null,
  _treeHasRendered: false,
  _lastDirSignature: null,
  _tlGraphLastHash: null,
  _tlSliderRaf: null,
  _tlSliderPendingIdx: null,
  _tlPlayRaf: null,
  _tlDragging: false,
  _tlRenderDebounce: null,
  _tlJustScrubbed: false,
};

function railTimelapseClick() {
  if (state.activeTabId === VIEW_TABS.timelapse.id) {
    closeTab(VIEW_TABS.timelapse.id);
  } else {
    openViewTab("timelapse");
  }
}

// ── UXO-040: Connectors view ──

const CONNECTOR_CATALOG = [
  // Communication
  { id: "slack",    name: "Slack",          category: "communication", color: "#4A154B", oauthKey: "slack" },
  { id: "discord",  name: "Discord",        category: "communication", color: "#5865F2" },
  { id: "teams",    name: "Microsoft Teams", category: "communication", color: "#6264A7" },
  { id: "telegram", name: "Telegram",       category: "communication", color: "#2CA5E0" },
  { id: "gmail",    name: "Gmail",          category: "communication", color: "#EA4335", oauthKey: "google" },
  { id: "outlook",  name: "Outlook",        category: "communication", color: "#0072C6" },
  // Development
  { id: "github",   name: "GitHub",         category: "development",   color: "#24292F", oauthKey: "github" },
  { id: "gitlab",   name: "GitLab",         category: "development",   color: "#FC6D26" },
  { id: "jira",     name: "Jira",           category: "development",   color: "#0052CC", oauthKey: "jira" },
  { id: "linear",   name: "Linear",         category: "development",   color: "#5E6AD2", oauthKey: "linear" },
  { id: "notion",   name: "Notion",         category: "development",   color: "#000000" },
  { id: "sentry",   name: "Sentry",         category: "development",   color: "#F55247" },
  // Cloud
  { id: "gdrive",   name: "Google Drive",   category: "cloud",         color: "#4285F4", oauthKey: "google" },
  { id: "dropbox",  name: "Dropbox",        category: "cloud",         color: "#0061FF" },
  { id: "onedrive", name: "OneDrive",       category: "cloud",         color: "#0078D4" },
  { id: "box",      name: "Box",            category: "cloud",         color: "#0061D5" },
  { id: "s3",       name: "Amazon S3",      category: "cloud",         color: "#FF9900" },
  // Productivity
  { id: "gcal",     name: "Google Calendar", category: "productivity", color: "#1A73E8", oauthKey: "google" },
  { id: "todoist",  name: "Todoist",        category: "productivity",  color: "#DC4C3F" },
  { id: "trello",   name: "Trello",         category: "productivity",  color: "#0052CC" },
  { id: "asana",    name: "Asana",          category: "productivity",  color: "#F06A6A" },
  { id: "airtable", name: "Airtable",       category: "productivity",  color: "#2D7FF9" },
  // Social
  { id: "twitter",  name: "X / Twitter",   category: "social",        color: "#000000" },
  { id: "reddit",   name: "Reddit",         category: "social",        color: "#FF4500" },
  { id: "youtube",  name: "YouTube",        category: "social",        color: "#FF0000" },
  { id: "linkedin", name: "LinkedIn",       category: "social",        color: "#0A66C2" },
  { id: "hackernews", name: "Hacker News",  category: "social",        color: "#FF6600" },
  // Knowledge
  { id: "obsidian", name: "Obsidian",       category: "knowledge",     color: "#7C3AED" },
  { id: "confluence", name: "Confluence",   category: "knowledge",     color: "#0052CC" },
  { id: "wikipedia", name: "Wikipedia",     category: "knowledge",     color: "#3366CC" },
  { id: "roam",     name: "Roam Research",  category: "knowledge",     color: "#8B5CF6" },
  { id: "logseq",   name: "Logseq",         category: "knowledge",     color: "#3884FF" },
  { id: "substack", name: "Substack",       category: "knowledge",     color: "#FF6719" },
  // AI / ML
  { id: "claude",   name: "Claude",         category: "ai",            color: "#CC7B5C" },
  { id: "openai",   name: "ChatGPT",        category: "ai",            color: "#00A67E" },
  { id: "perplexity", name: "Perplexity",   category: "ai",            color: "#20808D" },
  { id: "huggingface", name: "Hugging Face", category: "ai",           color: "#FFD21E" },
  { id: "replicate", name: "Replicate",     category: "ai",            color: "#0EA5E9" },
  // Other
  { id: "rss",      name: "RSS / Atom",     category: "other",         color: "#F26522" },
  { id: "webhook",  name: "Webhook",        category: "other",         color: "#4B5563" },
  { id: "localfolder", name: "Local Folder", category: "other",        color: "#059669" },
  { id: "gitrepo",  name: "Git Repo",       category: "other",         color: "#F97316" },
  { id: "sqlite",   name: "SQLite",         category: "other",         color: "#003B57" },
  { id: "csv",      name: "CSV / Spreadsheet", category: "other",      color: "#217346" },
];

let _connectorTokenStatus = {};
let _connectorCat = "all";
let _connectorViewInit = false;

async function initConnectorsView() {
  // Fetch live token status from API (reuse existing endpoint)
  try {
    _connectorTokenStatus = await fetch("/api/auth/tokens").then((r) => r.json());
  } catch {
    _connectorTokenStatus = {};
  }
  renderConnectorsGrid();
}

function setConnectorCat(btn) {
  _connectorCat = btn.dataset.cat;
  document.querySelectorAll(".conn-tab").forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  renderConnectorsGrid();
}

function renderConnectorsGrid() {
  const grid = document.getElementById("conn-grid");
  if (!grid) return;
  const query = (document.getElementById("conn-search-input")?.value || "").toLowerCase().trim();
  const filtered = CONNECTOR_CATALOG.filter((c) => {
    const catMatch = _connectorCat === "all" || c.category === _connectorCat;
    const textMatch = !query || c.name.toLowerCase().includes(query) || c.category.toLowerCase().includes(query);
    return catMatch && textMatch;
  });

  if (!filtered.length) {
    grid.innerHTML = '<div class="conn-empty">No connectors match your search.</div>';
    return;
  }

  grid.innerHTML = filtered.map((c) => {
    // Check if connected via existing OAuth token data
    const isConnected = c.oauthKey && _connectorTokenStatus[c.oauthKey]?.connected;
    const connectedAt = isConnected && _connectorTokenStatus[c.oauthKey]?.connectedAt
      ? new Date(_connectorTokenStatus[c.oauthKey].connectedAt).toLocaleDateString()
      : null;

    const initial = c.name.charAt(0).toUpperCase();
    const iconStyle = `background:${c.color};`;

    const statusBadge = isConnected
      ? '<span class="conn-status-badge connected">Connected</span>'
      : '<span class="conn-status-badge disconnected">Not connected</span>';

    const syncTime = connectedAt
      ? `<span class="conn-sync-time">Since ${connectedAt}</span>`
      : `<span class="conn-sync-time"></span>`;

    let btnHtml = "";
    if (isConnected) {
      btnHtml = `<button class="conn-connect-btn is-connected" onclick="connectorAction('${c.id}','${c.oauthKey || ""}',true)">Manage</button>`;
    } else if (c.oauthKey) {
      btnHtml = `<button class="conn-connect-btn primary" onclick="connectorAction('${c.id}','${c.oauthKey || ""}',false)">Connect</button>`;
    } else {
      btnHtml = `<button class="conn-connect-btn" onclick="connectorComingSoon('${c.name}')">Coming soon</button>`;
    }

    return `<div class="conn-card${isConnected ? " is-connected" : ""}">
      <div class="conn-card-top">
        <div class="conn-icon" style="${iconStyle}">${initial}</div>
        <div class="conn-card-meta">
          <div class="conn-card-name">${c.name}</div>
          <span class="conn-cat-badge">${c.category}</span>
        </div>
      </div>
      <div class="conn-status-row">
        ${statusBadge}
        ${syncTime}
      </div>
      ${btnHtml}
    </div>`;
  }).join("");
}

function connectorAction(connId, oauthKey, isConnected) {
  if (!oauthKey) {
    connectorComingSoon(connId);
    return;
  }
  if (isConnected) {
    // Navigate to settings > sources for management
    openViewTab("settings");
    setTimeout(() => {
      const t = document.querySelector('.settings-nav-item[data-section="sources"]');
      if (t) t.click();
    }, 120);
    return;
  }
  // Trigger OAuth connect
  if (typeof startOAuthConnect === "function") {
    startOAuthConnect(oauthKey);
  } else {
    showToast("Connecting…");
  }
}

function connectorComingSoon(name) {
  showToast(`${name} connector coming soon`);
}

function railConnectorsClick() {
  if (state.activeTabId === VIEW_TABS.connectors.id) {
    closeTab(VIEW_TABS.connectors.id);
  } else {
    openViewTab("connectors");
  }
}

async function loadTimelapse() {
  // Show loading state immediately
  const content = document.getElementById("tl-content");
  content.innerHTML =
    '<div style="padding:40px;text-align:center;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 12px"></div><div>Loading timeline…</div></div>';

  // Initialize slider at 0 while loading
  const slider = document.getElementById("tl-slider");
  slider.max = "0";
  slider.value = "0";
  slider.style.setProperty("--slider-pct", "0%");

  let log = [];
  try {
    log = await api("/api/git/log?limit=500&wikiOnly=true");
  } catch (err) {
    content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Failed to load timeline: ${esc(String(err))}</div>`;
    return;
  }
  const chronological = log.reverse();
  const virtualEmpty = {
    hash: "__empty__",
    hashShort: "∅",
    message: "Empty vault — before first commit",
    author: "WikiMem",
    date: chronological.length
      ? new Date(
          new Date(chronological[0].date).getTime() - 60000,
        ).toISOString()
      : new Date().toISOString(),
    isWiki: true,
    filesChanged: [],
  };
  tlState.treeCache["__empty__"] = [];
  tlState.graphCache["__empty__"] = { nodes: [], links: [] };
  tlState.commits = [virtualEmpty, ...chronological];
  tlState.prefetched = false;

  if (chronological.length === 0) {
    content.innerHTML =
      '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:14px">No wiki commits yet.<br><br>Ingest content to see the knowledge graph grow over time.</div>';
    return;
  }

  slider.max = String(tlState.commits.length - 1);
  slider.value = "0";
  tlState.currentIdx = 0;

  slider.style.setProperty("--slider-pct", "0%");

  const first = tlState.commits[0];
  const last = tlState.commits[tlState.commits.length - 1];
  document.getElementById("tl-label-start").textContent = new Date(
    first.date,
  ).toLocaleDateString();
  document.getElementById("tl-label-end").textContent = new Date(
    last.date,
  ).toLocaleDateString();

  // Clear loading state so tree/graph can render into content
  content.innerHTML =
    '<div id="tl-tree-view" class="tl-tree"><div class="tl-tree-panes" id="tl-tree-panes"><div id="tl-tree-pane-0" class="tl-tree-pane is-front"></div><div id="tl-tree-pane-1" class="tl-tree-pane is-back" aria-hidden="true"></div></div></div><div id="tl-graph-view" class="tl-graph" style="display:none"><svg id="tl-graph-svg"></svg></div>';

  tlState._treeHasRendered = false;
  tlState._lastDirSignature = null;
  const pbar = document.getElementById("tl-prefetch-bar");
  if (pbar) {
    pbar.classList.add("has-commits");
  }
  initPrefetchBarSegments();

  renderTimelapseAt(tlState.currentIdx);
  prefetchAllTrees();
}

function initPrefetchBarSegments() {
  const track = document.getElementById("tl-prefetch-track");
  if (!track || !tlState.commits.length) return;
  track.innerHTML = tlState.commits
    .map(() => '<div class="tl-prefetch-seg"></div>')
    .join("");
  updatePrefetchBarProgress();
}

function updatePrefetchBarProgress() {
  const fill = document.getElementById("tl-prefetch-fill");
  const segs = document.querySelectorAll(
    "#tl-prefetch-track .tl-prefetch-seg",
  );
  if (!tlState.commits.length) return;
  let done = 0;
  tlState.commits.forEach((c, i) => {
    const ok = !!tlState.treeCache[c.hash];
    if (ok) done++;
    if (segs[i]) segs[i].classList.toggle("done", ok);
  });
  if (fill)
    fill.style.width = `${(done / tlState.commits.length) * 100}%`;
}

async function prefetchAllTrees() {
  const uncached = tlState.commits
    .map((c) => c.hash)
    .filter((h) => !tlState.treeCache[h]);
  if (!uncached.length) {
    tlState.prefetched = true;
    updatePrefetchBarProgress();
    return;
  }

  const bar = document.getElementById("tl-prefetch-bar");
  if (bar) bar.classList.add("prefetch-loading");

  const batchSize = 30;
  let done = 0;
  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    try {
      const resp = await fetch("/api/git/trees/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashes: batch }),
      });
      const data = await resp.json();
      if (data && typeof data === "object" && !data.error) {
        for (const [hash, tree] of Object.entries(data))
          tlState.treeCache[hash] = tree;
      }
    } catch (err) {
      console.warn("Prefetch batch failed:", err);
    }
    done += batch.length;
    updatePrefetchBarProgress();
  }

  tlState.prefetched = true;
  if (bar) bar.classList.remove("prefetch-loading");
  updatePrefetchBarProgress();

  // UXO-089: background-prefetch graph data after trees are done
  prefetchAllGraphs();
}

async function prefetchAllGraphs() {
  const uncached = tlState.commits
    .map((c) => c.hash)
    .filter((h) => !tlState.graphCache[h]);
  if (!uncached.length) return;
  const batchSize = 20;
  for (let i = 0; i < uncached.length; i += batchSize) {
    const batch = uncached.slice(i, i + batchSize);
    try {
      const resp = await fetch("/api/git/graph-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashes: batch }),
      });
      const data = await resp.json();
      if (data && typeof data === "object" && !data.error) {
        for (const [hash, graph] of Object.entries(data))
          tlState.graphCache[hash] = graph;
      }
    } catch (err) {
      // non-fatal — graph will lazy-load on demand
    }
  }
}

async function renderTimelapseAt(idx, opts = {}) {
  const { crossfade = false } = opts;
  tlState.currentIdx = idx;
  const commit = tlState.commits[idx];
  if (!commit) return;

  // Don't overwrite slider position while user is actively dragging
  if (!tlState._tlDragging) {
    const slider = document.getElementById("tl-slider");
    slider.value = String(idx);
    const max = parseInt(slider.max) || 1;
    slider.style.setProperty("--slider-pct", `${(idx / max) * 100}%`);
  }

  const date = new Date(commit.date);
  const dateStr =
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const badge = commit.isWiki
    ? '<span class="commit-badge wiki">wiki</span>'
    : '<span class="commit-badge code">code</span>';
  // UXO-093: show "restored" badge when this commit is the restored checkpoint
  const restoredBadge =
    tlState.restoredHash && commit.hash === tlState.restoredHash
      ? '<span class="commit-badge" style="background:var(--accent);color:#fff;margin-left:2px">restored</span>'
      : "";
  // UXO-092: include "View Diff" link so user can navigate to audit trail for this commit
  const viewDiffBtn =
    commit.hash !== "__empty__"
      ? `<button class="btn-sm" style="margin-left:auto;flex-shrink:0" onclick="openDiffModal('${commit.hash}','${commit.hashShort}','${esc(commit.message).replace(/'/g, "&#39;")}')">View Diff</button>`
      : "";
  document.getElementById("tl-commit-info").innerHTML =
    `<span class="tl-hash">${commit.hashShort}</span>${badge}${restoredBadge}<span>${esc(commit.message)}</span><span style="margin-left:auto;color:var(--text-muted)">${dateStr} · ${commit.author}</span>${viewDiffBtn}`;
  document.getElementById("tl-label-current").textContent =
    `${idx + 1} / ${tlState.commits.length}`;

  if (!tlState.treeCache[commit.hash]) {
    try {
      const resp = await fetch("/api/git/trees/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashes: [commit.hash] }),
      });
      const data = await resp.json();
      if (data && typeof data === "object" && !data.error) {
        for (const [hash, tree] of Object.entries(data))
          tlState.treeCache[hash] = tree;
      }
    } catch (err) {
      console.warn("Tree fetch failed:", err);
    }
  }

  if (tlState.mode === "tree") {
    renderTimelapseTree(commit, idx, { crossfade });
    scrollToFirstChange();
  } else {
    await renderTimelapseGraph(commit, idx, { crossfade });
  }
}

function scrollToFirstChange() {
  requestAnimationFrame(() => {
    const content = document.getElementById("tl-content");
    if (!content) return;
    const changed = content.querySelector(
      ".tl-file.added, .tl-file.modified, .tl-file.deleted",
    );
    if (changed) {
      changed.scrollIntoView({ behavior: "smooth", block: "center" });
      changed.style.outline = "1px solid var(--accent)";
      changed.style.outlineOffset = "2px";
      setTimeout(() => {
        changed.style.outline = "none";
      }, 1200);
    }
  });
}

const FILE_ICONS = {
  ".md": "📄",
  ".txt": "📝",
  ".json": "⚙️",
  ".yaml": "⚙️",
  ".yml": "⚙️",
  ".pdf": "📕",
  ".png": "🖼",
  ".jpg": "🖼",
  ".jpeg": "🖼",
  ".gif": "🖼",
  ".mp3": "🎵",
  ".wav": "🎵",
  ".m4a": "🎵",
  ".mp4": "🎬",
  ".mov": "🎬",
  ".csv": "📊",
  ".xlsx": "📊",
  ".docx": "📃",
  ".pptx": "📑",
  ".js": "📜",
  ".ts": "📜",
  ".py": "🐍",
  ".sh": "🔧",
};

function getTimelineFileIcon(name) {
  const ext = name.includes(".")
    ? "." + name.split(".").pop().toLowerCase()
    : "";
  return FILE_ICONS[ext] || "📄";
}

const FOLDER_ICONS = {
  wiki: "🧠",
  raw: "📦",
  concepts: "💡",
  entities: "🏷",
  sources: "📚",
  syntheses: "🔗",
  ".obsidian": "🔮",
  "(root)": "📁",
};

function getFolderIcon(name) {
  return FOLDER_ICONS[name.toLowerCase()] || "📁";
}

function buildTreeData(commit, idx) {
  const tree = tlState.treeCache[commit.hash] || [];
  const prevTree =
    idx > 0 ? tlState.treeCache[tlState.commits[idx - 1].hash] || [] : [];
  const prevSet = new Set(prevTree);
  const currSet = new Set(tree);
  const changedSet = new Set(commit.filesChanged || []);
  const dirs = {};
  for (const f of tree) {
    const parts = f.split("/");
    const dir = parts.length > 1 ? parts[0] : "(root)";
    if (!dirs[dir]) dirs[dir] = [];
    let st = prevSet.has(f) ? "unchanged" : "added";
    if (st === "unchanged" && changedSet.has(f)) st = "modified";
    dirs[dir].push({
      name: parts.slice(1).join("/") || parts[0],
      ext: f.split(".").pop(),
      status: st,
      full: f,
    });
  }
  for (const f of prevTree) {
    if (!currSet.has(f)) {
      const parts = f.split("/");
      const dir = parts.length > 1 ? parts[0] : "(root)";
      if (!dirs[dir]) dirs[dir] = [];
      dirs[dir].push({
        name: parts.slice(1).join("/") || parts[0],
        ext: f.split(".").pop(),
        status: "deleted",
        full: f,
      });
    }
  }
  return dirs;
}

function folderBadgeHtml(files) {
  const added = files.filter((f) => f.status === "added").length;
  const mod = files.filter((f) => f.status === "modified").length;
  const del = files.filter((f) => f.status === "deleted").length;
  const parts = [];
  if (added)
    parts.push(`<span class="tl-folder-badge add">+${added}</span>`);
  if (mod) parts.push(`<span class="tl-folder-badge mod">~${mod}</span>`);
  if (del) parts.push(`<span class="tl-folder-badge del">-${del}</span>`);
  return parts.join("");
}

function buildTimelapseTreeHtml(commit, idx) {
  const dirs = buildTreeData(commit, idx);
  if (Object.keys(dirs).length === 0) return null;

  const newFileMap = new Map();
  const sortedDirs = Object.entries(dirs).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [dir, files] of sortedDirs) {
    const sortedFiles = files.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const f of sortedFiles) {
      const isHidden = f.name.startsWith(".");
      if (isHidden && f.status === "unchanged") continue;
      newFileMap.set(f.full, f);
    }
  }

  let html = `<div class="tl-legend">
  <span class="tl-legend-item"><span class="tl-legend-dot" style="background:var(--green)"></span>Added</span>
  <span class="tl-legend-item"><span class="tl-legend-dot" style="background:var(--amber)"></span>Modified</span>
  <span class="tl-legend-item"><span class="tl-legend-dot" style="background:var(--red)"></span>Deleted</span>
  <span class="tl-legend-item"><span class="tl-legend-dot" style="background:var(--border)"></span>Unchanged</span>
</div>`;

  for (const [dir, files] of sortedDirs) {
    const sortedFiles = files.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const visibleFiles = sortedFiles.filter(
      (f) => !(f.name.startsWith(".") && f.status === "unchanged"),
    );
    const badges = folderBadgeHtml(sortedFiles);
    html += `<div class="tl-folder" data-tl-folder="${esc(dir)}">
    <div class="tl-folder-header">
      <span class="tl-folder-icon">${getFolderIcon(dir)}</span>
      <span class="tl-folder-name">${esc(dir === "(root)" ? "Root" : dir)}</span>
      <span class="tl-folder-count">${visibleFiles.length}</span>
      <span class="tl-folder-badges">${badges}</span>
    </div>
    <div class="tl-folder-children">`;
    for (const f of visibleFiles) {
      const icon = getTimelineFileIcon(f.name);
      const extBadge =
        f.ext && f.ext !== f.name
          ? `<span class="tl-file-ext-badge">.${esc(f.ext)}</span>`
          : "";
      html += `<div class="tl-file ${f.status}" data-tl-file="${esc(f.full)}" data-tl-status="${f.status}">
      <span class="tl-file-icon">${icon}</span>
      <span class="tl-file-name" ${f.status === "deleted" ? 'style="text-decoration:line-through"' : ""}>${esc(f.name.split("/").pop())}</span>
      ${extBadge}
      <span class="tl-file-status ${f.status}" title="${f.status}"></span>
    </div>`;
    }
    html += `</div></div>`;
  }

  return { html, sortedDirs, dirs, newFileMap };
}

function applyTimelapseFileRow(el, entry) {
  el.className = `tl-file ${entry.status}`;
  el.setAttribute("data-tl-status", entry.status);
  const dot = el.querySelector(".tl-file-status");
  if (dot) dot.className = `tl-file-status ${entry.status}`;
  const nameEl = el.querySelector(".tl-file-name");
  if (nameEl)
    nameEl.style.textDecoration =
      entry.status === "deleted" ? "line-through" : "";
  el.style.opacity = entry.status === "deleted" ? "0.4" : "1";
  el.style.transform = "";
}

function patchTimelapseTreePane(pane, dirs, sortedDirs, newFileMap) {
  const existingEls = pane.querySelectorAll("[data-tl-file]");
  if (existingEls.length === 0 || !tlState._lastDirSignature)
    return false;

  const dirSig = sortedDirs.map(([d]) => d).join(",");
  const existingKeys = new Set();
  existingEls.forEach((el) =>
    existingKeys.add(el.getAttribute("data-tl-file")),
  );
  const newKeys = new Set(newFileMap.keys());

  const refreshFolderChrome = () => {
    pane.querySelectorAll("[data-tl-folder]").forEach((folderEl) => {
      const dirName = folderEl.getAttribute("data-tl-folder");
      const dirFiles = dirs[dirName];
      if (dirFiles) {
        const badgeContainer =
          folderEl.querySelector(".tl-folder-badges");
        if (badgeContainer)
          badgeContainer.innerHTML = folderBadgeHtml(dirFiles);
        const countEl = folderEl.querySelector(".tl-folder-count");
        if (countEl)
          countEl.textContent = String(
            dirFiles.filter(
              (f) =>
                !(f.name.startsWith(".") && f.status === "unchanged"),
            ).length,
          );
      }
    });
  };

  if (
    dirSig === tlState._lastDirSignature &&
    existingKeys.size === newKeys.size &&
    [...existingKeys].every((k) => newKeys.has(k))
  ) {
    existingEls.forEach((el) => {
      const key = el.getAttribute("data-tl-file");
      const entry = newFileMap.get(key);
      if (entry) applyTimelapseFileRow(el, entry);
    });
    refreshFolderChrome();
    return true;
  }

  if (dirSig === tlState._lastDirSignature) {
    const toRemove = [...existingKeys].filter((k) => !newKeys.has(k));
    const toAdd = [...newKeys].filter((k) => !existingKeys.has(k));
    if (toRemove.length === 0 && toAdd.length === 0) return false;

    toRemove.forEach((k) => {
      for (const el of pane.querySelectorAll("[data-tl-file]")) {
        if (el.getAttribute("data-tl-file") !== k) continue;
        el.classList.add("tl-anim-exit");
        el.addEventListener(
          "animationend",
          () => {
            el.remove();
          },
          { once: true },
        );
        break;
      }
    });

    for (const [dir, files] of sortedDirs) {
      const sortedFiles = files.sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      const visibleFiles = sortedFiles.filter(
        (f) => !(f.name.startsWith(".") && f.status === "unchanged"),
      );
      let folderEl = null;
      for (const fe of pane.querySelectorAll("[data-tl-folder]")) {
        if (fe.getAttribute("data-tl-folder") === dir) {
          folderEl = fe;
          break;
        }
      }
      const childContainer = folderEl?.querySelector(
        ".tl-folder-children",
      );
      if (!childContainer) continue;

      for (const f of visibleFiles) {
        if (!toAdd.includes(f.full)) continue;
        const icon = getTimelineFileIcon(f.name);
        const extBadge =
          f.ext && f.ext !== f.name
            ? `<span class="tl-file-ext-badge">.${esc(f.ext)}</span>`
            : "";
        const row = document.createElement("div");
        row.className = `tl-file ${f.status} tl-anim-enter`;
        row.setAttribute("data-tl-file", f.full);
        row.setAttribute("data-tl-status", f.status);
        row.innerHTML = `<span class="tl-file-icon">${icon}</span>
      <span class="tl-file-name" ${f.status === "deleted" ? 'style="text-decoration:line-through"' : ""}>${esc(f.name.split("/").pop())}</span>
      ${extBadge}
      <span class="tl-file-status ${f.status}" title="${f.status}"></span>`;
        childContainer.appendChild(row);
        requestAnimationFrame(() =>
          row.classList.remove("tl-anim-enter"),
        );
      }

      for (const f of visibleFiles) {
        const el = [
          ...childContainer.querySelectorAll("[data-tl-file]"),
        ].find((n) => n.getAttribute("data-tl-file") === f.full);
        if (el) childContainer.appendChild(el);
      }
    }

    pane.querySelectorAll("[data-tl-file]").forEach((el) => {
      const key = el.getAttribute("data-tl-file");
      const entry = newFileMap.get(key);
      if (entry) applyTimelapseFileRow(el, entry);
    });
    refreshFolderChrome();
    return true;
  }

  return false;
}

function crossfadeTimelapseTreePanes(html, sortedDirs) {
  const pane0 = document.getElementById("tl-tree-pane-0");
  const pane1 = document.getElementById("tl-tree-pane-1");
  const panes = document.getElementById("tl-tree-panes");
  if (!pane0 || !pane1 || !panes) return;

  pane1.innerHTML = html;
  pane1.setAttribute("aria-hidden", "false");
  const h = Math.max(
    pane0.offsetHeight || 0,
    pane1.offsetHeight || 0,
    80,
  );
  panes.style.minHeight = h + "px";

  const finish = () => {
    pane0.innerHTML = pane1.innerHTML;
    pane0.classList.remove("tl-pane-fade");
    pane0.style.opacity = "";
    pane1.innerHTML = "";
    pane1.classList.remove("tl-pane-visible");
    pane1.setAttribute("aria-hidden", "true");
    panes.style.minHeight = "";
    tlState._lastDirSignature = sortedDirs.map(([d]) => d).join(",");
  };

  requestAnimationFrame(() => {
    pane0.classList.add("tl-pane-fade");
    pane1.classList.add("tl-pane-visible");
  });

  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    finish();
  };
  pane1.addEventListener(
    "transitionend",
    (e) => {
      if (e.propertyName === "opacity") done();
    },
    { once: true },
  );
  setTimeout(done, 420);
}

function renderTimelapseTree(commit, idx, opts = {}) {
  const { crossfade = false } = opts;
  const pane0 = document.getElementById("tl-tree-pane-0");
  const pane1 = document.getElementById("tl-tree-pane-1");
  if (!pane0) return;

  const built = buildTimelapseTreeHtml(commit, idx);
  if (!built) {
    pane0.innerHTML =
      '<div style="padding:40px;text-align:center;color:var(--text-muted)">No files at this point in history.</div>';
    if (pane1) pane1.innerHTML = "";
    tlState._lastDirSignature = null;
    tlState._treeHasRendered = true;
    return;
  }

  const { html, sortedDirs, dirs, newFileMap } = built;

  if (crossfade && tlState._treeHasRendered) {
    crossfadeTimelapseTreePanes(html, sortedDirs);
    tlState._treeHasRendered = true;
    return;
  }

  if (
    tlState._treeHasRendered &&
    patchTimelapseTreePane(pane0, dirs, sortedDirs, newFileMap)
  ) {
    tlState._lastDirSignature = sortedDirs.map(([d]) => d).join(",");
    return;
  }

  pane0.innerHTML = html;
  if (pane1) pane1.innerHTML = "";
  if (tlState._treeHasRendered) {
    requestAnimationFrame(() => {
      pane0.querySelectorAll(".tl-file").forEach((el) => {
        el.classList.add("tl-anim-enter");
        requestAnimationFrame(() => el.classList.remove("tl-anim-enter"));
      });
    });
  }

  tlState._lastDirSignature = sortedDirs.map(([d]) => d).join(",");
  tlState._treeHasRendered = true;
}

async function restoreToCommit(hash, shortHash) {
  if (
    !confirm(
      `Restore wiki to checkpoint ${shortHash}?\n\nThis will create a new branch "wiki/restore-${shortHash}" from this point.`,
    )
  )
    return;
  try {
    const result = await fetch("/api/git/branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `wiki/restore-${shortHash}`,
        fromHash: hash,
      }),
    }).then((r) => r.json());
    if (result.created) {
      const sw = await fetch("/api/git/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: `wiki/restore-${shortHash}` }),
      }).then((r) => r.json());
      if (sw.switched) {
        // UXO-093: mark restored commit so timelapse highlights it without wiping all commits
        tlState.restoredHash = hash;
        alert(
          `Restored to ${shortHash} on branch wiki/restore-${shortHash}. You can now edit the wiki from this point.`,
        );
        loadGitBadge();
        loadTree();
        loadHome();
        // Re-render current timelapse position to show restored highlight; all commits stay visible
        renderTimelapseAt(tlState.currentIdx);
      }
    } else {
      alert("Failed: " + result.message);
    }
  } catch (err) {
    alert("Restore failed: " + err.message);
  }
}

async function renderTimelapseGraph(commit, idx, opts = {}) {
  const { crossfade = false } = opts;
  const container = document.getElementById("tl-graph-view");
  const rect = container.getBoundingClientRect();
  const width =
    rect.width > 20
      ? rect.width
      : container.parentElement?.clientWidth || 800;
  const height = Math.max(400, rect.height > 20 ? rect.height : 500);
  container.style.height = height + "px";

  let data = tlState.graphCache[commit.hash];
  if (!data) {
    try {
      data = await api(`/api/git/graph/${commit.hash}`);
      tlState.graphCache[commit.hash] = data;
    } catch (err) {
      console.warn("Graph fetch failed:", err);
      data = { nodes: [], links: [] };
    }
  }

  let svgEl = container.querySelector("svg");
  if (!svgEl) {
    container.innerHTML = '<svg id="tl-graph-svg"></svg>';
    svgEl = container.querySelector("svg");
  }
  svgEl.setAttribute("width", width);
  svgEl.setAttribute("height", height);

  const svg = d3.select(svgEl);
  const cs = (k) =>
    getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const COLORS = [
    "#4f9eff",
    "#4ec9b0",
    "#d7ba7d",
    "#c586c0",
    "#9cdcfe",
    "#dcdcaa",
    "#ce9178",
    "#608b4e",
    "#b5cea8",
  ];
  const cColor = (c) => COLORS[(c || 0) % COLORS.length];
  const totalNodes = data.nodes.length;
  const isHub = (d) =>
    (d.linksIn || 0) >= Math.max(5, Math.ceil(totalNodes * 0.06));
  const nR = (d) =>
    Math.max(4, Math.min(18, 4 + Math.sqrt(d.linksIn || 0) * 3));
  const linkKey = (d) =>
    `${d.source?.id ?? d.source}\u2192${d.target?.id ?? d.target}`;

  if (!data.nodes || !data.nodes.length) {
    if (tlState._tlGraphSim) {
      tlState._tlGraphSim.stop();
      tlState._tlGraphSim.on("tick", null);
      tlState._tlGraphSim.on("end", null);
      tlState._tlGraphSim = null;
    }
    svg.selectAll("*").remove();
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", cs("--text-muted"))
      .attr("font-size", 13)
      .attr("font-family", "Inter,sans-serif")
      .text(`No wiki pages at commit ${commit.hashShort}`);
    tlState._tlGraphLastHash = null;
    return;
  }

  for (const n of data.nodes) {
    const p = tlState._graphNodePos[n.id];
    if (p) {
      n.x = p.x;
      n.y = p.y;
    }
  }

  let g = svg.select("g.tl-root");
  if (!g.node()) {
    svg.selectAll("*").remove();
    g = svg.append("g").attr("class", "tl-root");
    g.append("g").attr("class", "tl-links");
    g.append("g").attr("class", "tl-rings");
    g.append("g").attr("class", "tl-nodes");
    g.append("g").attr("class", "tl-labels");
    svg.call(
      d3
        .zoom()
        .scaleExtent([0.15, 5])
        .on("zoom", (e) => g.attr("transform", e.transform)),
    );
  }

  // No opacity flash — let D3 data joins handle smooth transitions
  g.style("opacity", 1);

  let tip = container.querySelector(".tl-tip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "tl-tip";
    container.appendChild(tip);
  }

  const reuseSim = !!(
    tlState._tlGraphSim &&
    tlState._tlGraphLastHash &&
    tlState._tlGraphSim.nodes().length &&
    data.nodes.length
  );
  let sim;

  if (reuseSim) {
    sim = tlState._tlGraphSim;
    sim.on("tick", null);
    sim.on("end", null);
    const prevById = new Map(sim.nodes().map((d) => [d.id, d]));
    for (const n of data.nodes) {
      const o = prevById.get(n.id);
      const p = tlState._graphNodePos[n.id];
      if (o) {
        n.x = o.x;
        n.y = o.y;
        n.vx = (o.vx || 0) * (tlState.playing ? 0.1 : 0.32);
        n.vy = (o.vy || 0) * (tlState.playing ? 0.1 : 0.32);
      } else if (p) {
        n.x = p.x;
        n.y = p.y;
      } else {
        n.x = width / 2 + (Math.random() - 0.5) * 80;
        n.y = height / 2 + (Math.random() - 0.5) * 80;
      }
    }
    sim.nodes(data.nodes);
    sim.force(
      "link",
      d3
        .forceLink(data.links)
        .id((d) => d.id)
        .distance(80),
    );
    sim.force("charge", d3.forceManyBody().strength(-220));
    sim.force("center", d3.forceCenter(width / 2, height / 2));
    sim.force(
      "collision",
      d3.forceCollide().radius((d) => (isHub(d) ? 26 : 18)),
    );
    const scrubAlpha = tlState.playing
      ? 0.08
      : tlState._tlJustScrubbed
        ? 0.15
        : 0.3;
    const scrubDecay = tlState.playing
      ? 0.04
      : tlState._tlJustScrubbed
        ? 0.035
        : 0.0228;
    sim.alpha(scrubAlpha).alphaDecay(scrubDecay).restart();
    tlState._tlJustScrubbed = false;
  } else {
    if (tlState._tlGraphSim) {
      tlState._tlGraphSim.stop();
      tlState._tlGraphSim.on("tick", null);
      tlState._tlGraphSim.on("end", null);
      tlState._tlGraphSim = null;
    }
    sim = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(data.links)
          .id((d) => d.id)
          .distance(80),
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => (isHub(d) ? 26 : 18)),
      );
    tlState._tlGraphSim = sim;
  }

  const soft = reuseSim;
  const fast = tlState.playing; // ultra-fast transitions during playback

  const lk = g
    .select("g.tl-links")
    .selectAll("line")
    .data(data.links, linkKey);
  lk.exit()
    .transition()
    .duration(fast ? 80 : soft ? 200 : 300)
    .attr("stroke-opacity", 0)
    .remove();
  const lkE = lk
    .enter()
    .append("line")
    .attr("stroke", cs("--border-subtle"))
    .attr("stroke-width", 0.8)
    .attr("stroke-opacity", fast ? 0.35 : soft ? 0.2 : 0.4);
  if (fast) {
    lkE.transition().duration(120).attr("stroke-opacity", 0.4);
  } else if (soft) {
    lkE.transition().duration(380).attr("stroke-opacity", 0.4);
  } else {
    lkE
      .attr("stroke-dasharray", "500")
      .attr("stroke-dashoffset", "500")
      .transition()
      .duration(500)
      .delay(150)
      .attr("stroke-dashoffset", 0)
      .on("end", function () {
        d3.select(this).attr("stroke-dasharray", null);
      });
  }
  const links = lkE.merge(lk);
  lk.transition()
    .duration(fast ? 100 : soft ? 320 : 300)
    .attr("stroke-opacity", 0.4);

  const rg = g
    .select("g.tl-rings")
    .selectAll("circle")
    .data(data.nodes.filter(isHub), (d) => d.id);
  rg.exit()
    .transition()
    .duration(fast ? 60 : soft ? 200 : 300)
    .attr("opacity", 0)
    .remove();
  const rgE = rg
    .enter()
    .append("circle")
    .attr("r", (d) => nR(d) + 5)
    .attr("fill", "none")
    .attr("stroke", "#d4a843")
    .attr("stroke-width", 1.5)
    .attr("opacity", fast ? 0.4 : soft ? 0.35 : 0);
  rgE
    .transition()
    .duration(fast ? 100 : soft ? 260 : 300)
    .delay(fast ? 0 : soft ? 0 : 100)
    .attr("opacity", 0.5);
  const rings = rgE.merge(rg);
  rg.transition()
    .duration(fast ? 80 : soft ? 300 : 300)
    .attr("r", (d) => nR(d) + 5);

  const nd = g
    .select("g.tl-nodes")
    .selectAll("circle")
    .data(data.nodes, (d) => d.id);
  nd.exit()
    .transition()
    .duration(fast ? 60 : soft ? 220 : 300)
    .attr("opacity", 0)
    .attr("r", 0)
    .remove();
  const ndE = nd
    .enter()
    .append("circle")
    .attr("r", fast ? (d) => nR(d) * 0.7 : soft ? (d) => nR(d) : 0)
    .attr("opacity", fast ? 0.85 : soft ? 0.75 : 0)
    .attr("fill", (d) => cColor(d.community))
    .attr("stroke", (d) => (isHub(d) ? "#d4a843" : cs("--bg")))
    .attr("stroke-width", (d) => (isHub(d) ? 2 : 1.5))
    .attr("cursor", "pointer");
  ndE
    .transition()
    .duration(fast ? 100 : soft ? 420 : 300)
    .attr("r", (d) => nR(d))
    .attr("opacity", 1);
  nd.transition()
    .duration(fast ? 120 : soft ? 450 : 300)
    .attr("r", (d) => nR(d))
    .attr("fill", (d) => cColor(d.community))
    .attr("stroke", (d) => (isHub(d) ? "#d4a843" : cs("--bg")));
  const nodes = ndE.merge(nd);
  nodes.call(
    d3
      .drag()
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }),
  );

  const lb = g
    .select("g.tl-labels")
    .selectAll("text")
    .data(data.nodes, (d) => d.id);
  lb.exit().transition().duration(200).attr("opacity", 0).remove();
  const lbE = lb
    .enter()
    .append("text")
    .text((d) =>
      d.title.length > 22 ? d.title.slice(0, 20) + "\u2026" : d.title,
    )
    .attr("font-size", (d) => (isHub(d) ? 11 : 9.5))
    .attr("font-weight", (d) => (isHub(d) ? "600" : "normal"))
    .attr("font-family", "Inter,sans-serif")
    .attr("fill", (d) =>
      isHub(d) ? cs("--text-bright") : cs("--text-dim"),
    )
    .attr("text-anchor", "middle")
    .attr("dy", (d) => nR(d) + 13)
    .attr("pointer-events", "none")
    .attr("opacity", 0);
  lbE
    .transition()
    .duration(fast ? 80 : 300)
    .delay(fast ? 0 : soft ? 40 : 200)
    .attr("opacity", (d) => (isHub(d) ? 1 : 0));
  const labels = lbE.merge(lb);
  labels.text((d) =>
    d.title.length > 22 ? d.title.slice(0, 20) + "\u2026" : d.title,
  );

  nodes
    .on("mouseover", (e, d) => {
      tip.style.display = "block";
      const hb = isHub(d)
        ? '<span style="display:inline-block;font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(212,168,67,0.15);color:#d4a843;font-weight:500;margin-left:6px">Hub</span>'
        : "";
      tip.innerHTML = `<div class="tt-title">${esc(d.title)}${hb}</div><div class="tt-meta">${d.linksIn || 0} inbound links \u00b7 community ${d.community ?? 0}</div>`;
      labels.filter((l) => l.id === d.id).attr("opacity", 1);
    })
    .on("mousemove", (e) => {
      const r = container.getBoundingClientRect();
      tip.style.left = e.clientX - r.left + 12 + "px";
      tip.style.top = e.clientY - r.top - 10 + "px";
    })
    .on("mouseout", (e, d) => {
      tip.style.display = "none";
      labels
        .filter((l) => l.id === d.id)
        .attr("opacity", isHub(d) ? 1 : 0);
    });

  sim.on("tick", () => {
    links
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    nodes.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    rings.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });

  sim.on("end", () => {
    for (const n of data.nodes)
      tlState._graphNodePos[n.id] = { x: n.x, y: n.y };
  });

  tlState._tlGraphLastHash = commit.hash;

  if (typeof idx === "number") {
    const lo = Math.max(0, idx - 5),
      hi = Math.min(tlState.commits.length - 1, idx + 5);
    const need = [];
    for (let i = lo; i <= hi; i++) {
      const h = tlState.commits[i].hash;
      if (!tlState.graphCache[h]) need.push(h);
    }
    if (need.length) {
      fetch("/api/git/graph-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashes: need }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && typeof d === "object" && !d.error)
            for (const [h, v] of Object.entries(d))
              tlState.graphCache[h] = v;
        })
        .catch(() => {});
    }
  }
}

function tlPlay() {
  if (tlState.playing) {
    tlPause();
    return;
  }
  tlState.playing = true;
  document.getElementById("tl-play").textContent = "⏸";
  document.getElementById("tl-play").classList.add("playing");
  const speed =
    parseInt(document.getElementById("tl-speed").value) || 2000;
  const slider = document.getElementById("tl-slider");
  const max = tlState.commits.length - 1;
  if (max <= 0) {
    tlPause();
    return;
  }

  let lastTime = null;
  let fractionalIdx = tlState.currentIdx;
  let rendering = false;

  function animate(ts) {
    if (!tlState.playing || tlState._tlDragging) return;
    if (lastTime === null) {
      lastTime = ts;
      tlState._tlPlayRaf = requestAnimationFrame(animate);
      return;
    }
    const dt = ts - lastTime;
    lastTime = ts;

    // Advance fractional index smoothly based on speed setting
    // speed = ms per commit, so rate = 1/speed commits per ms
    fractionalIdx += dt / speed;

    // Smoothly update slider position (continuous, not integer-locked)
    const pct = Math.min(fractionalIdx / max, 1) * 100;
    slider.style.setProperty("--slider-pct", `${pct}%`);
    slider.value = String(Math.min(Math.round(fractionalIdx), max));

    // Only render at integer commit boundaries — skip if prior render still in flight
    const targetIdx = Math.floor(fractionalIdx);
    if (
      targetIdx > tlState.currentIdx &&
      targetIdx <= max &&
      !rendering
    ) {
      rendering = true;
      renderTimelapseAt(targetIdx, { crossfade: false }).finally(() => {
        rendering = false;
      });
    }

    if (fractionalIdx >= max) {
      rendering = true;
      renderTimelapseAt(max, { crossfade: false }).finally(() => {
        rendering = false;
      });
      tlPause();
      return;
    }
    tlState._tlPlayRaf = requestAnimationFrame(animate);
  }
  tlState._tlPlayRaf = requestAnimationFrame(animate);
}

function tlPause() {
  tlState.playing = false;
  if (tlState._tlPlayRaf) {
    cancelAnimationFrame(tlState._tlPlayRaf);
    tlState._tlPlayRaf = null;
  }
  clearInterval(tlState.interval);
  // UXO-091: stop D3 simulation when paused so graph doesn't keep expanding
  if (tlState._tlGraphSim) tlState._tlGraphSim.stop();
  document.getElementById("tl-play").textContent = "▶";
  document.getElementById("tl-play").classList.remove("playing");
}

document
  .getElementById("rail-files")
  .addEventListener("click", railFilesClick);
document
  .getElementById("rail-search")
  .addEventListener("click", railSearchClick);
document
  .getElementById("rail-graph")
  .addEventListener("click", railGraphClick);
document
  .getElementById("rail-pipeline")
  .addEventListener("click", railPipelineClick);
document
  .getElementById("rail-history")
  .addEventListener("click", railHistoryClick);
document
  .getElementById("rail-timelapse")
  .addEventListener("click", railTimelapseClick);
document
  .getElementById("rail-connectors")
  .addEventListener("click", railConnectorsClick);
document
  .getElementById("sb-settings-btn")
  .addEventListener("click", railSettingsClick);
document
  .getElementById("history-init-git")
  .addEventListener("click", initGitRepo);
document
  .getElementById("history-wiki-only")
  .addEventListener("change", () => loadGitHistory());
document
  .getElementById("history-search")
  .addEventListener("input", () => {
    clearTimeout(historyDebounce);
    historyDebounce = setTimeout(() => loadGitHistory(), 300);
  });
document
  .getElementById("history-tag-btn")
  .addEventListener("click", async () => {
    const name = await showInputModal("Create Tag", "Tag name (e.g. v1.0, milestone-research)", "", "Create");
    if (!name) return;
    const msg = name ? await showInputModal("Tag Message", "Optional message", "", "OK") : null;
    const result = await fetch("/api/git/tag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message: msg || undefined }),
    }).then((r) => r.json());
    alert(result.message);
  });
document
  .getElementById("history-branch-btn")
  .addEventListener("click", async () => {
    const name = await showInputModal("New Branch", "Branch name (e.g. wiki/my-edits)", "", "Create");
    if (!name) return;
    const result = await fetch("/api/git/branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => r.json());
    alert(result.message);
    if (result.created) loadGitHistory();
  });

document
  .getElementById("history-push-btn")
  .addEventListener("click", pushCurrentBranch);
document
  .getElementById("history-pr-btn")
  .addEventListener("click", openPRModal);
document
  .getElementById("history-migrate-btn")
  .addEventListener("click", migrateHistoryToGit);

document
  .getElementById("diff-modal-close")
  .addEventListener("click", closeDiffModal);
document
  .getElementById("diff-modal-overlay")
  .addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDiffModal();
  });

document
  .getElementById("pr-modal-close")
  .addEventListener("click", closePRModal);
document
  .getElementById("pr-cancel-btn")
  .addEventListener("click", closePRModal);
document
  .getElementById("pr-submit-btn")
  .addEventListener("click", submitPR);
document
  .getElementById("pr-modal-overlay")
  .addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closePRModal();
  });

const cxClose = document.getElementById("cx-modal-close");
if (cxClose) cxClose.addEventListener("click", closeCxModal);
const cxOv = document.getElementById("cx-modal-overlay");
if (cxOv)
  cxOv.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCxModal();
  });

// Settings nav
document.querySelectorAll(".settings-nav-item").forEach((el) => {
  el.addEventListener("click", () =>
    renderSettingsSection(el.dataset.section),
  );
});

// Sidebar action buttons
document
  .getElementById("sa-new-note")
  .addEventListener("click", async () => {
    const name = await showInputModal("New Page", "Page title", "", "Create");
    if (!name || !name.trim()) return;
    const title = name.trim();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const today = new Date().toISOString().split("T")[0];
    const template = `---\ntitle: "${title}"\ntype: concept\ncreated: "${today}"\nupdated: "${today}"\ntags: []\nsources: []\nrelated: []\nsummary: ""\n---\n\n# ${title}\n\nWrite your content here...\n`;

    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, content: template }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      await loadTree();
      await loadHome();
      await openPage(title);
      // Open directly in edit mode so user can start writing
      enterEditMode(template);
    } catch (err) {
      alert("Failed to create page");
    }
  });
document
  .getElementById("sa-new-folder")
  .addEventListener("click", () => createSubfolder("", "wiki"));
document
  .getElementById("sa-collapse")
  .addEventListener("click", collapseAllFolders);
document.getElementById("sa-refresh").addEventListener("click", () => {
  loadTree();
  loadHome();
});
document
  .getElementById("git-status-badge")
  .addEventListener("click", toggleGitDropdown);

// Drag detection: pointerdown sets dragging flag and pauses playback immediately
document
  .getElementById("tl-slider")
  .addEventListener("pointerdown", () => {
    tlState._tlDragging = true;
    if (tlState.playing) tlPause();
  });
// pointerup clears dragging flag (also on document in case pointer leaves slider)
function tlSliderPointerUp() {
  if (!tlState._tlDragging) return;
  tlState._tlDragging = false;
  // Flush any pending debounced render at the final position
  if (tlState._tlRenderDebounce != null) {
    clearTimeout(tlState._tlRenderDebounce);
    tlState._tlRenderDebounce = null;
  }
  if (tlState._tlSliderRaf != null) {
    cancelAnimationFrame(tlState._tlSliderRaf);
    tlState._tlSliderRaf = null;
  }
  tlState._tlJustScrubbed = true;
  renderTimelapseAt(
    tlState._tlSliderPendingIdx != null
      ? tlState._tlSliderPendingIdx
      : tlState.currentIdx,
    { crossfade: true },
  );
}
document
  .getElementById("tl-slider")
  .addEventListener("pointerup", tlSliderPointerUp);
document.addEventListener("pointerup", tlSliderPointerUp);

// input: fires continuously during drag — keep slider visual responsive, debounce heavy render
document.getElementById("tl-slider").addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  const max = parseInt(e.target.max, 10) || 1;
  // Always update the slider track fill immediately (cheap CSS-only)
  e.target.style.setProperty("--slider-pct", `${(val / max) * 100}%`);
  tlState._tlSliderPendingIdx = val;

  // Update commit info + counter immediately (lightweight DOM updates, no debounce)
  const commit = tlState.commits[val];
  if (commit) {
    document.getElementById("tl-label-current").textContent =
      `${val + 1} / ${tlState.commits.length}`;
    const date = new Date(commit.date);
    const dateStr =
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const badge = commit.isWiki
      ? '<span class="commit-badge wiki">wiki</span>'
      : '<span class="commit-badge code">code</span>';
    // UXO-093: show "restored" badge on slider drag too
    const restoredBadgeD =
      tlState.restoredHash && commit.hash === tlState.restoredHash
        ? '<span class="commit-badge" style="background:var(--accent);color:#fff;margin-left:2px">restored</span>'
        : "";
    // UXO-092: View Diff button in slider-drag commit info (lightweight, no hash check needed here)
    const viewDiffBtnD =
      commit.hash !== "__empty__"
        ? `<button class="btn-sm" style="margin-left:auto;flex-shrink:0" onclick="openDiffModal('${commit.hash}','${commit.hashShort}','${esc(commit.message).replace(/'/g, "&#39;")}')">View Diff</button>`
        : "";
    document.getElementById("tl-commit-info").innerHTML =
      `<span class="tl-hash">${commit.hashShort}</span>${badge}${restoredBadgeD}<span>${esc(commit.message)}</span><span style="margin-left:auto;color:var(--text-muted)">${dateStr} · ${commit.author}</span>${viewDiffBtnD}`;
  }

  // In graph mode, skip heavy renders during drag — only render on release
  if (tlState.mode === "graph") return;

  // Debounce the expensive tree render (100ms) to avoid blocking the UI thread
  if (tlState._tlRenderDebounce != null)
    clearTimeout(tlState._tlRenderDebounce);
  tlState._tlRenderDebounce = setTimeout(() => {
    tlState._tlRenderDebounce = null;
    renderTimelapseAt(val, { crossfade: false });
  }, 100);
});

// change: fires once on slider release (mouse up / touch end) — final authoritative render
document.getElementById("tl-slider").addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10);
  if (tlState._tlRenderDebounce != null) {
    clearTimeout(tlState._tlRenderDebounce);
    tlState._tlRenderDebounce = null;
  }
  if (tlState._tlSliderRaf != null) {
    cancelAnimationFrame(tlState._tlSliderRaf);
    tlState._tlSliderRaf = null;
  }
  renderTimelapseAt(val, { crossfade: true });
});
document.getElementById("tl-play").addEventListener("click", tlPlay);
document.getElementById("tl-prev").addEventListener("click", () => {
  if (tlState.currentIdx > 0)
    renderTimelapseAt(tlState.currentIdx - 1, { crossfade: true });
});
document.getElementById("tl-next").addEventListener("click", () => {
  if (tlState.currentIdx < tlState.commits.length - 1)
    renderTimelapseAt(tlState.currentIdx + 1, { crossfade: true });
});
document.getElementById("tl-speed").addEventListener("change", () => {
  if (tlState.playing) {
    tlPause();
    tlPlay();
  }
});
document.getElementById("tl-mode-tree").addEventListener("click", () => {
  tlState.mode = "tree";
  document.getElementById("tl-mode-tree").classList.add("active");
  document.getElementById("tl-mode-graph").classList.remove("active");
  document.getElementById("tl-tree-view").style.display = "";
  document.getElementById("tl-graph-view").style.display = "none";
  renderTimelapseAt(tlState.currentIdx);
});
document.getElementById("tl-mode-graph").addEventListener("click", () => {
  tlState.mode = "graph";
  document.getElementById("tl-mode-graph").classList.add("active");
  document.getElementById("tl-mode-tree").classList.remove("active");
  document.getElementById("tl-tree-view").style.display = "none";
  document.getElementById("tl-graph-view").style.display = "";
  renderTimelapseAt(tlState.currentIdx);
});
document.getElementById("tl-restore").addEventListener("click", () => {
  const commit = tlState.commits[tlState.currentIdx];
  if (commit) restoreToCommit(commit.hash, commit.hashShort);
});

// ── Init ──
async function init() {
  connectPipelineSSE();
  await Promise.all([loadHome(), loadTree()]);
  loadGitBadge();
  showView("home");
}
init();

// ── Floating Selection Toolbar (Notion-style) ──
const _selToolbar = document.getElementById("selection-toolbar");

function hideSelToolbar() {
  _selToolbar.classList.remove("visible");
}

function markDirty() {
  if (!state.editing) return;
  state.wysiwygDirty = true;
  document.getElementById("wysiwyg-dirty").classList.add("visible");
  const tab = state.tabs.find((t) => t.id === state.activeTabId);
  if (tab) {
    tab.dirty = true;
    renderTabs();
  }
}

function positionSelToolbar() {
  if (!state.editing) {
    hideSelToolbar();
    return;
  }
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    hideSelToolbar();
    return;
  }
  const body = document.getElementById("page-body");
  if (!body.contains(sel.anchorNode)) {
    hideSelToolbar();
    return;
  }
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0) {
    hideSelToolbar();
    return;
  }
  _selToolbar.classList.add("visible");
  const tbHeight = _selToolbar.offsetHeight;
  const tbWidth = _selToolbar.offsetWidth;
  let left = rect.left + rect.width / 2;
  let top = rect.top - tbHeight - 8;
  if (left - tbWidth / 2 < 8) left = tbWidth / 2 + 8;
  if (left + tbWidth / 2 > window.innerWidth - 8)
    left = window.innerWidth - tbWidth / 2 - 8;
  if (top < 8) top = rect.bottom + 8;
  _selToolbar.style.left = left + "px";
  _selToolbar.style.top = top + "px";
}

document.addEventListener("selectionchange", () => {
  if (!state.editing) {
    hideSelToolbar();
    return;
  }
  setTimeout(positionSelToolbar, 10);
});
document.addEventListener("mouseup", (e) => {
  if (_selToolbar.contains(e.target)) return;
  setTimeout(positionSelToolbar, 10);
});
document.addEventListener("mousedown", (e) => {
  if (!_selToolbar.contains(e.target) && !_selPreventHide)
    hideSelToolbar();
});

let _selPreventHide = false;
_selToolbar.addEventListener("mousedown", async (e) => {
  e.preventDefault();
  _selPreventHide = true;
  const btn = e.target.closest(".st-btn");
  if (!btn) return;
  const cmd = btn.dataset.cmd;
  const body = document.getElementById("page-body");
  body.focus();
  if (cmd === "bold") {
    document.execCommand("bold");
  } else if (cmd === "italic") {
    document.execCommand("italic");
  } else if (cmd === "code") {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      let node = sel.anchorNode;
      while (node && node !== body) {
        if (node.nodeType === 1 && node.tagName === "CODE") {
          const text = document.createTextNode(node.textContent);
          node.parentNode.replaceChild(text, node);
          const r = document.createRange();
          r.selectNodeContents(text);
          sel.removeAllRanges();
          sel.addRange(r);
          markDirty();
          setTimeout(positionSelToolbar, 10);
          setTimeout(() => {
            _selPreventHide = false;
          }, 100);
          return;
        }
        node = node.parentNode;
      }
      const range = sel.getRangeAt(0);
      const code = document.createElement("code");
      try {
        range.surroundContents(code);
      } catch {
        code.appendChild(range.extractContents());
        range.insertNode(code);
      }
      const nr = document.createRange();
      nr.selectNodeContents(code);
      sel.removeAllRanges();
      sel.addRange(nr);
    }
  } else if (cmd === "link") {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    let linkNode = sel.anchorNode;
    while (linkNode && linkNode !== body) {
      if (linkNode.nodeType === 1 && linkNode.tagName === "A") {
        document.execCommand("unlink");
        markDirty();
        setTimeout(() => {
          _selPreventHide = false;
        }, 100);
        return;
      }
      linkNode = linkNode.parentNode;
    }
    const url = await showInputModal("Insert Link", "https://", "", "Insert");
    if (!url) {
      setTimeout(() => {
        _selPreventHide = false;
      }, 100);
      return;
    }
    document.execCommand("createLink", false, url);
  } else if (cmd === "h2" || cmd === "h3") {
    document.execCommand("formatBlock", false, cmd);
  }
  markDirty();
  setTimeout(positionSelToolbar, 10);
  setTimeout(() => {
    _selPreventHide = false;
  }, 100);
});

// ── @Mention Autocomplete (ENT-002) ──
const _mentionPopup = document.getElementById("mention-popup");
let _mentionActive = false,
  _mentionQuery = "",
  _mentionItems = [],
  _mentionIdx = 0;

function getCaretCoords() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  return { left: rect.left, top: rect.bottom + 4 };
}

function showMentionPopup(query) {
  if (!state.allPages || !state.allPages.length) {
    hideMentionPopup();
    return;
  }
  const q = query.toLowerCase();
  _mentionItems = state.allPages
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.slug || "").toLowerCase().includes(q),
    )
    .slice(0, 8);
  if (!_mentionItems.length) {
    hideMentionPopup();
    return;
  }
  _mentionIdx = 0;
  _mentionPopup.innerHTML = _mentionItems
    .map((p, i) => {
      const typeLabel = (p.frontmatter?.type || "page").toLowerCase();
      return `<div class="mention-item${i === 0 ? " active" : ""}" data-idx="${i}">
    <span class="mention-item-type">${esc(typeLabel)}</span>
    <span>${esc(p.title)}</span>
  </div>`;
    })
    .join("");
  const coords = getCaretCoords();
  if (coords) {
    _mentionPopup.style.left =
      Math.min(coords.left, window.innerWidth - 330) + "px";
    _mentionPopup.style.top = coords.top + "px";
  }
  _mentionPopup.classList.add("visible");
  _mentionActive = true;
  _mentionPopup.querySelectorAll(".mention-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      insertMention(_mentionItems[+el.dataset.idx]);
    });
  });
}

function hideMentionPopup() {
  _mentionPopup.classList.remove("visible");
  _mentionPopup.innerHTML = "";
  _mentionActive = false;
  _mentionQuery = "";
  _mentionItems = [];
}

function insertMention(page) {
  if (!page) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) {
    hideMentionPopup();
    return;
  }
  const text = textNode.textContent;
  const caretPos = range.startOffset;
  const atIdx = text.lastIndexOf("@", caretPos - 1);
  if (atIdx === -1) {
    hideMentionPopup();
    return;
  }
  const before = text.substring(0, atIdx);
  const after = text.substring(caretPos);
  textNode.textContent = before + after;
  const link = document.createElement("a");
  link.className = "wikilink";
  link.href = "#";
  link.dataset.wikilink = page.title;
  link.textContent = page.title;
  link.onclick = (e) => {
    e.preventDefault();
    if (!state.editing) openPage(page.title);
  };
  const afterNode = textNode.splitText(before.length);
  textNode.parentNode.insertBefore(link, afterNode);
  const space = document.createTextNode(" ");
  link.parentNode.insertBefore(space, afterNode);
  const r = document.createRange();
  r.setStartAfter(space);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
  hideMentionPopup();
  markDirty();
}

document.getElementById("page-body").addEventListener("input", () => {
  if (!state.editing) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    hideMentionPopup();
    return;
  }
  const range = sel.getRangeAt(0);
  const textNode = range.startContainer;
  if (textNode.nodeType !== Node.TEXT_NODE) {
    hideMentionPopup();
    return;
  }
  const text = textNode.textContent.substring(0, range.startOffset);
  const atMatch = text.match(/@([a-zA-Z0-9 _-]{0,30})$/);
  if (atMatch) {
    _mentionQuery = atMatch[1];
    showMentionPopup(_mentionQuery);
  } else {
    hideMentionPopup();
  }
});

document.getElementById("page-body").addEventListener("keydown", (e) => {
  if (!_mentionActive) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    _mentionIdx = Math.min(_mentionIdx + 1, _mentionItems.length - 1);
    _mentionPopup
      .querySelectorAll(".mention-item")
      .forEach((el, i) =>
        el.classList.toggle("active", i === _mentionIdx),
      );
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _mentionIdx = Math.max(_mentionIdx - 1, 0);
    _mentionPopup
      .querySelectorAll(".mention-item")
      .forEach((el, i) =>
        el.classList.toggle("active", i === _mentionIdx),
      );
  } else if (e.key === "Enter" || e.key === "Tab") {
    if (_mentionItems[_mentionIdx]) {
      e.preventDefault();
      insertMention(_mentionItems[_mentionIdx]);
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    hideMentionPopup();
  }
});
