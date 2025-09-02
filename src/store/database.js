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
        
        // Add new stats columns for hands won and matches
        db.run('ALTER TABLE users ADD COLUMN hands_won INTEGER DEFAULT 0', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding hands_won column:', err);
          } else {
            console.log('Hands won column added to database');
          }
        });
        
        db.run('ALTER TABLE users ADD COLUMN matches_played INTEGER DEFAULT 0', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding matches_played column:', err);
          } else {
            console.log('Matches played column added to database');
          }
        });
        
        db.run('ALTER TABLE users ADD COLUMN matches_won INTEGER DEFAULT 0', (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding matches_won column:', err);
          } else {
            console.log('Matches won column added to database');
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

        // Create friends table if it doesn't exist
        db.run(`
          CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, friend_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (friend_id) REFERENCES users (id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating friends table:', err);
          } else {
            console.log('Friends table created');
          }
        });

        // Create friend_requests table if it doesn't exist
        db.run(`
          CREATE TABLE IF NOT EXISTS friend_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id INTEGER NOT NULL,
            to_user_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(from_user_id, to_user_id),
            FOREIGN KEY (from_user_id) REFERENCES users (id),
            FOREIGN KEY (to_user_id) REFERENCES users (id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating friend_requests table:', err);
          } else {
            console.log('Friend requests table created');
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
    const { 
      handsPlayed = 0, 
      royaltiesTotal = 0, 
      fantasyEntrances = 0, 
      fouls = 0,
      handsWon = 0,
      matchesPlayed = 0,
      matchesWon = 0
    } = stats;
    
    db.run(
      `UPDATE users SET 
        hands_played = hands_played + ?, 
        royalties_total = royalties_total + ?, 
        fantasy_entrances = fantasy_entrances + ?, 
        fouls = fouls + ?,
        hands_won = hands_won + ?,
        matches_played = matches_played + ?,
        matches_won = matches_won + ?,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [handsPlayed, royaltiesTotal, fantasyEntrances, fouls, handsWon, matchesPlayed, matchesWon, userId],
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
      'SELECT hands_played, royalties_total, fantasy_entrances, fouls, hands_won, matches_played, matches_won FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) {
          console.error("Database error in getPlayerStats:", err);
          reject(err);
        } else {
          const stats = row || { 
            hands_played: 0, 
            royalties_total: 0, 
            fantasy_entrances: 0, 
            fouls: 0,
            hands_won: 0,
            matches_played: 0,
            matches_won: 0
          };
          // Convert to the format expected by the profile page
          resolve({
            hands: stats.hands_played,
            royaltiesTotal: stats.royalties_total,
            fantasyEntrances: stats.fantasy_entrances,
            fouls: stats.fouls,
            handsWon: stats.hands_won,
            matchesPlayed: stats.matches_played,
            matchesWon: stats.matches_won
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

export async function getLeaderboard() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT username, hands_played, chips, royalties_total, fantasy_entrances, fouls, hands_won, matches_played, matches_won, avatar 
       FROM users 
       WHERE username IS NOT NULL 
       ORDER BY hands_played DESC, username ASC 
       LIMIT 50`,
      (err, rows) => {
        if (err) {
          console.error("Database error in getLeaderboard:", err);
          reject(err);
        } else {
          // Add rank to each row
          const leaderboard = rows.map((row, index) => ({
            rank: index + 1,
            username: row.username,
            handsPlayed: row.hands_played || 0,
            chips: row.chips || 0,
            royaltiesTotal: row.royalties_total || 0,
            fantasyEntrances: row.fantasy_entrances || 0,
            fouls: row.fouls || 0,
            handsWon: row.hands_won || 0,
            matchesPlayed: row.matches_played || 0,
            matchesWon: row.matches_won || 0,
            avatar: row.avatar || null
          }));
          resolve(leaderboard);
        }
      }
    );
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

// Match end tracking functions
export async function recordMatchEnd(winnerDbId, loserDbId) {
  return new Promise((resolve, reject) => {
    // Update winner stats
    db.run(
      'UPDATE users SET matches_played = matches_played + 1, matches_won = matches_won + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [winnerDbId],
      (err) => {
        if (err) {
          console.error("Database error updating winner stats:", err);
          reject(err);
        } else {
          // Update loser stats
          db.run(
            'UPDATE users SET matches_played = matches_played + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [loserDbId],
            (err) => {
              if (err) {
                console.error("Database error updating loser stats:", err);
                reject(err);
              } else {
                console.log(`✅ Recorded match end: Winner ${winnerDbId}, Loser ${loserDbId}`);
                resolve();
              }
            }
          );
        }
      }
    );
  });
}

// Friends system functions
export async function sendFriendRequest(fromUserId, toUsername) {
  return new Promise((resolve, reject) => {
    // First get the target user by username
    db.get('SELECT id FROM users WHERE username = ?', [toUsername], (err, targetUser) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!targetUser) {
        reject(new Error('User not found'));
        return;
      }
      
      if (fromUserId === targetUser.id) {
        reject(new Error('Cannot send friend request to yourself'));
        return;
      }
      
      // Check if request already exists
      db.get('SELECT * FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?', 
        [fromUserId, targetUser.id], (err, existingRequest) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (existingRequest) {
          reject(new Error('Friend request already sent'));
          return;
        }
        
        // Check if already friends
        db.get('SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', 
          [fromUserId, targetUser.id, targetUser.id, fromUserId], (err, existingFriend) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (existingFriend) {
            reject(new Error('Already friends'));
            return;
          }
          
          // Create friend request
          db.run('INSERT INTO friend_requests (from_user_id, to_user_id) VALUES (?, ?)', 
            [fromUserId, targetUser.id], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve({ success: true, message: 'Friend request sent' });
            }
          });
        });
      });
    });
  });
}

export async function getFriendRequests(userId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT fr.id, fr.from_user_id, u.username, fr.created_at
      FROM friend_requests fr
      JOIN users u ON fr.from_user_id = u.id
      WHERE fr.to_user_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `, [userId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function respondToFriendRequest(requestId, accept) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM friend_requests WHERE id = ?', [requestId], (err, request) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!request) {
        reject(new Error('Request not found'));
        return;
      }
      
      if (accept) {
        // Add both users as friends
        db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', 
          [request.from_user_id, request.to_user_id], (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', 
            [request.to_user_id, request.from_user_id], (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Update request status
            db.run('UPDATE friend_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
              ['accepted', requestId], (err) => {
              if (err) reject(err);
              else resolve({ success: true });
            });
          });
        });
      } else {
        // Decline request
        db.run('UPDATE friend_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
          ['declined', requestId], (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        });
      }
    });
  });
}

export async function getFriends(userId, onlineUserIds = null) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT f.friend_id as id, u.username, u.avatar
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
      ORDER BY u.username ASC
    `, [userId], (err, rows) => {
      if (err) reject(err);
      else {
        // Add online status if onlineUserIds set is provided
        const friendsWithStatus = rows.map(row => ({
          ...row,
          online: onlineUserIds ? onlineUserIds.has(row.id) : false
        }));
        resolve(friendsWithStatus);
      }
    });
  });
}

export async function removeFriend(userId, friendId) {
  return new Promise((resolve, reject) => {
    // Remove friendship from both sides
    db.run('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', 
      [userId, friendId, friendId, userId], (err) => {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}
