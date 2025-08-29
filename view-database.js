// view-database.js
// Simple database viewer for the OFC Pineapple Tournament

import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'data', 'users.db');

console.log('🔍 OFC Pineapple Tournament Database Viewer');
console.log('==========================================\n');

// Check if database exists
import { existsSync } from 'fs';
if (!existsSync(dbPath)) {
  console.log('❌ Database not found at:', dbPath);
  console.log('Make sure the server has been started at least once to create the database.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

// Show database schema
console.log('📋 Database Schema:');
db.all("SELECT sql FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('Error reading schema:', err);
    return;
  }
  
  rows.forEach(row => {
    console.log(row.sql);
  });
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Show all users with stats
  console.log('👥 All Users:');
  db.all(`
    SELECT 
      id,
      phone,
      username,
      chips,
      hands_played,
      royalties_total,
      fantasy_entrances,
      fouls,
      created_at,
      updated_at
    FROM users 
    ORDER BY id
  `, (err, users) => {
    if (err) {
      console.error('Error reading users:', err);
      return;
    }
    
    if (users.length === 0) {
      console.log('No users found in database.');
      return;
    }
    
    users.forEach(user => {
      console.log(`\n👤 User ID: ${user.id}`);
      console.log(`   Phone: ${user.phone}`);
      console.log(`   Username: ${user.username || 'Not set'}`);
      console.log(`   Chips: ${user.chips}`);
      console.log(`   Stats:`);
      console.log(`     Hands Played: ${user.hands_played}`);
      console.log(`     Total Royalties: ${user.royalties_total}`);
      console.log(`     Fantasy Land Entrances: ${user.fantasy_entrances}`);
      console.log(`     Fouls: ${user.fouls}`);
      
      // Calculate percentages
      if (user.hands_played > 0) {
        const royaltiesPerHand = (user.royalties_total / user.hands_played).toFixed(2);
        const fantasyLandPct = Math.round((user.fantasy_entrances / user.hands_played) * 100);
        const foulPct = Math.round((user.fouls / user.hands_played) * 100);
        
        console.log(`     Royalties per Hand: ${royaltiesPerHand}`);
        console.log(`     Fantasy Land %: ${fantasyLandPct}%`);
        console.log(`     Foul %: ${foulPct}%`);
      } else {
        console.log(`     Royalties per Hand: 0.00`);
        console.log(`     Fantasy Land %: 0%`);
        console.log(`     Foul %: 0%`);
      }
      
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Updated: ${user.updated_at}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Total Users: ${users.length}`);
    
    // Summary stats
    const totalHands = users.reduce((sum, user) => sum + user.hands_played, 0);
    const totalRoyalties = users.reduce((sum, user) => sum + user.royalties_total, 0);
    const totalFantasyEntrances = users.reduce((sum, user) => sum + user.fantasy_entrances, 0);
    const totalFouls = users.reduce((sum, user) => sum + user.fouls, 0);
    
    console.log(`📈 Summary:`);
    console.log(`   Total Hands Played: ${totalHands}`);
    console.log(`   Total Royalties: ${totalRoyalties}`);
    console.log(`   Total Fantasy Land Entrances: ${totalFantasyEntrances}`);
    console.log(`   Total Fouls: ${totalFouls}`);
    
    db.close();
  });
});
