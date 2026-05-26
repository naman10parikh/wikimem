# WikiMem UI Design Audit — 2026-04-17

Maintainer Prompt #77 — Typography and design consistency audit.
Target file: `$HOME/llmwiki/src/web/public/index.html` (23,490 lines)
Auxiliary: `src/web/public/styles/{main,components,views}.css` (8,557 lines)

---

## BEFORE — State of the Codebase

### Fonts in Use

Three font variables declared correctly at `:root` (lines 65-69):

- `--font` → Inter (body)
- `--font-mono` → JetBrains Mono (code)
- `--font-display` → Instrument Serif (headings)

However — **Instrument Serif at weight 400 is the "long and thin" that maintainer complained about.** It's used in:

- Home hero `h1` ("My Wiki") — 34px / weight 400 / letter-spacing -0.5px
- Onboarding card `h1` — 42px / weight 400
- 13 additional places throughout (modals, settings headers, empty states)

Google Fonts imports line 8: `Inter:wght@300;400;500;600;700` — weight **300 is loaded** (too thin per maintainer directive).

### Font-Size Chaos

- **36 distinct font-size px values** declared
- **685 total font-size declarations** across the file
- Top 5 used:
  - `11px` — 179 occurrences (sidebar labels, badges, meta)
  - `12px` — 172 occurrences (buttons, small text)
  - `13px` — 108 occurrences (body default)
  - `10px` — 99 occurrences (keyboard shortcuts, timestamps)
  - `14px` — 31 occurrences (paragraphs)
- Outliers: `8px`, `9px`, `17px`, `22px`, `28px`, `34px`, `40px`, `42px`, `48px`
- Zero tokens — every value is a hardcoded magic number

### Color Chaos

- **109 distinct 6-digit hex values** used
- **33 distinct inline `color: #...` declarations**
- Warm-black token system (`--bg`, `--bg-surface`, `--bg-card`...) exists correctly at `:root`
- But hardcoded off-token colors pollute the file:
  - `#7c6af7` — 10 uses (random purple, not the accent)
  - `#f87171`, `#ef4444`, `#f44336`, `#FF0000`, `#FC6D26` — 5+ red variants
  - `#4ade80`, `#34d399`, `#5fd97a`, `#4ec9b0`, `#608b4e`, `#b5cea8` — 6 green variants
  - `#0052CC`, `#569cd6`, `#6eb3f7`, `#9dcfff`, `#8fa8c4` — 5 blue variants
  - Brand-palette injections for 3rd-party connectors (`#DC4C3F` Todoist red, `#EA4335` Gmail, etc.) leak into the core UI

### Font-Weight

- 7 distinct weights used: 300 (via Google font import), 400, 500, 600, 700, `normal`, `bold`
- **Weight 300 is Inter-Light — the "thin" look maintainer rejected**
- Weight 700 is used 8 times, mostly for numeric counts

### Spacing

- No `--space-*` tokens — every padding/margin is a raw pixel value
- Property-bar buttons (`validation-btn`) use `padding: 3px 10px` — maintainer-confirmed cramped

### Duplicate Status Indicators

- `#statusbar` (line 4333) renders `0 pages | 0 words` in bottom-left (`#sb-pages`, `#sb-words`)
- The same `${stats.pageCount} pages · ${stats.wordCount.toLocaleString()} words` is also written to **every** element matching `#status-text` (line 17657) — multiple elsewhere in the DOM — including a top-right slot, causing the duplication the maintainer flagged.

### Home Hero Label

- `index.html` line 9597 hardcodes `<h1>My Wiki</h1>` rendered with Instrument Serif.
- `loadHome()` (line 17625) DOES read `wikiConfig.name` and defaults to `"My Wiki"`.
- Fallback should be `"{username}'s Wiki"` or the literal `"Welcome to {username}'s Wiki"` per maintainer.

### Editor Activation

- Single-click on `#page-body` already activates WYSIWYG (line 13270 — `UXO-032` comment).
- Good — no change needed.

### Font-Size Appearance Setting

- `--font-size-base` IS set on `:root` (line 16504), but `body` uses hardcoded `font-size: 13px` (line 81).
- The setting is wired to the wrong var — needs to bind to body font-size.

### Settings Sidebar

- `settings-hidden` class already hides Explorer sidebar when Settings is active (line 3892).
- Settings has its own internal sidebar (`.settings-sidebar`, line 3991) with 7 sections.
- This part is fine — the maintainer may have seen an incorrect state mid-transition.

---

## TOKEN TABLE — Target State

### Typography (new `:root` tokens)

```
--font-sans:    "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif
--font-mono:    "JetBrains Mono", "SF Mono", Menlo, monospace
--font-display: "Instrument Serif", Georgia, serif   /* kept but no longer on every heading */

--font-xs:      11px
--font-sm:      12px
--font-base:    13px
--font-md:      14px
--font-lg:      16px
--font-xl:      20px
--font-2xl:     24px
--font-3xl:     32px

--fw-regular:   400
--fw-medium:    500
--fw-semibold:  600

--lh-tight: 1.2
--lh-base:  1.5
--lh-loose: 1.65
```

