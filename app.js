"use strict";

const DEFAULTS = {
  defaultCommand: "g",
  alwaysNewTab: false,
  links: [],
};

let CONFIG = { ...DEFAULTS };
let lastInput = "";
let messageTimer = null;

const input = document.getElementById("input");
const messageEl = document.getElementById("message");

const commands = {
  g:   args => args.length ? `https://www.google.com/search?q=${enc(args)}` : "https://www.google.com",
  r:   args => args.length ? `https://www.reddit.com/r/${enc(args)}`       : "https://www.reddit.com",
  y:   args => args.length ? `https://www.youtube.com/results?search_query=${enc(args)}` : "https://www.youtube.com",
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
  lastInput = raw;

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
  if (!args.length) return msg("usage: set;<property>;<value>\nproperties: defaultCommand, newtab, reset");
  const [prop, value] = args;

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
    "  gc — google calendar",
    "  img;<query> — google images",
    "  gm;<query> — gmail",
    "",
    "meta",
    "  set;<prop>;<value> — defaultCommand | newtab | reset",
    "  link;add;<name>;<url>;[search]",
    "  link;show · link;delete;<name>",
    "",
    ";n at end → open in new tab",
    "↑ recall · esc clear",
  ].join("\n");
  msg(help, 45000);
}

const hasExtensionStorage = typeof chrome !== "undefined" && chrome?.storage?.sync;
const LOCAL_KEY = "tab-config";

async function loadConfig() {
  try {
    if (hasExtensionStorage) {
      const stored = await chrome.storage.sync.get("config");
      CONFIG = { ...DEFAULTS, ...(stored.config || {}) };
    } else {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) CONFIG = { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn("config load failed, using defaults", err);
  }
}

function saveConfig() {
  if (hasExtensionStorage) {
    chrome.storage.sync.set({ config: CONFIG }).catch(err => {
      console.warn("failed to save config", err);
      msg("warning: config did not sync");
    });
  } else {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(CONFIG));
    } catch (err) {
      console.warn("localStorage save failed", err);
    }
  }
}

if (hasExtensionStorage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.config) {
      CONFIG = { ...DEFAULTS, ...changes.config.newValue };
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (document.activeElement !== input && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    input.focus();
  }

  if (e.key === "Enter") {
    const value = input.value;
    input.value = "";
    handleInput(value);
  } else if (e.key === "ArrowUp" && lastInput && document.activeElement === input) {
    e.preventDefault();
    input.value = lastInput;
    setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
  } else if (e.key === "Escape") {
    input.value = "";
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

claimFocus();
loadConfig().then(claimFocus);
