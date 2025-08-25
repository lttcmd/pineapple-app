# OFC Pineapple Tournament - Complete System Overview

## 🎯 System Overview

The OFC Pineapple Tournament is a real-time multiplayer card game system featuring Open Face Chinese (OFC) Pineapple poker with a ranked matchmaking system and persistent chip economy. The system supports both web and mobile clients with real-time gameplay.

## 🏗️ Architecture

### **Technology Stack**
- **Backend**: Node.js + Express.js + Socket.IO
- **Database**: SQLite (file-based, lightweight)
- **Mobile**: React Native
- **Web**: HTML/JavaScript
- **Authentication**: JWT tokens
- **Real-time Communication**: Socket.IO

### **Project Structure**
```
ofc-pineapple-tourney/
├── src/                    # Server-side code
│   ├── auth/              # Authentication system
│   ├── config/            # Environment configuration
│   ├── game/              # Core game logic
│   ├── net/               # Socket.IO events and networking
│   ├── store/             # Database operations
│   ├── utils/             # Utility functions
│   └── web/               # Web client files
├── mobile/                # React Native mobile app
├── test/                  # Test files
└── view-room.js           # Debug/monitoring tool
```

## 🎮 Game Rules

### **Open Face Chinese (OFC) Pineapple**
- **Objective**: Create the best 3-row poker hand
- **Rows**: Top (3 cards), Middle (5 cards), Bottom (5 cards)
- **Hand Rankings**: Standard poker rankings
- **Constraint**: Bottom row must be stronger than middle row, middle must be stronger than top

### **Game Flow**
1. **Initial Deal**: Each player receives 5 cards
2. **Placement Phase**: Players place cards on their board (top/middle/bottom)
3. **Deal Phase**: 3 cards dealt per round (rounds 1-5)
4. **Reveal Phase**: All boards revealed and scored
5. **Scoring**: Points awarded based on hand strength and royalties

### **Scoring System**
- **Line Points**: Standard poker hand rankings
- **Royalties**: Bonus points for premium hands
- **Scoop Bonus**: Extra points for winning all 3 rows
- **Fantasyland**: Special rules for qualifying hands

## 💰 Chip System

### **Account Balance**
- **Starting Balance**: 1,000 chips for new accounts
- **Persistence**: Stored in SQLite database
- **Transaction**: Updated after each ranked match

### **Ranked Match Mechanics**
- **Entry Cost**: 500 chips per player
- **Initial Stakes**: 500 chips on table per player
- **Conversion Rate**: 1 game point = 10 chips
- **Zero-Sum**: Total chips on table always equals 1,000

### **Match Flow**
1. **Entry**: Players stake 500 chips from account
2. **Gameplay**: Chip stacks update after each hand
3. **Match End**: One player reaches 1,000 chips
4. **Settlement**: Winner +500, Loser -500 to account balance

### **Example Match**
```
Hand 1: Player A wins 19 points, Player B loses 19 points
- Player A: 500 → 690 chips (+190)
- Player B: 500 → 310 chips (-190)

Hand 2: Player B wins 15 points, Player A loses 15 points  
- Player A: 690 → 540 chips (-150)
- Player B: 310 → 460 chips (+150)
```

## 🎯 Matchmaking System

### **Ranked Queue**
- **Queue Management**: Server-side in-memory queue
- **Auto-Matching**: Players paired when 2+ in queue
- **Auto-Start**: Matched games start immediately
- **Cleanup**: Disconnected players removed from queue

### **Match Creation**
- **Room Generation**: Unique room ID created
- **Player Assignment**: Both players added to room
- **Chip Staking**: 500 chips deducted from accounts
- **Game Initialization**: Auto-ready and start

### **Custom Lobbies**
- **Room Creation**: Manual room creation with codes
- **No Chip Cost**: Free to create and join
- **Manual Start**: Players must ready up manually

## 🔧 Technical Implementation

### **Database Schema**

#### **Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  chips INTEGER DEFAULT 1000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Game State Management**

#### **Room Structure**
```javascript
{
  id: "roomId",
  phase: "initial-set" | "round" | "reveal",
  currentRound: 1-5,
  players: Map<userId, Player>,
  isRanked: boolean,
  deck: Card[],
  nextRoundReady: string[]
}
```

#### **Player Structure**
```javascript
{
  userId: "U00000001",
  name: "PlayerName",
  dbId: 123,
  board: { top: [], middle: [], bottom: [] },
  hand: Card[],
  score: number,
  tableChips: number,  // For ranked matches
  ready: boolean,
  inFantasyland: boolean
}
```

### **Socket.IO Events**

