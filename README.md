# Velo Pharma — Pharmacy ERP & POS

A complete pharmacy management & POS ERP rebuilt with a fresh **Velo CRM-inspired UI** (dark green + lime accent, pastel card gradients, generous rounded corners) and full **dark + light mode** support.

Re-implemented from the feature set of [`gourab-stu/infinity-solutions-web`](https://github.com/gourab-stu/infinity-solutions-web) — same features, brand-new UI, runs fully in the browser (no backend required; data persists in `localStorage`).

## ✨ Features (same as original)

| Module | What it does |
| --- | --- |
| **POS Billing Counter** | Keyboard-first checkout (F1 search, F3 mode toggle, F8 hold, F9 recall, F10 checkout), **FEFO batch allocation**, retail/wholesale modes, multi-mode payment (Cash/UPI/Card/Bank/Credit), instant GST tax invoice with print |
| **Sales History** | Daywise filters (Today / Yesterday / 7 Days / This Month / All), retail & wholesale split, credit settlement, reprint any invoice |
| **Inventory & Stock** | Hierarchical batch tracking, three-tier expiry watch (Active / Near-Expiry / Expired quarantine), stock adjustments (damage, write-off, audit), low-stock alerts |
| **Purchases (GRN)** | Record supplier inward, auto-creates batches in inventory, landed cost, GST input credit, vendor payables |
| **Customers, Vendors & Doctors** | Retail patients, wholesale B2B accounts, hospitals, suppliers/distributors, prescribing doctors registry (Schedule H compliance) |
| **Analytics & Reports** | Sales trend chart, top-selling medicines, fast vs slow moving, **GSTR-1 tax summary** by GST slab (0/5/12/18/28%), profit margins |
| **Store Settings** | Pharmacy identity, GSTIN, DL license, thermal print toggle, invoice footer, one-click demo data reset |

## 🎨 UI Design (matches the provided Velo reference)

- **Sidebar**: rounded "velo" logo (dark-green tile + lime V + sparkle), onboarding banner, "New Sale" button, nav items with active dark-green pill + lime text, stock-watch badge, footer status
- **Header**: collapse toggle, page title + subtitle, rounded search, date/clock chips, DB-status pill, theme toggle (sun/moon)
- **Dashboard**: 6 pastel-gradient stat cards with icon tiles + huge numbers + "Last Month ⌄" pills, Recent Activities panel with colored icon tiles, Tasks checklist with flags, Quick Actions
- **Theme**: Light (warm green-tinted background, pastel cards) + Dark (charcoal with lime accents) — persisted in `localStorage`, instant toggle

## 🛠 Tech Stack

- **React 18 + TypeScript + Vite 5**
- **lucide-react** icons
- **Plus Jakarta Sans** + **JetBrains Mono** fonts
- Pure CSS with CSS variables (no Tailwind) for theming
- `localStorage`-backed data layer with realistic seed data (16 medicines, 9 customers, 5 suppliers, 4 doctors, 24 sales, 6 purchases)

## 🚀 Quick Start (local)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the build
```

## ☁️ Deploy to Vercel

### Option A — One command (with a token)

```bash
bash deploy.sh <YOUR_VERCEL_TOKEN>
```

Get a token at https://vercel.com/account/tokens

### Option B — Vercel CLI

```bash
npm i -g vercel
cd velo-pharma
vercel deploy --prod --token=<YOUR_VERCEL_TOKEN>
```

### Option C — Dashboard

1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new → import the repo
3. Framework preset: **Vite** (auto-detected)
4. Build command: `npm run build` • Output: `dist`
5. Deploy

`vercel.json` is already configured for Vite.

## 📁 Structure

```
velo-pharma/
├── src/
│   ├── components/
│   │   ├── Shell.tsx          # App shell: sidebar + header + theme toggle
│   │   └── ui.tsx             # Toast, Modal, useToast hooks
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── BillingTerminal.tsx    # POS + InvoiceModal
│   │   ├── SalesHistory.tsx
│   │   ├── InventoryManager.tsx
│   │   ├── PurchaseManager.tsx
│   │   ├── PartyManager.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   └── SettingsManager.tsx
│   ├── store/
│   │   └── StoreContext.tsx       # localStorage data layer + FEFO
│   ├── types/index.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── seed.ts                # demo data
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                  # Velo theme tokens (light + dark)
├── public/logo.svg
├── vercel.json
├── deploy.sh
└── package.json
```

## 📝 Notes

- All data lives in the browser's `localStorage` under the key `velo_pharma_v1`. Use **Settings → Reset Demo Data** to restore seed defaults.
- The invoice "Print" button opens a print-ready A4 GST invoice in a new window.
- Hotkeys (F1/F3/F8/F9/F10) work on the Billing page.
