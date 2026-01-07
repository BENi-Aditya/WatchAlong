import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8091);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const DATA_DIR = process.env.DATA_DIR ? String(process.env.DATA_DIR) : path.join(__dirname, "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

const DATA_FILE = path.join(DATA_DIR, "store.json");

function readStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { users: [], sessions: [], joinCodeToSessionId: {} };
  }
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function nowMs() {
  return Date.now();
}

function parseAuthToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function authMiddleware(req, res, next) {
  const token = parseAuthToken(req);
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}

function requireJson(req, res, next) {
  if (req.headers["content-type"]?.includes("application/json")) return next();
  return res.status(415).json({ error: "content-type must be application/json" });
}

function extractYoutubeId(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  let id = null;
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") {
      id = u.pathname.replace("/", "");
    } else if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      if (!id && u.pathname.startsWith("/embed/")) id = u.pathname.split("/embed/")[1];
      if (!id && u.pathname.startsWith("/shorts/")) id = u.pathname.split("/shorts/")[1];
    }
  } catch {
    id = null;
  }
  const normalized = String(id || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(normalized)) return normalized;
  return null;
}

function createJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const id = nanoid(10);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const idx = id.charCodeAt(i) % alphabet.length;
    code += alphabet[idx];
  }
  return code;
}

function sessionPlaybackTimeSec(session) {
  if (!session.playback.isPlaying) return session.playback.positionSec;
  const elapsed = (nowMs() - session.playback.anchorMs) / 1000;
  return session.playback.positionSec + elapsed * (session.playback.rate || 1);
}

function setSessionPlayback(session, next) {
  session.playback = {
    isPlaying: next.isPlaying,
    positionSec: Math.max(0, next.positionSec),
    rate: next.rate || 1,
    anchorMs: nowMs(),
  };
}

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
}));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/guest", (_req, res) => {
  const store = readStore();

  const id = nanoid();
  const email = `guest-${id}@guest.local`;
  const username = `Guest ${id.slice(0, 5)}`;

  const user = {
    id,
    email,
    username,
    avatarUrl: null,
    passwordHash: "",
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  writeStore(store);

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl },
  });
});

app.post("/api/auth/register", requireJson, async (req, res) => {
  const { email, password, username } = req.body || {};
  if (!email || !password || !username) {
    return res.status(400).json({ error: "email, password, username required" });
  }

  const store = readStore();
  const exists = store.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (exists) return res.status(409).json({ error: "email already registered" });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    id: nanoid(),
    email: String(email).toLowerCase(),
    username: String(username),
    avatarUrl: null,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  store.users.push(user);
  writeStore(store);

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl } });
});

app.post("/api/auth/login", requireJson, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const store = readStore();
  const user = store.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token, user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl } });
});

app.get("/api/me", authMiddleware, (req, res) => {
  const store = readStore();
  const user = store.users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  return res.json({ id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl });
});

app.post("/api/sessions", authMiddleware, requireJson, async (req, res) => {
  const { youtubeUrl } = req.body || {};
  const youtubeId = extractYoutubeId(String(youtubeUrl || ""));
  if (!youtubeId) return res.status(400).json({ error: "invalid youtube url" });

  const title = "Demo Stream";
  const lengthSeconds = null;

  const store = readStore();

  const session = {
    id: nanoid(),
    joinCode: createJoinCode(),
    createdAt: new Date().toISOString(),
    hostUserId: req.user.sub,
    youtubeUrl: String(youtubeUrl),
    youtubeId,
    media: {
      title,
      lengthSeconds,
    },
    permissions: {
      allowParticipantControl: true,
    },
    playback: {
      isPlaying: false,
      positionSec: 0,
      rate: 1,
      anchorMs: nowMs(),
    },
  };

  store.sessions.push(session);
  store.joinCodeToSessionId[session.joinCode] = session.id;
  writeStore(store);

  return res.json({
    sessionId: session.id,
    joinCode: session.joinCode,
    shareUrl: `/room/${session.joinCode}`,
    youtubeId: session.youtubeId,
    youtubeUrl: session.youtubeUrl,
    media: session.media,
  });
});

