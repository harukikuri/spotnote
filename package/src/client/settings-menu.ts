// The launcher's Settings popover: the coding agent's status (with its own page
// on how to connect), accent colour, theme, which editor opens files, and the
// version.
import { ACCENTS, el } from "./ui.ts";
import { ICONS, MENU_ICONS } from "./icons.ts";
import { getSettings, setSetting, EDITORS, type Settings } from "./settings.ts";
import type { Controller, McpStatus } from "./types.ts";

// Fills `pop` (an empty popover). open() shows its main page; refreshStatus()
// redraws the agent's status when it changed.
export function createSettingsMenu(pop: HTMLElement, ctrl: Controller): { open(): void; refreshStatus(): void } {
  // A row of mutually exclusive choices; picking one saves it and re-renders.
  function choices<K extends keyof Settings>(
    parent: HTMLElement,
    cls: string,
    name: K,
    options: [Settings[K], string][],
    render: (b: HTMLButtonElement, value: Settings[K], label: string) => void,
  ) {
    const group = el("div", cls, parent);
    group.setAttribute("role", "radiogroup");
    for (const [value, label] of options) {
      const b = el("button", "", group);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(getSettings()[name] === value));
      render(b, value, label);
      b.addEventListener("click", () => {
        setSetting(name, value);
        renderSettings();
      });
    }
  }
  // Settings: a header (name + theme), then rows of label · value, grouped by
  // thin rules. What a row does is behind its (?), not spelled out underneath.
  // The MCP row opens its own page, with how to connect.
  let page = "main"; // or "agent"
  const THEMES: [Settings["theme"], string][] = [
    ["system", "System"],
    ["light", "Light"],
    ["dark", "Dark"],
  ];
  function label(parent: HTMLElement, text: string, help?: string) {
    const l = el("span", "snl-label", parent);
    l.append(text);
    if (!help) return l;
    const h = el("span", "snl-help", l);
    h.tabIndex = 0;
    h.setAttribute("aria-label", help);
    h.innerHTML = MENU_ICONS.help; // hardcoded SVG constants, not user input
    el("span", "snl-help-tip", h).textContent = help;
    h.addEventListener("click", (e) => e.stopPropagation()); // help only, even inside a row that's a button
    return l;
  }
  function renderSettings() {
    pop.textContent = "";
    mcpBox = null;
    shownMcp = null;
    (page === "agent" ? renderAgentPage : renderMainPage)();
  }
  function renderMainPage() {
    const head = el("div", "snl-head", pop);
    el("span", "snl-title", head).textContent = "Settings";
    // Theme: one button, cycling System → Light → Dark.
    const theme = getSettings().theme;
    const [, name] = THEMES.find(([k]) => k === theme) ?? THEMES[0];
    const tb = el("button", "snl-icon-btn", head);
    tb.title = `Theme: ${name} (Spotnote's panels, not your app)`;
    tb.setAttribute("aria-label", tb.title);
    tb.innerHTML = MENU_ICONS[theme] ?? MENU_ICONS.system; // hardcoded SVG constants
    tb.addEventListener("click", () => {
      const i = THEMES.findIndex(([k]) => k === theme);
      setSetting("theme", THEMES[(i + 1) % THEMES.length][0]);
      renderSettings();
    });

    // MCP → its page
    const agent = el("button", "snl-srow snl-link", pop);
    label(agent, "MCP", "Lets your agent pick up notes and reply, without copy and paste (spotnote-mcp).");
    mcpBox = el("span", "snl-value", agent);
    renderMcp();
    agent.addEventListener("click", () => {
      page = "agent";
      renderSettings();
    });

    el("div", "snl-rule", pop);
    const accent = el("div", "snl-srow", pop); // swatches on the right, like the other rows' values
    label(accent, "Accent color", "The outline, labels and pins on your page.");
    choices(
      accent,
      "snl-swatches",
      "accent",
      Object.entries(ACCENTS).map(([k, a]) => [k, a.name]),
      (b, k, n) => {
        b.style.setProperty("--c", ACCENTS[k].accent);
        b.title = n;
        b.setAttribute("aria-label", n);
      },
    );

    el("div", "snl-rule", pop);
    const files = el("label", "snl-srow", pop);
    label(files, "Open files in", "Where a file opens when you click its name in a note.");
    const select = el("select", "snl-select", files);
    for (const [key, { name: n }] of Object.entries(EDITORS)) {
      const o = el("option", "", select);
      o.value = key;
      o.textContent = n;
    }
    select.value = getSettings().editor;
    select.addEventListener("change", () => setSetting("editor", select.value));

    // Footer: which Spotnote this is, and where it lives.
    const about = ctrl.about;
    if (!about) return;
    const foot = el("div", "snl-foot", pop);
    // The version links to the releases: what changed in it.
    const title = el("span", "", foot);
    title.append("Spotnote ");
    const ver = el("a", "snl-ver", title);
    ver.href = `${about.repo}/releases`;
    ver.target = "_blank";
    ver.rel = "noopener noreferrer";
    ver.title = "Releases on GitHub";
    ver.textContent = `v${about.version}`;
    const gh = el("a", "snl-icon-btn", foot);
    gh.href = about.repo;
    gh.target = "_blank";
    gh.rel = "noopener noreferrer";
    gh.title = "Spotnote on GitHub";
    gh.setAttribute("aria-label", gh.title);
    gh.innerHTML = MENU_ICONS.github; // hardcoded SVG constants, not user input
  }

  function renderAgentPage() {
    const head = el("div", "snl-head", pop);
    const back = el("button", "snl-icon-btn snl-back", head);
    back.title = "Back";
    back.setAttribute("aria-label", "Back");
    back.innerHTML = MENU_ICONS.back; // hardcoded SVG constants
    back.addEventListener("click", () => {
      page = "main";
      renderSettings();
    });
    el("span", "snl-title", head).textContent = "MCP";
    const status = el("div", "snl-srow", pop);
    label(status, "Status");
    mcpBox = el("span", "snl-value", status);
    mcpHelp = el("div", "snl-agent", pop);
    renderMcp();
  }

  // Whether spotnote-mcp is running and has our notes (live, while Settings is
  // open). Not connected, the agent page says what connecting gives you and how.
  const MCP: Record<McpStatus, [string, string]> = {
    on: ["Connected", "Your agent picks up notes as you write them, and its replies show up on the note."],
    connecting: ["Connecting…", "Syncing your notes with your agent."],
    off: ["Not connected", "Connect your coding agent to hand it notes without copy and paste."],
  };
  // Not connected: how to connect, in two steps (as in the MCP guide).
  const MCP_STEPS: [string, string, string][] = [
    ["Add Spotnote to Claude Code, once:", "claude mcp add spotnote -- npx -y spotnote-mcp", "snl-cmd-shell"],
    ["In a new Claude Code session, ask:", "Watch my Spotnote notes.", "snl-cmd-ask"],
  ];
  let mcpBox: HTMLElement | null = null;
  let mcpHelp: HTMLElement | null = null;
  let shownMcp: McpStatus | null = null;
  function renderMcp() {
    const status = ctrl.mcpStatus();
    if (!mcpBox || status === shownMcp) return;
    shownMcp = status;
    mcpBox.textContent = "";
    const line = el("span", `snl-mcp snl-mcp-${status}`, mcpBox);
    el("span", "snl-dot", line);
    line.append(MCP[status][0]);
    if (page === "main") {
      el("span", "snl-chev", mcpBox).innerHTML = MENU_ICONS.next; // hardcoded SVG constants
      return;
    }
    if (!mcpHelp) return;
    mcpHelp.textContent = "";
    el("p", "snl-para", mcpHelp).textContent = MCP[status][1];
    if (status !== "off") return;
    const steps = el("ol", "snl-steps", mcpHelp);
    for (const [text, copyText, kind] of MCP_STEPS) {
      const li = el("li", "", steps);
      el("p", "snl-step-text", li).textContent = text;
      const cmd = el("div", `snl-cmd ${kind}`, li);
      el("code", "", cmd).textContent = copyText;
      const copy = el("button", "", cmd);
      copy.title = "Copy";
      copy.setAttribute("aria-label", "Copy");
      copy.innerHTML = ICONS.copy; // hardcoded SVG constants, not user input
      copy.addEventListener("click", () => {
        navigator.clipboard?.writeText(copyText).catch(() => {});
        copy.innerHTML = ICONS.check;
        setTimeout(() => (copy.innerHTML = ICONS.copy), 1200);
      });
    }
  }

  return {
    open() {
      page = "main";
      renderSettings();
    },
    refreshStatus: renderMcp,
  };
}