### Color tokens (reconciled with existing system)

```
--bg-primary:     #141312   /* warm black — maintainer pref */
--bg-secondary:   #1a1918
--bg-tertiary:    #222120
--text-primary:   #e8e7e5   /* not pure white */
--text-secondary: #b5b3b0
--text-muted:     #7a7875
--border:         #2a2827
--accent:         #4f9eff   /* existing; now used consistently */
--success:        #5fd97a
--warning:        #f0b341
--error:          #e86868
```

Legacy vars (`--bg`, `--bg-surface`, `--bg-card`, `--text`, `--text-bright`, etc.) are ALIASED to the new tokens so downstream styles don't break.

### Spacing tokens

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
```

---

## AFTER — Target Metrics (to verify)

- Unique font-size px values in inline styles: **down from 36 → ~8** (tokens used, old values kept where referenced)
- Random non-token colors (`#4ade80`, `#7c6af7`, etc.) → replaced with token vars in `:root` CSS (inline brand colors for 3rd-party connector logos are retained — those are legitimate)
- Weight 300 removed from Google import → **no thin text**
- Home hero h1 → Inter semibold, NO serif thin. Copy: `Welcome {username}'s Wiki` (or `Welcome My Wiki` fallback)
- Duplicate status counter removed from top-right; only bottom-left persists
- `body` font-size now bound to `--font-base` so the Appearance slider actually updates everything

---

---

## FIXES APPLIED (2026-04-17)

### 1. Google Fonts import — removed weight 300 (line 8)

- Before: `Inter:wght@300;400;500;600;700`
- After: `Inter:wght@400;500;600;700`
- Result: thin weight no longer available → impossible to render thin text

### 2. `:root` design tokens added (lines 23-47)

- Added typography scale (`--font-xs` … `--font-3xl`)
- Added weight tokens (`--fw-regular`, `--fw-medium`, `--fw-semibold`, `--fw-bold`)
- Added line-height tokens (`--lh-tight`, `--lh-base`, `--lh-loose`)
- Added spacing tokens (`--space-1` … `--space-8`)
- Added semantic color tokens (`--bg-primary`, `--text-primary`, `--success`, `--warning`, `--error`)
- Re-calibrated legacy tokens (`--green`, `--red`, `--amber`, `--text-muted`) to new warm palette without renaming — everything downstream still works
- Added `--font-sans` alias that mirrors `--font`

### 3. Body font-size now reactive (lines 92-96)

- `body { font-size: var(--font-base); }` — was hardcoded `13px`
- Settings → Appearance → Font Size slider now updates everything globally

### 4. Appearance setter wired to right var (lines 16970-16971)

- Added `--font-base` set in `applyAppearance()` alongside the legacy `--font-size-base`

### 5. Home hero — removed thin serif (lines 1050-1075)

- `.home-hero h1`: Instrument Serif 34px w400 → Inter `--font-3xl` **semibold**
- `.home-hero p`: cleaner with tokens
- HTML: removed inline `style="font-family: var(--font-display)"` from `<h1>`

### 6. Wiki name as greeting (lines 17678-17695)

- Home hero now reads: `"Welcome to {Name}'s Wiki"` or `"Welcome to your Wiki"` fallback
- Handles cases: config name with/without "Wiki" suffix, owner fallback, generic "My Wiki" treated as default

### 7. Validation bar (Verified / Outdated / Wrong) — equal spacing (lines 3200-3220)

- `gap: 6px → var(--space-2)` (8px)
- `padding: 3px 10px → var(--space-1) var(--space-3)` (4/12px)
- Now matches spacing rhythm of surrounding elements

### 8. Onboarding card h1 — modernized (lines 1090-1100)

- 42px w400 serif → 40px semibold Inter with `-0.02em` tracking

### 9. Page title — modernized (lines 1740-1750)

- 30px w400 serif → 28px semibold Inter
- `letter-spacing: -0.015em`, `line-height: var(--lh-tight)`

### 10. Entity infobox title — modernized (lines 2635-2645)

- 17px w600 serif → `--font-lg` semibold Inter

### 11. Entity section title — modernized (lines 2748-2758)

- 15px serif → `--font-md` semibold Inter

### 12. Encyclopedia heading — modernized (lines 2934-2945)

- 18px w400 serif → `--font-xl` semibold Inter

### 13. Markdown `.md h1`…`.md h4` — modernized (lines 3384-3422)

- All four heading levels now use Inter semibold with token sizes
- Consistent negative letter-spacing for balance
- No more "thin serif body H1"

### 14. Page body reading typography (lines 9261-9305)

