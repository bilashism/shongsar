# Shongsar (সংসার) — UI & Theming Unification Plan (AI Studio ⟷ Apps Script Web App)

This plan outlines the changes to achieve 1:1 visual parity, unified theming, and identical layout between the AI Studio preview and the live deployed Google Apps Script Web App (`script.google.com/macros/s/.../exec`).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following visual and layout decisions were confirmed during interactive clarification:
> - **Unified Theme**: The Deep Dark Slate theme (`#0B1120` canvas, `#0F172A` cards, `#1E293B` borders, emerald `#059669` accents) matching the AI Studio preview will be the standard default for both environments.
> - **Header & Controls Parity**: The deployed Apps Script Web App (`frontend/Index.html` & `frontend/Styles.html`) will include the full Command Center header, month selector (`<input type="month">`), `Transfer Funds` action, and primary `+ Record Transaction` green pill button, matching the AI Studio layout.

---

## 1. Parity Audit & Root Cause Analysis

### Identified Differences
1. **Background & Card Surfaces**:
   - *AI Studio*: Deep navy dark slate (`bg-slate-950` / `#0B1120`) with dark cards (`bg-slate-900`) and slate hairline borders (`border-slate-800`).
   - *Deployed Apps Script*: Light slate (`bg-slate-50`) with white cards (`bg-white`).
2. **Command Center Header**:
   - *AI Studio*: Features "Family Financial Command Center" with the calendar month picker (`October 2026`), `Transfer Funds` button, and `+ Record Transaction` green button.
   - *Deployed Apps Script*: Simplified header missing the month selector and inline quick transfer actions.
3. **KPI Cards & Metric Badges**:
   - *AI Studio*: Features icon badges (PiggyBank, Wallet, TrendingUp, TrendingDown) with dark translucent backdrops and sub-metrics (Liquid vs. Invested, Savings Rate, Net Surplus).
   - *Deployed Apps Script*: Plain cards without metric icon badges or sub-breakdowns.

---

## 2. Technical Architecture & Unified Component Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Design Tokens & Palettes                        │
│                                                                        │
│   Canvas Background:    #0B1120 (Slate 950)                            │
│   Surface / Card:       #0F172A (Slate 900)                            │
│   Surface Highlight:    #1E293B (Slate 800)                            │
│   Hairline Borders:     #334155 / rgba(255,255,255,0.08)               │
│   Primary Accent:       #059669 / #10B981 (Emerald)                    │
│   Typography:           Plus Jakarta Sans (Display/Body)               │
│   Tabular Numerals:     JetBrains Mono (tabular-nums)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│       AI Studio Preview       │               │  Google Apps Script Web App   │
│   (React + Vite + Tailwind)   │               │   (frontend/Index & Styles)   │
│                               │               │                               │
│ - Exact Dark Slate Palette    │ <═══════════> │ - Exact Dark Slate Palette    │
│ - Full Command Center Header  │   Identical   │ - Full Command Center Header  │
│ - Month Selector & Transfers  │  Visual Parity│ - Month Selector & Transfers  │
│ - 4 KPI Cards with Icon Badges│               │ - 4 KPI Cards with Icon Badges│
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 3. Implementation Steps

1. **Update `frontend/Styles.html`**:
   - Enforce dark theme baseline: `body { background-color: #0b1120; color: #f1f5f9; }`.
   - Add Tailwind dark-mode classes or direct style utility classes for deep slate surfaces (`bg-slate-900`, `border-slate-800`).
   - Include Lucide icon SVGs directly for the 4 KPI badges (PiggyBank, Wallet, TrendingUp, TrendingDown) to ensure hermetic rendering inside Apps Script `HtmlService`.
2. **Update `frontend/Index.html`**:
   - Replicate the exact Command Center header from AI Studio:
     - Title: "Family Financial Command Center"
     - Subtitle: "Real-time balance propagation backed by personal Google Spreadsheet database"
     - Controls: Month picker (`<input type="month">`), `Transfer Funds` button, and `+ Record Transaction` green button.
   - Update 4 KPI cards to include:
     - Icon badges with translucent backgrounds.
     - Large tabular figures with South Asian BDT notation (`৳ 15,54,100`).
     - Sub-metric footers (Liquid vs Invested, Emergency Pot, Savings Rate, Net Surplus).
   - Update Linked Financial Pots and Budget Envelopes to match dark cards.
3. **Update `frontend/Scripts.html`**:
   - Add dynamic month filtering to recalculate monthly inflow, outflow, and budget envelope progress based on the selected month.
   - Maintain client-side RPC bridge calling `apiGetFullData()`.
4. **Update `src/services/appsScriptProject.ts` and `.github/workflows/deploy.yml`**:
   - Ensure the updated `frontend/` files are bundled in the repository and the ZIP export.
5. **Enforce Dark Slate Theme in AI Studio `src/App.tsx` and `src/index.css`**:
   - Ensure the root `<html>` and `<body>` tags always default to `dark` mode (`class="dark"`), removing any inconsistent light backgrounds.
6. **Compile & Verification**:
   - Run `compile_applet` and `lint_applet` to verify compilation.