app.post("/api/sessions/join", authMiddleware, requireJson, (req, res) => {
  const { joinCode } = req.body || {};
  const codeRaw = String(joinCode || "").trim();
  if (!codeRaw) return res.status(400).json({ error: "joinCode required" });

  const code = codeRaw.toUpperCase();

  const store = readStore();
  const sessionId = store.joinCodeToSessionId[code] || codeRaw;
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });

  return res.json({
    sessionId: session.id,
    joinCode: session.joinCode,
    youtubeId: session.youtubeId,
    youtubeUrl: session.youtubeUrl,
    media: session.media,
  });
});

app.get("/api/sessions/:sessionId", authMiddleware, (req, res) => {
  const { sessionId } = req.params;
  const store = readStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return res.status(404).json({ error: "session not found" });

  return res.json({
    id: session.id,
    joinCode: session.joinCode,
    hostUserId: session.hostUserId,
    youtubeId: session.youtubeId,
    youtubeUrl: session.youtubeUrl,
    media: session.media,
    playback: {
      isPlaying: session.playback.isPlaying,
      positionSec: sessionPlaybackTimeSec(session),
      rate: session.playback.rate,
      serverTimeMs: nowMs(),
    },
    permissions: session.permissions,
  });
});

if (process.env.NODE_ENV === "production") {
  const distDir = path.resolve(__dirname, "..", "dist");
  const indexHtml = path.join(distDir, "index.html");

  app.use(express.static(distDir));
  app.get(/^(?!\/api\/|\/ws).*/, (_req, res) => {
    res.sendFile(indexHtml);
  });
}

const httpServer = createServer(app);

const wss = new WebSocketServer({
  server: httpServer,
  path: "/ws",
});

const presenceBySessionId = new Map();
const socketsBySessionId = new Map();

function broadcastToSession(sessionId, msg) {
  const sockets = socketsBySessionId.get(sessionId);
  if (!sockets) return;
  const raw = JSON.stringify(msg);
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(raw);
  }
}

function upsertPresence(sessionId, user, status) {
  let map = presenceBySessionId.get(sessionId);
  if (!map) {
    map = new Map();
    presenceBySessionId.set(sessionId, map);
  }
  map.set(user.id, {
    userId: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl || null,
    status,
    updatedMs: nowMs(),
  });
}

function getPresenceList(sessionId) {
  const map = presenceBySessionId.get(sessionId);
  if (!map) return [];
  return Array.from(map.values());
}

const sessionBroadcastIntervals = new Map();