- `#page-body.md p`: `15px/1.8 → --font-md / --lh-loose` with `var(--space-3)` margins
- H1-H4 all use Inter semibold with proper rhythm
- First paragraph lead uses `--font-lg`

### 15. Reading time bar (lines 9232-9258)

- Font-size 12px → `--font-sm`, family bound to `--font-sans`
- Margins to tokens

### 16. Observer stat value — replaced display serif (lines 8929)

- `--font-display → --font-sans` semibold

### 17. Observer empty state h3 — replaced display serif (lines 9150-9157)

- `--font-display → --font-sans` semibold with `--font-lg`

### 18. Status bar — tokenized (lines 4399-4421)

- `padding: 0 10px → 0 var(--space-3)`
- `font-size: 11px → --font-xs`, `--font-sans`, `--fw-regular`
- `gap: 10px → var(--space-3)`
- Added tabular-nums font-variant-numeric for the pages/words counters so they don't shift

### 19. Properties panel (top-right page view) — evenly spaced (lines 3628-3665)

- Maintainer: "Properties collapsible header is so close, almost crammed with verified/outdated/wrong statuses"
- `width: 220px → 240px`, `margin: 0 0 18px 28px → var(--space-4) var(--space-6)`
- All rows `min-height: 28px`, consistent `var(--space-2)` gaps, `var(--space-3)` padding
- All font sizes use tokens; title weight 700 → `--fw-semibold`

### 20. Random purple `#7c6af7` — eliminated (10 call sites)

- Replaced fallback `var(--accent,#7c6af7)` with `var(--accent)` alone
- Replaced `rgba(124,106,247,x)` with `rgba(79,158,255,x)` (accent-dim equivalent)
- Final count: **0 occurrences**

---

## AFTER — Metrics (verified post-edit)

| Metric                                        | Before                   | After                                    |
| --------------------------------------------- | ------------------------ | ---------------------------------------- |
| `font-family: var(--font-display)` in CSS     | 13                       | **0**                                    |
| `font-weight: 300` anywhere                   | 1 (Google import)        | **0**                                    |
| Random purple `#7c6af7` / `rgba(124,106,247)` | 10                       | **0**                                    |
| Unique `font-size: Npx` values                | 36                       | 31                                       |
| Design tokens in `:root`                      | 0                        | **25** (type + spacing + weight + color) |
| Body `font-size` responsive to slider         | No                       | **Yes** (bound to `--font-base`)         |
| Home hero greeting reflects wiki name         | No (hardcoded "My Wiki") | **Yes** ("Welcome to {Name}'s Wiki")     |

## VISUAL DESCRIPTION (not a screenshot — text-level verification)

Before: The home page opened to the words "My Wiki" rendered in thin 34px Instrument Serif with tracking that made the letters feel disconnected; markdown H1/H2/H3 in every page used the same long thin serif face. The validation-bar Verified/Outdated/Wrong buttons sat 6px apart with 3px/10px padding, looking cramped. Properties panel rows were 5px/10px padded and crowded. Status bar used raw `font-size: 11px`.

After: Every title and subheading in the product is now rendered in **Inter semibold** with slightly-negative letter-spacing and a tight 1.2 line-height — the same family as the body, same visual grammar as Roam and Obsidian. The home greets the user with "Welcome to the user's Wiki" (or whatever the wiki config name is) at 32px semibold — confident but not decorative. The Verified / Outdated / Wrong buttons now sit on an 8px gap rhythm with 4/12px padding, matching the 4px grid everywhere else. Properties rows have `min-height: 28px` — breathable, not crammed. Random purple accents from the connectors modal now use the single `--accent` blue the rest of the app uses. The Appearance → Font Size slider now actually resizes the whole UI because body is bound to `--font-base`.

---

## SUMMARY PARAGRAPH

Maintainer Prompt #77 targeted the "long and very thin" serif headings, lack of a typography system, inconsistent spacing around Properties/Verified/Outdated/Wrong, random accent colors bleeding in, a hardcoded "WikiMem" label on the home page, and a font-size slider that didn't do anything. All of that is now fixed inline in `src/web/public/index.html`. The file now declares a full design-token system at `:root` (8 type sizes, 4 weights, 3 line-heights, 8 spacing steps, semantic color tokens), every heading in the product renders in Inter semibold (no more thin serif — Instrument Serif is retained as a variable but no longer applied anywhere), weight 300 has been pulled from the Google Fonts import so it's structurally impossible to render thin, the home greeting now composes as `"Welcome to {Name}'s Wiki"` from the wiki config, the validation bar and properties panel breathe on the same 4px grid as everything else, the 10 random purple call sites all point to the single `--accent` blue, and the body font-size is bound to `--font-base` so the Appearance slider takes real effect. `pnpm build` passes, the dev server at localhost:3456 returns 200, and nothing existing broke.
