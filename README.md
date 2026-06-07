# 🏆 WC Draft Game

A real-time multiplayer World Cup nation draft game. Players take turns spinning a wheel to land on a nation, then pick a footballer from that nation's squad to build their ultimate 15-player team.

---

## ✨ Features

- **Spin-to-draft** — a live animated wheel lands on one of 12 nations (France, Spain, England, Germany, Brazil, Portugal, Argentina, Belgium, Uruguay, Croatia, Netherlands, Morocco)
- **Real-time multiplayer** — 2–8 players per room via Socket.io
- **Pitch view** — drag-and-drop lineup builder with 10 supported formations
- **Trade window** — unlocks after 22 picks; any player can open it to propose player swaps, gifts, and spin tokens
- **Squad compare** — side-by-side mini pitch visual to compare two lineups during the trade window
- **Game over screen** — final squad rankings by average OVR with live chat
- **Session persistence** — page refresh rejoins the active room automatically
- **Auto-draft** — if a player's 2:30 timer expires, a footballer is auto-picked

---

## 🗂 Project Structure

```
wc-draft-game/
├── backend/                    # Node.js + Express + Socket.io server
│   ├── src/
│   │   ├── server.js           # Socket.io event handlers, game logic orchestration
│   │   └── services/
│   │       ├── csvLoader.js    # Parses squad_with_ratings.csv at startup
│   │       └── roomState.js    # In-memory room state, draft, trade, timer logic
│   ├── squad_with_ratings.csv  # Player data (OVR, nation, face/card URLs)
│   ├── .env.example
│   ├── nixpacks.toml           # Railway build config
│   └── Procfile                # Heroku / Railway start command
│
└── frontend/                   # React + Vite + Tailwind CSS
    ├── src/
    │   ├── App.jsx             # Root: socket wiring, phase routing, layout
    │   ├── components/
    │   │   ├── Lobby.jsx       # Create / join room form
    │   │   ├── SpinWheel.jsx   # Animated SVG wheel + spin button + trade unlock
    │   │   ├── PitchView.jsx   # Drag-and-drop lineup pitch for own/other squads
    │   │   ├── DraftOverlay.jsx# Pick panel shown after wheel stops
    │   │   ├── PlayerCard.jsx  # Footballer card (compact pitch token + full draft card)
    │   │   ├── ChatWindow.jsx  # Room-wide live chat
    │   │   ├── TradeWindow.jsx # Full-screen trade overlay (compare + propose + chat)
    │   │   ├── GameOverScreen.jsx # Final rankings + side-by-side compare + chat
    │   │   └── FlagImg.jsx     # Flag image via flagcdn.com
    │   └── constants/
    │       └── formations.js   # Formation slot coordinates, nation colors & flag codes
    ├── vercel.json             # Vercel deploy config (SPA rewrite)
    ├── vite.config.js
    └── .env.example
```

---

## 🚀 Deploy

### Frontend — Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   VITE_BACKEND_URL=https://your-backend.railway.app
   ```
5. Deploy — Vercel auto-detects Vite

### Backend — Railway (recommended)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the repo, set **Root Directory** to `backend`
3. Railway reads `nixpacks.toml` automatically — no extra config needed
4. Add environment variable:
   ```
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
5. Copy the generated Railway URL and paste it as `VITE_BACKEND_URL` in Vercel

---

## 💻 Local Development

### Prerequisites

- Node.js 18+
- npm

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:3001`

### Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env and set: VITE_BACKEND_URL=http://localhost:3001
npm install
npm run dev
```

Runs on `http://localhost:5173`

---

## 🎮 How to Play

1. **Create a room** — enter a Room ID, password, and nickname
2. **Share** the Room ID and password with friends (2–8 players)
3. **Take turns spinning** the wheel — it lands on a nation
4. **Pick a footballer** from that nation's squad to add to your bench
5. **Arrange your lineup** on the pitch using drag and drop
6. After **22 picks**, any player can open the **Trade Window** to propose swaps
7. The game ends when every player has **15 players** — final rankings by squad average OVR

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Socket.io-client |
| Backend | Node.js, Express, Socket.io |
| Data | CSV (squad ratings with card/face image URLs) |
| Deploy | Vercel (frontend), Railway (backend) |

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_BACKEND_URL` | Full URL of the deployed backend |

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (Railway sets this automatically) |
| `FRONTEND_URL` | Frontend URL for CORS (use `*` in dev) |
