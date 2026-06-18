# 🌌 NeonGrid

NeonGrid is a real-time, high-frequency collaborative multiplayer pixel canvas game. Stake your claim, compete on the leaderboard, and watch updates pulse across the global grid instantly. 

Built with a vibrant neon glassmorphism aesthetic, smooth micro-animations, and responsive mobile-first panning and zooming.

---

## 🚀 Key Features

* **Instant WebSockets Sync:** Powered by Socket.io, every single claim is synchronized globally with sub-millisecond event cycles.
* **Responsive Pinch-to-Zoom & Pan:** Native touchscreen support allowing players to zoom into pixel groups and drag-pan the canvas.
* **Retro Audio Synthesizer:** Built using the native Web Audio API to generate custom dynamic synth blips on joins, claims, and clicks.
* **Automation Shield (Cooldowns):** Enforces a visual 2-second rate-limiting cooldown between claims to balance gameplay and block click bots.
* **Live Spectator Mode:** Let users watch the pixel canvas evolve in real time before choosing to sign up and join.
* **Collapsible HUDs:** Sleek floating HUD panels that automatically collapse on smaller screens to maximize viewport layout.

---

## 🛠️ Tech Stack

### Client (Frontend)
* **React 19 & TypeScript** — Component state architecture and type safety.
* **Vite** — Optimized production bundler and fast HMR development server.
* **Custom Vanilla CSS** — Premium glassmorphism effects, shadows, and keyframe animations.
* **React-zoom-pan-pinch** — Smooth zoom controls for responsive touch screens.
* **Socket.io-client** — WebSocket client.

### Server (Backend)
* **Node.js & Express** — Lightweight server runtime.
* **Socket.io** — Persistent TCP socket manager.
* **TypeScript** — Compiles to clean ESM JavaScript for production performance.

---

## 📁 Project Structure

```
├── client/           # React frontend application
│   ├── src/          # Source files (App.tsx, index.css, main.tsx)
│   ├── dist/         # Compiled production assets (Git-ignored)
│   └── .env.example  # Frontend environment template
│
└── server/           # Node.js backend application
    ├── index.ts      # Server entry point
    ├── dist/         # Compiled production build (Git-ignored)
    └── .env.example  # Backend environment template
```

---

## 💻 Local Quick Start

### 1. Run the Backend Server
```bash
cd server
npm install
npm run dev
```
*The server will start on `http://localhost:3001`.*

### 2. Run the Frontend Client
```bash
cd client
npm install
npm run dev
```
*The client will start, usually on `http://localhost:5173`.*

---

## 🌐 Production Deployment Guide

This project is optimized for deployment on Vercel (Frontend) and Render/Railway (Backend).

### Step 1: Backend Deployment (Render or Railway)
1. Set the **Root Directory** to `server`.
2. Set the **Build Command** to `npm install && npm run build`.
3. Set the **Start Command** to `npm start`.
4. Set the following environment variable:
   * `CLIENT_URL` = `https://your-frontend.vercel.app` (or `*` to allow all origins).

### Step 2: Frontend Deployment (Vercel or Netlify)
1. Set the **Root Directory** to `client`.
2. Set the **Build Command** to `npm run build`.
3. Set the **Output Directory** to `dist`.
4. Set the following environment variable:
   * `VITE_SERVER_URL` = `https://your-backend-app.onrender.com` (Your deployed backend URL).
5. **Important:** Trigger a **Redeploy** on Vercel if you update this variable after the first build.
