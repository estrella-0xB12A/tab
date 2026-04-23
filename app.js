"use strict";

const DEFAULTS = {
  defaultCommand: "g",
  alwaysNewTab: false,
  links: [],
  bgColor: "#0c0c0c",
  textColor: "#dadde1",
  fontSize: "1.75rem",
  showClock: false,
  militaryClock: false,
};

let CONFIG = { ...DEFAULTS };
let messageTimer = null;

const HISTORY_KEY = "tab-history";
const HISTORY_MAX = 50;
let history = [];
let historyIndex = -1;
let draft = "";

const input = document.getElementById("input");
const messageEl = document.getElementById("message");
const clockEl = document.getElementById("clock");
const greetingEl = document.getElementById("greeting");

const commands = {
  g:   args => args.length ? `https://www.google.com/search?q=${enc(args)}` : "https://www.google.com",
  r:   args => args.length ? `https://www.reddit.com/r/${enc(args)}`       : "https://www.reddit.com",
  y:   args => args.length ? `https://www.youtube.com/results?search_query=${enc(args)}` : "https://www.youtube.com",
  gh:  args => args.length ? `https://github.com/${args.join("")}` : "https://github.com",
  gc:  ()   => "https://calendar.google.com",
  img: args => args.length ? `https://www.google.com/search?tbm=isch&q=${enc(args)}` : "https://www.google.com",
  gm:  args => args.length ? `https://mail.google.com/mail/u/0/#search/${enc(args)}` : "https://mail.google.com",
};

const metaCommands = {
  help: () => showHelp(),
  set:  args => setProp(args),
  link: args => manageLinks(args),
};

function enc(args) {
  return encodeURIComponent(args.join(" "));
}

function handleInput(raw) {
  if (!raw.trim()) return;

  let trimmed = raw.trim();
  let newTab = CONFIG.alwaysNewTab;
  if (trimmed.endsWith(";n")) {
    newTab = true;
    trimmed = trimmed.slice(0, -2).trim();
  }

  const parts = trimmed.split(";").map(s => s.trim()).filter(Boolean);
  if (!parts.length) return;

  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (commands[cmd]) {
    const url = commands[cmd](args);
    if (url) navigate(url, newTab);
    return;
  }

  if (metaCommands[cmd]) {
    metaCommands[cmd](args);
    return;
  }

  const link = CONFIG.links.find(l => l.name === cmd);
  if (link) {
    const url = args.length && link.search
      ? link.url + link.search + encodeURIComponent(args.join(" "))
      : link.url;
    navigate(url, newTab);
    return;
  }

  if (looksLikeURL(parts[0])) {
    navigate(ensureProtocol(parts[0]), newTab);
    return;
  }

  const fallback = commands[CONFIG.defaultCommand] || commands.g;
  navigate(fallback([trimmed]), newTab);
}

function navigate(url, newTab) {
  if (newTab) window.open(url, "_blank");
  else window.location.href = url;
}

function looksLikeURL(s) {
  if (!s || s.includes(" ")) return false;
  if (!/\.[a-z]{2,}/i.test(s)) return false;
  try {
    new URL(s.includes("://") ? s : "https://" + s);
    return true;
  } catch {
    return false;
  }
}

function ensureProtocol(s) {
  return s.includes("://") ? s : "https://" + s;
}

function setProp(args) {
  if (!args.length) {
    return msg("usage: set;<property>;<value>\nproperties: bgColor, textColor, fontSize, clock, defaultCommand, newtab, reset");
  }
  const [prop, value] = args;

  if (prop === "bgColor" || prop === "textColor") {
    if (value === undefined) return msg(`${prop}: ${CONFIG[prop]}`);
    if (!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)) return msg("invalid hex color (#rgb or #rrggbb)");
    CONFIG[prop] = value;
    applyTheme();
    saveConfig();
    return msg(`${prop} → ${value}`);
  }

  if (prop === "fontSize") {
    if (value === undefined) return msg(`fontSize: ${CONFIG.fontSize}`);
    if (!/^[\d.]+(rem|em|px|%)$/.test(value)) return msg("invalid size (use rem, em, px, or %)");
    CONFIG.fontSize = value;
    applyTheme();
    saveConfig();
    return msg(`fontSize → ${value}`);
  }

  if (prop === "clock") {
    if (value === undefined) {
      return msg(`clock: ${CONFIG.showClock ? "on" : "off"}, ${CONFIG.militaryClock ? "24h" : "12h"}`);
    }
    switch (value) {
      case "on":  CONFIG.showClock = true; break;
      case "off": CONFIG.showClock = false; break;
      case "12":  CONFIG.militaryClock = false; break;
      case "24":  CONFIG.militaryClock = true; break;
      default:    return msg("must be on, off, 12, or 24");
    }
    updateClock();
    saveConfig();
    return msg(`clock → ${value}`);
  }

  if (prop === "defaultCommand") {
    if (value === undefined) return msg(`defaultCommand: ${CONFIG.defaultCommand}`);
    if (!commands[value]) return msg(`${value} is not a search command`);
    CONFIG.defaultCommand = value;
    saveConfig();
    return msg(`defaultCommand → ${value}`);
  }

  if (prop === "newtab" || prop === "alwaysNewTab") {
    if (value === undefined) return msg(`alwaysNewTab: ${CONFIG.alwaysNewTab ? "on" : "off"}`);
    CONFIG.alwaysNewTab = value === "on";
    saveConfig();
    return msg(`alwaysNewTab → ${CONFIG.alwaysNewTab ? "on" : "off"}`);
  }

  if (prop === "reset") {
    CONFIG = { ...DEFAULTS };
    applyTheme();
    updateClock();
    saveConfig();
    return msg("reset to defaults");
  }

  msg(`unknown property: ${prop}`);
}

