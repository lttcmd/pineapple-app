import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'data/users.db');

console.log('Reading users from:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  
  console.log('Connected to database successfully');
  
  // Query all users
  db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Error querying database:', err);
      return;
    }
    
    console.log('\n=== USERS IN DATABASE ===');
    console.log(`Total users: ${rows.length}\n`);
    
    if (rows.length === 0) {
      console.log('No users found in database');
    } else {
      rows.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Phone: ${user.phone}`);
        console.log(`  Username: ${user.username || 'Not set'}`);
        console.log(`  Created: ${user.created_at}`);
        console.log(`  Updated: ${user.updated_at}`);
        console.log('');
      });
    }
    
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  });
});
