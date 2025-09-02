import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Modal, Pressable, Image } from 'react-native';
import { colors } from '../theme/colors';
import BackButton from '../components/BackButton';
import Panel from '../components/Panel';
import * as SecureStore from 'expo-secure-store';
import { SERVER_URL } from '../config/env';

export default function Leaderboard({ navigation }) {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  // Refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log("Leaderboard screen focused - refreshing data");
      fetchLeaderboardData();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchLeaderboardData = async () => {
    try {
      const token = await SecureStore.getItemAsync("ofc_jwt");
      if (!token) {
        console.error("No auth token found");
        setLoading(false);
        return;
      }

      const response = await fetch(`${SERVER_URL}/leaderboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      // Fallback to empty array if API fails
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboardItem = ({ item, index }) => (
    <Pressable 
      style={[
        styles.leaderboardItem,
        index === 0 && styles.firstPlace,
        index === 1 && styles.secondPlace,
        index === 2 && styles.thirdPlace
      ]}
      onPress={() => {
        setSelectedPlayer(item);
        setShowPlayerModal(true);
      }}
    >
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{item.rank}</Text>
      </View>
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(item.username || 'U').slice(0,1).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.stats}>{item.handsPlayed} hands played</Text>
      </View>
      <View style={styles.chipsContainer}>
        <Text style={styles.chips}>{item.chips.toLocaleString()}</Text>
        <Text style={styles.chipsLabel}>chips</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <BackButton title="Back" onPress={() => navigation.goBack()} />
      
      <View style={styles.headerPanel}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Top Players</Text>
      </View>

      {loading ? (
        <Panel style={styles.loadingPanel}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </Panel>
             ) : (
         <FlatList
           data={leaderboardData}
           renderItem={renderLeaderboardItem}
           keyExtractor={(item) => item.rank.toString()}
           style={styles.list}
           showsVerticalScrollIndicator={false}
         />
       )}

       {/* Player Stats Modal */}
       <Modal
         visible={showPlayerModal}
         transparent={true}
         animationType="fade"
         onRequestClose={() => setShowPlayerModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             {selectedPlayer && (
               <>
                 <View style={styles.modalHeader}>
                   <Text style={styles.modalTitle}>{selectedPlayer.username}</Text>
                   <Text style={styles.modalSubtitle}>Rank #{selectedPlayer.rank}</Text>
                 </View>
                 
                 <View style={styles.statsContainer}>
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Hands Played</Text>
                     <Text style={styles.statValue}>{selectedPlayer.handsPlayed}</Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Total Chips</Text>
                     <Text style={styles.statValue}>{selectedPlayer.chips.toLocaleString()}</Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Royalties per Hand</Text>
                     <Text style={styles.statValue}>
                       {selectedPlayer.handsPlayed > 0 
                         ? (selectedPlayer.royaltiesTotal / selectedPlayer.handsPlayed).toFixed(2)
                         : '0.00'
                       }
                     </Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Fantasyland %</Text>
                     <Text style={styles.statValue}>
                       {selectedPlayer.handsPlayed > 0 
                         ? ((selectedPlayer.fantasyEntrances / selectedPlayer.handsPlayed) * 100).toFixed(1)
                         : '0.0'
                       }%
                     </Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Foul %</Text>
                     <Text style={styles.statValue}>
                       {selectedPlayer.handsPlayed > 0 
                         ? ((selectedPlayer.fouls / selectedPlayer.handsPlayed) * 100).toFixed(1)
                         : '0.0'
                       }%
                     </Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Total Royalties</Text>
                     <Text style={styles.statValue}>{selectedPlayer.royaltiesTotal}</Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Fantasyland Entrances</Text>
                     <Text style={styles.statValue}>{selectedPlayer.fantasyEntrances}</Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Total Fouls</Text>
                     <Text style={styles.statValue}>{selectedPlayer.fouls}</Text>
                   </View>
                   
                   {/* New Performance Stats */}
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Hands Won</Text>
                     <Text style={styles.statValue}>{selectedPlayer.handsWon || 0}</Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Hand Win Rate</Text>
                     <Text style={styles.statValue}>
                       {selectedPlayer.handsPlayed > 0 
                         ? ((selectedPlayer.handsWon || 0) / selectedPlayer.handsPlayed * 100).toFixed(1)
                         : '0.0'
                       }%
                     </Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Matches Played</Text>
                     <Text style={styles.statValue}>{selectedPlayer.matchesPlayed || 0}</Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Matches Won</Text>
                     <Text style={styles.statValue}>{selectedPlayer.matchesWon || 0}</Text>
                   </View>
                   
                   <View style={styles.statRow}>
                     <Text style={styles.statLabel}>Match Win Rate</Text>
                     <Text style={styles.statValue}>
                       {selectedPlayer.matchesPlayed > 0 
                         ? ((selectedPlayer.matchesWon || 0) / selectedPlayer.matchesPlayed * 100).toFixed(1)
                         : '0.0'
                       }%
                     </Text>
                   </View>
                 </View>
                 
                 <Pressable 
                   style={styles.closeButton}
                   onPress={() => setShowPlayerModal(false)}
                 >
                   <Text style={styles.closeButtonText}>Close</Text>
                 </Pressable>
               </>
             )}
           </View>
         </View>
       </Modal>
     </View>
   );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  headerPanel: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.sub,
  },
  loadingPanel: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: colors.sub,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: colors.panel2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  firstPlace: {
    backgroundColor: '#2d1b69',
    borderColor: '#ffd700',
  },
  secondPlace: {
    backgroundColor: '#1b2d69',
    borderColor: '#c0c0c0',
  },
  thirdPlace: {
    backgroundColor: '#692d1b',
    borderColor: '#cd7f32',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  stats: {
    fontSize: 14,
    color: colors.sub,
  },
  chipsContainer: {
    alignItems: 'flex-end',
  },
  chips: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  chipsLabel: {
    fontSize: 12,
    color: colors.sub,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.panel2,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.sub,
  },
  statsContainer: {
    gap: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  statLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 24,
  },
  closeButtonText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
});
