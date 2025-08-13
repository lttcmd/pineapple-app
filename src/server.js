// src/server.js
import express from "express";
import http from "http";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config/env.js";
import { authRoutes } from "./auth/routes.js";
import { attachIO } from "./net/io.js";
import { initDatabase } from "./store/database.js";
import { mem } from "./store/mem.js";

const app = express();

// --- middleware
app.use(cors());
app.use(express.json());

// --- REST routes
app.use(authRoutes);

// --- static web (serve /src/web/*)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "web");
app.use(express.static(webRoot));

// optional: health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// monitoring endpoint
app.get("/monitor", (_req, res) => {
  const rooms = {};
  for (const [roomId, room] of mem.rooms) {
    rooms[roomId] = {
      id: room.id,
      phase: room.phase,
      round: room.round,
      roundIndex: room.roundIndex,
      timer: {
        isActive: room.timer.isActive,
        timeLeft: room.timer.timeLeft
      },
      players: {}
    };
    
    for (const [userId, player] of room.players) {
      rooms[roomId].players[userId] = {
        name: player.name,
        score: player.score || 0,
        ready: player.ready,
        hand: player.hand,
        board: player.board,
        discards: player.discards,
        currentDeal: player.currentDeal
      };
    }
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    activeRooms: mem.rooms.size,
    rooms
  });
});

// landing → login screen
app.get("/", (_req, res) => {
  res.redirect("/auth/phone.html");
});

const server = http.createServer(app);

// --- socket.io
attachIO(server);

// --- start
server.listen(config.port, async () => {
  // Initialize database
  await initDatabase();
  
  console.log(`Server listening on :${config.port}`);
  console.log(`Open http://localhost:${config.port}/  → redirects to /auth/phone.html`);
});
