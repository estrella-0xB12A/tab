# tab

A minimal, keyboard-driven startpage. Live at **https://estrella-0xb12a.github.io/tab/**.

Set it as Brave's custom home URL (**Settings → Appearance → Show home button → Enter custom web address**), then press **Alt+Home** to open it with focus already in the input.

---

## Syntax

Every command uses **semicolons** as separators:

```
command;argument;argument
```

Examples:

```
g;rust book           google search "rust book"
r;askreddit           open r/askreddit
link;add;docs;https://developer.mozilla.org
```

If your input doesn't match a command, a custom link, or a URL, it falls through to the **default command** (Google search by default).

---

## Search commands

| command | destination | example |
|---|---|---|
| `g` | Google search | `g;typescript generics` |
| `r` | Reddit (subreddit) | `r;selfhosted` |
| `y` | YouTube search | `y;lofi mix` |
| `gh` | GitHub (path, not search) | `gh;torvalds/linux` |
| `gc` | Google Calendar | `gc` |
| `img` | Google Images | `img;sunset wallpaper` |
| `gm` | Gmail search | `gm;invoice` |

Each command with no argument just opens the site's homepage: `g` → google.com, `y` → youtube.com, etc. `gh` takes a GitHub path (user, user/repo, org, etc.) rather than a search query; for searching GitHub use `g;github <query>`.

---

## Custom links

Add your own shortcuts. They sync via `localStorage` per browser.

```
link;add;<name>;<url>                   add a bare shortcut
link;add;<name>;<url>;<search_suffix>   add a shortcut that accepts a query
link;show                               list all shortcuts
link;delete;<name>                      remove one
```

Examples:

```
link;add;gh;https://github.com
link;add;mdn;https://developer.mozilla.org;/search?q=
```

Then typing `gh` goes to github.com, and `mdn;flexbox` goes to MDN's search for "flexbox".

You cannot override built-in commands (`g`, `r`, `set`, `link`, etc).

---

## Settings

```
set;<property>;<value>
```

| property | accepts | notes |
|---|---|---|
| `bgColor` | `#rgb` or `#rrggbb` | page background |
| `textColor` | `#rgb` or `#rrggbb` | input + caret color |
| `fontSize` | `1.5rem`, `24px`, `110%`, etc. | accepts rem/em/px/% |
| `clock` | `on` / `off` / `12` / `24` | see below |
| `defaultCommand` | any built-in command | what runs when input matches nothing |
| `newtab` | `on` / `off` | open every result in a new tab |
| `reset` | *(no value)* | reset everything to defaults |

Leave the value off to just show the current setting: `set;bgColor`, `set;fontSize`, etc.

---

## Clock

Off by default. Displays in the bottom-right corner, dim gray.

```
set;clock;on      turn on
set;clock;off     turn off
set;clock;12      12-hour format (e.g. "9:42 pm")
set;clock;24      24-hour format (e.g. "21:42")
set;clock         show current state
```

## Greeting

A time-aware greeting always shows in the bottom-left: "good morning, Estrella" / "good afternoon, Estrella" / "good evening, Estrella" / "late one, Estrella". To change the name, edit the `updateGreeting()` function in `app.js`.

---

## Keyboard shortcuts

| key | action |
|---|---|
| `Enter` | run the command |
| `↑` / `↓` | walk through command history (last 50) |
| `Esc` | clear the input and any message |
| `;n` at end of command | force that result to open in a new tab (e.g. `g;rust;n`) |

---

## Built-in meta commands

```
help     show an in-page cheat sheet (short version of this file)
set      change settings (see above)
link     manage custom links (see above)
```

---

## Files

Five files, no build step, no dependencies:

```
index.html      page structure
style.css       theme, layout, clock, animation
app.js          all logic
inter.woff2     bundled Inter Variable font (~350 KB)
README.md       this file
```

---

## Updating

Edit anything in this folder, then:

```sh
git add -A
git commit -m "describe your change"
git push
```

GitHub Pages rebuilds in ~30 seconds. **Hard-reload** the page (`Ctrl+Shift+R`) to bypass the browser cache — GitHub Pages sets a 10-minute cache lifetime.

---

## Settings storage

All preferences (colors, font, clock state, custom links) live in your browser's **localStorage**, per browser per device. There's no cross-device sync. If you want the same setup on another machine, configure it once there.

---

## Why this exists

Forked in spirit from [koryschneider/tab](https://github.com/KorySchneider/tab), rebuilt from scratch to drop 2019-era npm dependencies, fix `innerHTML` injection paths, enforce HTTPS, and simplify to only the commands I actually use.
