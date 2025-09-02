import { initDatabase, getUserByPhone, getLeaderboard } from './src/store/database.js';

async function checkAvatars() {
  try {
    console.log('🔍 Checking avatar storage in database...\n');
    
    // Initialize database
    await initDatabase();
    
    // Check Dylan's user specifically
    const dylanUser = await getUserByPhone('0479008178');
    if (dylanUser) {
      console.log('👤 Dylan User Details:');
      console.log(`   ID: ${dylanUser.id}`);
      console.log(`   Username: ${dylanUser.username}`);
      console.log(`   Phone: ${dylanUser.phone}`);
      console.log(`   Avatar: ${dylanUser.avatar ? '✅ Present (' + dylanUser.avatar.substring(0, 50) + '...)' : '❌ Missing'}`);
      console.log(`   Avatar length: ${dylanUser.avatar ? dylanUser.avatar.length : 0} characters`);
      console.log(`   Updated: ${dylanUser.updated_at}`);
      console.log('');
    } else {
      console.log('❌ Dylan user not found in database');
      return;
    }
    
    // Check leaderboard data
    console.log('🏆 Leaderboard Data:');
    const leaderboard = await getLeaderboard();
    leaderboard.forEach((player, index) => {
      if (index < 5) { // Show first 5 players
        const hasAvatar = player.avatar ? '✅' : '❌';
        console.log(`   ${index + 1}. ${player.username} - Avatar: ${hasAvatar}`);
        if (player.avatar) {
          console.log(`      Avatar length: ${player.avatar.length} characters`);
        }
      }
    });
    
    // Count users with avatars
    const usersWithAvatars = leaderboard.filter(p => p.avatar).length;
    const totalUsers = leaderboard.length;
    console.log(`\n📊 Avatar Summary: ${usersWithAvatars}/${totalUsers} users have avatars`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkAvatars();
