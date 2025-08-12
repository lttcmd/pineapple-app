import { Router } from "express";
import { sendOtp, verifyOtp } from "./service.js";
import { mem } from "../store/mem.js";
import { setUsername, getUserByUsername, getUserByPhone } from "../store/database.js";

export const authRoutes = Router();

authRoutes.post("/auth/send-otp", async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: "phone required" });
  await sendOtp(phone);
  res.json({ ok: true });
});

authRoutes.post("/auth/verify", async (req, res) => {
  const { phone, code } = req.body || {};
  const result = await verifyOtp(phone, code);
  if (!result) return res.status(400).json({ error: "invalid code" });
  
  mem.users.set(phone, { userId: result.userId, phone });

  // Ensure a player profile exists
  if (!mem.players.get(result.userId)) {
    mem.players.set(result.userId, {
      userId: result.userId,
      phone,
      name: null,
      avatar: null, // data URL or hosted URL
      stats: { hands: 0, royaltiesTotal: 0, fantasyEntrances: 0, fouls: 0 },
    });
  }

  res.json(result); // { userId, token, isNewUser, hasUsername }
});

// Create username for new account
authRoutes.post("/auth/create-username", async (req, res) => {
  const { token, username } = req.body || {};
  if (!token || !username) return res.status(400).json({ error: "token and username required" });
  
  // Validate username
  if (typeof username !== 'string' || username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: "username must be 3-20 characters" });
  }
  
  // Check if username is already taken
  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    return res.status(400).json({ error: "username already taken" });
  }

  try {
    // Decode token to get user info
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const dbId = payload.dbId;
    
    if (!dbId) {
      return res.status(400).json({ error: "invalid token" });
    }

    // Set username in database
    await setUsername(dbId, username);
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error creating username:', error);
    res.status(500).json({ error: "server error" });
  }
});

// Fetch player profile
authRoutes.get("/me", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing token" });
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log("Token payload:", payload);
    
    const profile = mem.players.get(payload.sub);
    if (!profile) return res.status(404).json({ error: "not found" });
    console.log("Profile from mem:", profile);
    
    // Get username from database
    const dbUser = await getUserByPhone(profile.phone);
    console.log("Database user:", dbUser);
    
    const userProfile = {
      ...profile,
      username: dbUser?.username || null
    };
    
    console.log("Final user profile:", userProfile);
    res.json(userProfile);
  } catch (error) {
    console.error("Error in /me endpoint:", error);
    res.status(401).json({ error: "invalid token" });
  }
});

// Set display name (one-time)
authRoutes.post("/me/name", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const { name } = req.body || {};
  if (!token) return res.status(401).json({ error: "missing token" });
  if (!name || typeof name !== 'string' || name.length > 24) return res.status(400).json({ error: "invalid name" });
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const p = mem.players.get(payload.sub);
    if (!p) return res.status(404).json({ error: "not found" });
    if (p.name) return res.status(400).json({ error: "name already set" });
    p.name = name;
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
});

// Update avatar (data URL or base64 string). Keep simple for now.
authRoutes.post("/me/avatar", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const { avatar } = req.body || {};
  if (!token) return res.status(401).json({ error: "missing token" });
  if (!avatar || typeof avatar !== 'string' || avatar.length > 2_000_000) {
    return res.status(400).json({ error: "invalid avatar" });
  }
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const p = mem.players.get(payload.sub);
    if (!p) return res.status(404).json({ error: "not found" });
    p.avatar = avatar; // store as-is (data URL/base64)
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
});