function manageLinks(args) {
  if (!args.length) {
    return msg("usage:\nlink;add;<name>;<url>;[search_suffix]\nlink;show\nlink;delete;<name>");
  }
  const [sub, ...rest] = args;

  if (sub === "show") {
    if (!CONFIG.links.length) return msg("no custom links");
    return msg(CONFIG.links.map(l => `${l.name} → ${l.url}${l.search ? "  (" + l.search + ")" : ""}`).join("\n"), 30000);
  }

  if (sub === "delete") {
    const name = rest[0];
    if (!name) return msg("usage: link;delete;<name>");
    const before = CONFIG.links.length;
    CONFIG.links = CONFIG.links.filter(l => l.name !== name);
    saveConfig();
    return msg(before === CONFIG.links.length ? `no link named ${name}` : `deleted ${name}`);
  }

  if (sub === "add") {
    const [name, url, search] = rest;
    if (!name || !url) return msg("usage: link;add;<name>;<url>;[search_suffix]");
    if (commands[name] || metaCommands[name]) return msg(`${name} is a built-in command`);
    if (!looksLikeURL(url)) return msg(`invalid url: ${url}`);
    const cleanUrl = ensureProtocol(url);
    CONFIG.links = CONFIG.links.filter(l => l.name !== name);
    CONFIG.links.push({ name, url: cleanUrl, search: search || "" });
    saveConfig();
    return msg(`added: ${name} → ${cleanUrl}`);
  }

  msg(`unknown link action: ${sub}`);
}

function msg(text, persistMs = 7000) {
  clearTimeout(messageTimer);
  messageEl.textContent = text;
  if (persistMs > 0) {
    messageTimer = setTimeout(() => { messageEl.textContent = ""; }, persistMs);
  }
}

function showHelp() {
  const help = [
    "search",
    "  g;<query> — google",
    "  r;<sub> — reddit",
    "  y;<query> — youtube",
    "  gh;<user/repo> — github",
    "  gc — google calendar",
    "  img;<query> — google images",
    "  gm;<query> — gmail",
    "",
    "meta",
    "  set;<prop>;<value>",
    "    bgColor | textColor | fontSize",
    "    clock (on | off | 12 | 24)",
    "    defaultCommand | newtab | reset",
    "  link;add;<name>;<url>;[search]",
    "  link;show · link;delete;<name>",
    "",
    ";n at end → open in new tab",
    "↑ / ↓ history · esc clear",
  ].join("\n");
  msg(help, 45000);
}

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty("--bg", CONFIG.bgColor);
  root.style.setProperty("--text", CONFIG.textColor);
  document.body.style.fontSize = CONFIG.fontSize;
}

function updateClock() {
  if (!CONFIG.showClock) {
    clockEl.hidden = true;
    return;
  }
  clockEl.hidden = false;
  const d = new Date();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  if (CONFIG.militaryClock) {
    clockEl.textContent = `${String(d.getHours()).padStart(2, "0")}:${minutes}`;
  } else {
    const h24 = d.getHours();
    const ampm = h24 >= 12 ? "pm" : "am";
    const h = h24 % 12 || 12;
    clockEl.textContent = `${h}:${minutes} ${ampm}`;
  }
}

function updateGreeting() {
  const h = new Date().getHours();
  let when;
  if (h >= 5 && h < 12)       when = "good morning";
  else if (h >= 12 && h < 17) when = "good afternoon";
  else if (h >= 17 && h < 22) when = "good evening";
  else                        when = "late one";
  greetingEl.textContent = `${when}, Estrella`;
}

setInterval(() => { updateClock(); updateGreeting(); }, 1000);

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    history = raw ? JSON.parse(raw) : [];
  } catch {
    history = [];
  }
}

function pushHistory(cmd) {
  if (history[history.length - 1] === cmd) return;
  history.push(cmd);
  if (history.length > HISTORY_MAX) history.shift();
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

const LOCAL_KEY = "tab-config";

function loadConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) CONFIG = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn("config load failed, using defaults", err);
  }
}

function saveConfig() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(CONFIG));
  } catch (err) {
    console.warn("localStorage save failed", err);
  }
}

document.addEventListener("keydown", (e) => {
  if (document.activeElement !== input && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    input.focus();
  }

  if (e.key === "Enter") {
    const value = input.value;
    input.value = "";
    historyIndex = -1;
    draft = "";
    if (value.trim()) pushHistory(value);
    handleInput(value);
  } else if (e.key === "ArrowUp" && document.activeElement === input) {
    if (history.length === 0) return;
    e.preventDefault();
    if (historyIndex === -1) {
      draft = input.value;
      historyIndex = history.length - 1;
    } else if (historyIndex > 0) {
      historyIndex--;
    }
    input.value = history[historyIndex];
    setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
  } else if (e.key === "ArrowDown" && document.activeElement === input) {
    if (historyIndex === -1) return;
    e.preventDefault();
    if (historyIndex < history.length - 1) {
      historyIndex++;
      input.value = history[historyIndex];
    } else {
      historyIndex = -1;
      input.value = draft;
    }
    setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
  } else if (e.key === "Escape") {
    input.value = "";
    historyIndex = -1;
    draft = "";
    msg("", 0);
  }
});

document.body.addEventListener("click", () => input.focus());

window.addEventListener("focus", () => input.focus());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) input.focus();
});

function claimFocus() {
  let attempts = 0;
  const tick = () => {
    input.focus();
    if (document.activeElement === input) return;
    if (attempts++ < 40) requestAnimationFrame(tick);
  };
  tick();
}

loadHistory();
loadConfig();
applyTheme();
updateClock();
updateGreeting();
claimFocus();
