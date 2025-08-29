import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export async function initDatabase() {
  const dbPath = path.join(__dirname, '../../data/users.db');
  const dataDir = path.dirname(dbPath);
  
  // Create data directory if it doesn't exist
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created data directory:', dataDir);
    }
  } catch (error) {
    console.error('Error creating data directory:', error);
    throw error;
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
    }
  });

  // Create users table if it doesn't exist
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE,
        avatar TEXT,
        chips INTEGER DEFAULT 10000,
        hands_played INTEGER DEFAULT 0,
        royalties_total INTEGER DEFAULT 0,
        fantasy_entrances INTEGER DEFAULT 0,
        fouls INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        reject(err);
      } else {
        console.log('Database initialized');
        // Add avatar column to existing tables if it doesn't exist
        db.run('ALTER TABLE users ADD COLUMN avatar TEXT', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding avatar column:', err);
          } else {
            console.log('Avatar column added to database');
          }
        });
        
        // Add chips column to existing tables if it doesn't exist
        db.run('ALTER TABLE users ADD COLUMN chips INTEGER DEFAULT 10000', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding chips column:', err);
          }
        });
        
        // Add stats columns to existing tables if they don't exist
        db.run('ALTER TABLE users ADD COLUMN hands_played INTEGER DEFAULT 0', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding hands_played column:', err);
          } else {
            console.log('Stats columns added to database');
          }
        });
        
        db.run('ALTER TABLE users ADD COLUMN royalties_total INTEGER DEFAULT 0', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding royalties_total column:', err);
          }
        });
        
        db.run('ALTER TABLE users ADD COLUMN fantasy_entrances INTEGER DEFAULT 0', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding fantasy_entrances column:', err);
          }
        });
        
        db.run('ALTER TABLE users ADD COLUMN fouls INTEGER DEFAULT 0', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding fouls column:', err);
          }
        });
        
        // Update all existing users to have 10,000 chips if they have less
        db.run('UPDATE users SET chips = 10000 WHERE chips < 10000 OR chips IS NULL', (err) => {
          if (err) {
            console.error('Error updating existing users chips:', err);
          } else {
            console.log('Updated existing users to have 10,000 chips');
          }
        });
        resolve();
      }
    });
  });
}

export async function getUserByPhone(phone) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function getUserById(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export async function createUser(phone) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (phone) VALUES (?)', [phone], function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, phone });
    });
  });
}

export async function setUsername(userId, username) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function setAvatar(userId, avatar) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [avatar, userId],
      function(err) {
        if (err) {
          console.error("Database error in setAvatar:", err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

export async function updatePlayerStats(userId, stats) {
  return new Promise((resolve, reject) => {
    const { handsPlayed = 0, royaltiesTotal = 0, fantasyEntrances = 0, fouls = 0 } = stats;
    
    db.run(
      `UPDATE users SET 
        hands_played = hands_played + ?, 
        royalties_total = royalties_total + ?, 
        fantasy_entrances = fantasy_entrances + ?, 
        fouls = fouls + ?,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [handsPlayed, royaltiesTotal, fantasyEntrances, fouls, userId],
      function(err) {
        if (err) {
          console.error("Database error in updatePlayerStats:", err);
          reject(err);
        } else {
          console.log(`Updated stats for user ${userId}:`, stats);
          resolve();
        }
      }
    );
  });
}

export async function getPlayerStats(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT hands_played, royalties_total, fantasy_entrances, fouls FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) {
          console.error("Database error in getPlayerStats:", err);
          reject(err);
        } else {
          const stats = row || { hands_played: 0, royalties_total: 0, fantasy_entrances: 0, fouls: 0 };
          // Convert to the format expected by the profile page
          resolve({
            hands: stats.hands_played,
            royaltiesTotal: stats.royalties_total,
            fantasyEntrances: stats.fantasy_entrances,
            fouls: stats.fouls
          });
        }
      }
    );
  });
}

export async function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function getUserChips(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT chips FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.chips : 0);
    });
  });
}

export async function updateUserChips(userId, chips) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET chips = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [chips, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export async function addUserChips(userId, amount) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET chips = chips + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [amount, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
