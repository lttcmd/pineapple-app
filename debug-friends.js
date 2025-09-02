import { initDatabase } from './src/store/database.js';
import sqlite3 from 'sqlite3';

async function debugFriends() {
  try {
    console.log('🔍 Debugging Friends System...\n');
    
    // Initialize database
    await initDatabase();
    console.log('✅ Database initialized');
    
    // Open database directly to inspect tables
    const db = new sqlite3.Database('./data/users.db');
    
    console.log('\n📋 Checking database tables...');
    
    // Check if friends table exists and has data
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      if (err) {
        console.error('❌ Error checking tables:', err);
        return;
      }
      console.log('Tables in database:', tables.map(t => t.name));
      
      // Check friends table structure
      db.all("PRAGMA table_info(friends)", (err, columns) => {
        if (err) {
          console.error('❌ Error checking friends table structure:', err);
          return;
        }
        console.log('\nFriends table structure:');
        columns.forEach(col => {
          console.log(`  ${col.name} (${col.type})`);
        });
        
        // Check if friends table has data
        db.all("SELECT * FROM friends LIMIT 5", (err, rows) => {
          if (err) {
            console.error('❌ Error checking friends data:', err);
            return;
          }
          console.log('\nFriends table data (first 5 rows):');
          console.log(rows);
          
          // Check friend_requests table
          db.all("SELECT * FROM friend_requests LIMIT 5", (err, requestRows) => {
            if (err) {
              console.error('❌ Error checking friend_requests data:', err);
              return;
            }
            console.log('\nFriend requests table data (first 5 rows):');
            console.log(requestRows);
            
            // Check users table for usernames
            db.all("SELECT id, username FROM users LIMIT 10", (err, userRows) => {
              if (err) {
                console.error('❌ Error checking users data:', err);
                return;
              }
              console.log('\nUsers table (first 10 rows):');
              console.log(userRows);
              
              db.close();
              console.log('\n🎯 Debug complete!');
            });
          });
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFriends();