function ensureSessionBroadcastLoop(sessionId) {
  if (sessionBroadcastIntervals.has(sessionId)) return;
  const id = setInterval(() => {
    const store = readStore();
    const session = store.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    broadcastToSession(sessionId, {
      type: "playback/state",
      payload: {
        isPlaying: session.playback.isPlaying,
        positionSec: sessionPlaybackTimeSec(session),
        rate: session.playback.rate,
        serverTimeMs: nowMs(),
      },
    });
  }, 500);
  sessionBroadcastIntervals.set(sessionId, id);
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  const token = url.searchParams.get("token");

  if (!sessionId || !token) {
    ws.close(1008, "missing sessionId or token");
    return;
  }

  let userId;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    userId = payload.sub;
  } catch {
    ws.close(1008, "invalid token");
    return;
  }

  const store = readStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) {
    ws.close(1008, "session not found");
    return;
  }

  const user = store.users.find((u) => u.id === userId);
  if (!user) {
    ws.close(1008, "user not found");
    return;
  }

  let sockets = socketsBySessionId.get(sessionId);
  if (!sockets) {
    sockets = new Set();
    socketsBySessionId.set(sessionId, sockets);
  }

  sockets.add(ws);
  upsertPresence(sessionId, user, "in_room");
  ensureSessionBroadcastLoop(sessionId);

  ws.send(JSON.stringify({
    type: "room/snapshot",
    payload: {
      sessionId,
      joinCode: session.joinCode,
      hostUserId: session.hostUserId,
      youtubeId: session.youtubeId,
      youtubeUrl: session.youtubeUrl,
      permissions: session.permissions,
      presence: getPresenceList(sessionId),
      playback: {
        isPlaying: session.playback.isPlaying,
        positionSec: sessionPlaybackTimeSec(session),
        rate: session.playback.rate,
        serverTimeMs: nowMs(),
      },
    },
  }));

  broadcastToSession(sessionId, { type: "presence/update", payload: getPresenceList(sessionId) });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (msg?.type === "sync/ping") {
      const clientSendMs = Number(msg?.payload?.clientSendMs);
      ws.send(JSON.stringify({
        type: "sync/pong",
        payload: {
          clientSendMs: Number.isFinite(clientSendMs) ? clientSendMs : null,
          serverTimeMs: nowMs(),
        },
      }));
      return;
    }

    const store2 = readStore();
    const session2 = store2.sessions.find((s) => s.id === sessionId);
    if (!session2) return;

    if (msg?.type === "chat/send") {
      const text = String(msg?.payload?.text || "").trim();
      if (!text) return;

      const user = store2.users.find((u) => u.id === userId);
      const videoTimeSec = sessionPlaybackTimeSec(session2);

      broadcastToSession(sessionId, {
        type: "chat/message",
        payload: {
          id: nanoid(),
          userId,
          username: user?.username || "Unknown",
          text,
          videoTimeSec,
          createdAtMs: nowMs(),
        },
      });
      return;
    }

    if (msg?.type === "playback/command") {
      const action = msg?.payload?.action;

      const isHost = session2.hostUserId === userId;
      const canControl = isHost || session2.permissions.allowParticipantControl;
      if (!canControl) return;

      if (action === "play") {
        const current = sessionPlaybackTimeSec(session2);
        setSessionPlayback(session2, { isPlaying: true, positionSec: current, rate: session2.playback.rate });
      } else if (action === "pause") {
        const current = sessionPlaybackTimeSec(session2);
        setSessionPlayback(session2, { isPlaying: false, positionSec: current, rate: session2.playback.rate });
      } else if (action === "seek") {
        const positionSec = Number(msg?.payload?.positionSec);
        setSessionPlayback(session2, { isPlaying: session2.playback.isPlaying, positionSec, rate: session2.playback.rate });
      } else if (action === "setPermissions") {
        const allowParticipantControl = Boolean(msg?.payload?.allowParticipantControl);
        if (!isHost) return;
        session2.permissions.allowParticipantControl = allowParticipantControl;
      } else {
        return;
      }

      writeStore(store2);
      broadcastToSession(sessionId, {
        type: "room/snapshot",
        payload: {
          sessionId,
          joinCode: session2.joinCode,
          hostUserId: session2.hostUserId,
          youtubeId: session2.youtubeId,
          youtubeUrl: session2.youtubeUrl,
          permissions: session2.permissions,
          presence: getPresenceList(sessionId),
          playback: {
            isPlaying: session2.playback.isPlaying,
            positionSec: sessionPlaybackTimeSec(session2),
            rate: session2.playback.rate,
            serverTimeMs: nowMs(),
          },
        },
      });
    }
  });

  ws.on("close", () => {
    sockets.delete(ws);
    upsertPresence(sessionId, user, "online");
    broadcastToSession(sessionId, { type: "presence/update", payload: getPresenceList(sessionId) });
  });
});

httpServer.listen(PORT, () => {
  process.stdout.write(`API/WS server listening on http://localhost:${PORT}\n`);
});