#### **Client → Server**
- `auth:phone` - Phone number authentication
- `auth:code` - Verification code submission
- `auth:create-username` - Username creation
- `room:create` - Create custom room
- `room:join` - Join room by code
- `room:ready` - Player ready status
- `game:place` - Card placement
- `ranked:search` - Enter ranked queue
- `ranked:cancel` - Leave ranked queue

#### **Server → Client**
- `auth:success` - Authentication successful
- `room:state` - Room state update
- `game:deal` - New cards dealt
- `game:reveal` - Hand results
- `ranked:match-found` - Ranked match created
- `match:end` - Ranked match concluded

### **Game Flow Logic**

#### **Normal Mode (Custom Lobbies)**
1. Players join room
2. Manual ready up
3. Game starts when all ready
4. Standard OFC gameplay
5. Score tracking only

#### **Ranked Mode**
1. Players enter queue
2. Auto-match when 2+ players
3. Auto-stake chips and start
4. Chip-based scoring
5. Match ends when one player has all chips

### **Card Dealing System**

#### **Deal Logic**
- **Initial Set**: 5 cards to each player
- **Rounds 1-5**: 3 cards per round
- **Fantasyland**: 14 cards (special rules)
- **Hand Management**: Tracks which cards to deal next

#### **Placement System**
- **Batch Processing**: Multiple card placements in one action
- **Validation**: Ensures valid board structure
- **Discard Handling**: Manages discarded cards

## 📱 Client Applications

### **Mobile App (React Native)**
- **Screens**: Auth, Lobby, Searching, Room, Play, Profile
- **State Management**: Zustand for global state
- **Real-time**: Socket.IO client integration
- **UI Components**: Custom card, drag-and-drop, panels

### **Web App (HTML/JavaScript)**
- **Pages**: Auth, Lobby, Room, Play
- **Styling**: CSS with responsive design
- **Functionality**: Same features as mobile

### **Shared Features**
- **Authentication**: Phone + code verification
- **Real-time Updates**: Live game state synchronization
- **Chip Display**: Account balance and table chips
- **Matchmaking**: Ranked queue integration

## 🔍 Monitoring & Debugging

### **view-room.js**
- **Purpose**: Real-time room state monitoring
- **Features**: 
  - Live room information
  - Player states and chip stacks
  - Game phase tracking
  - Auto-refresh every 15 seconds

### **Server Logging**
- **Debug Logs**: Extensive console logging for troubleshooting
- **Chip System**: Detailed chip calculation logs
- **Game Flow**: Phase transitions and player actions
- **Error Handling**: Comprehensive error logging

## 🚀 Deployment

### **Production Setup**
- **Environment**: Node.js server
- **Database**: SQLite file
- **Port**: 3000 (configurable)
- **HTTPS**: SSL certificate for production

### **Mobile Build**
- **React Native**: Expo managed workflow
- **Build Script**: `build-production.sh`
- **Distribution**: APK/IPA files

## 🧪 Testing

### **Test Files**
- `fouls.test.js` - Board validation tests
- `scoring.test.js` - Scoring system tests
- `test-me.js` - Manual testing utilities

### **Test Coverage**
- **Game Logic**: Hand evaluation and scoring
- **Chip System**: Balance calculations
- **Matchmaking**: Queue management
- **Database**: CRUD operations

## 🔐 Security

### **Authentication**
- **Phone Verification**: SMS-based authentication
- **JWT Tokens**: Secure session management
- **Username System**: Unique player identification

### **Data Protection**
- **Input Validation**: All user inputs validated
- **SQL Injection**: Parameterized queries
- **XSS Prevention**: Sanitized outputs

## 📊 Performance

### **Optimizations**
- **In-Memory State**: Fast game state access
- **Socket.IO**: Efficient real-time communication
- **SQLite**: Lightweight database for small scale
- **Connection Pooling**: Efficient database connections

### **Scalability Considerations**
- **Horizontal Scaling**: Multiple server instances
- **Database**: Migration to PostgreSQL for larger scale
- **Caching**: Redis for session management
- **Load Balancing**: Nginx reverse proxy

## 🎯 Future Enhancements

### **Planned Features**
- **Tournament Mode**: Multi-table tournaments
- **Leaderboards**: Global and seasonal rankings
- **Achievements**: Player progression system
- **Spectator Mode**: Watch live games
- **Replay System**: Game history and analysis

### **Technical Improvements**
- **WebSocket Optimization**: Binary protocol for efficiency
- **Mobile Performance**: Native optimizations
- **Analytics**: Game statistics and insights
- **API Documentation**: OpenAPI/Swagger specs

---

*This document provides a comprehensive overview of the OFC Pineapple Tournament system. For specific implementation details, refer to the individual source files and inline documentation.*
