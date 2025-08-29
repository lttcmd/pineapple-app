import { Router } from "express";
import { sendOtp, verifyOtp } from "./service.js";
import { mem } from "../store/mem.js";
import { setUsername, getUserByUsername, getUserByPhone, setAvatar, getUserChips, getUserById, getPlayerStats } from "../store/database.js";

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
    console.log("Token payload:", { sub: payload.sub, dbId: payload.dbId });
    
    const profile = mem.players.get(payload.sub);
    if (!profile) return res.status(404).json({ error: "not found" });
    
    // Get username, avatar, chips, and stats from database
    const dbUser = await getUserByPhone(profile.phone);
    const chips = await getUserChips(payload.dbId);
    const stats = await getPlayerStats(payload.dbId);
    console.log("Database user found:", dbUser ? `username: ${dbUser.username}, hasAvatar: ${!!dbUser.avatar}, chips: ${chips}` : "not found");
    
    const userProfile = {
      ...profile,
      username: dbUser?.username || null,
      avatar: dbUser?.avatar || null,
      chips: chips || 1000,
      stats: stats
    };
    
    console.log("Profile response - username:", userProfile.username, "hasAvatar:", !!userProfile.avatar);
    res.json(userProfile);
  } catch (error) {
    console.error("Error in /me endpoint:", error);
    res.status(401).json({ error: "invalid token" });
  }
});

// Update avatar (data URL or base64 string)
authRoutes.post("/me/avatar", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const { avatar } = req.body || {};
  
  if (!token) {
    return res.status(401).json({ error: "missing token" });
  }
  
  if (!avatar || typeof avatar !== 'string') {
    return res.status(400).json({ error: "invalid avatar" });
  }
  
  if (avatar.length > 500_000) { // 500KB limit for 250x250 compressed images
    return res.status(400).json({ error: "avatar too large" });
  }
  
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const dbId = payload.dbId;
    
    if (!dbId) {
      return res.status(400).json({ error: "invalid token" });
    }

    // Set avatar in database
    await setAvatar(dbId, avatar);
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: "server error" });
  }
});

// Get user info by ID (for opponent avatars)
authRoutes.get("/user/:userId", async (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const { userId } = req.params;
  
  if (!token) return res.status(401).json({ error: "missing token" });
  if (!userId) return res.status(400).json({ error: "missing user id" });
  
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const dbId = payload.dbId;
    
    if (!dbId) {
      return res.status(400).json({ error: "invalid token" });
    }

    // Get user info from database
    const dbUser = await getUserById(userId);
    if (!dbUser) {
      return res.status(404).json({ error: "user not found" });
    }

    // Return only public info (username and avatar)
    res.json({
      username: dbUser.username,
      avatar: dbUser.avatar
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: "server error" });
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
