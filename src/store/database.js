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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        reject(err);
      } else {
        console.log('Database initialized');
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
      (err) => {
        if (err) reject(err);
        else resolve();
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
