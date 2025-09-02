# OFC Pineapple Tournament - Complete Project Documentation

## 📋 Table of Contents
- [[#🎯 Project Overview]]
- [[#🏗️ System Architecture]]
- [[#🎮 Game Rules & Mechanics]]
- [[#💰 Chip Management System]]
- [[#🔐 Authentication & User Management]]
- [[#🎯 Matchmaking & Game Flow]]
- [[#📱 Mobile Application]]
- [[#🌐 Web Application]]
- [[#🗄️ Database & Storage]]
- [[#🔧 Technical Implementation]]
- [[#🧪 Testing & Debugging]]
- [[#🚀 Deployment & Production]]
- [[#📊 Monitoring & Analytics]]
- [[#🔍 Development Workflow]]
- [[#📚 API Reference]]
- [[#🚧 Future Enhancements]]

---

## 🎯 Project Overview

The OFC Pineapple Tournament is a real-time multiplayer card game system featuring **Open Face Chinese (OFC) Pineapple poker** with a ranked matchmaking system and persistent chip economy. The system supports both web and mobile clients with real-time gameplay.

### **Key Features**
- **Real-time multiplayer** OFC Pineapple poker
- **Ranked matchmaking** with chip-based economy
- **Custom lobbies** for friendly games
- **Cross-platform** support (mobile + web)
- **Persistent user accounts** with chip balances
- **Live game monitoring** and debugging tools

### **Technology Stack**
- **Backend**: Node.js + Express.js + Socket.IO
- **Database**: SQLite (file-based, lightweight)
- **Mobile**: React Native + Expo
- **Web**: HTML/JavaScript + Socket.IO client
- **Authentication**: JWT tokens + phone verification
- **Real-time Communication**: Socket.IO

---

## 🏗️ System Architecture

### **Project Structure**
```
ofc-pineapple-tourney/
├── src/                    # Server-side code
│   ├── auth/              # Authentication system
│   ├── config/            # Environment configuration
│   ├── game/              # Core game logic
│   │   ├── new/          # New game engine
│   │   ├── modes/        # Game mode implementations
│   │   └── constants.js  # Shared game constants
│   ├── net/               # Socket.IO events and networking
│   ├── store/             # Database operations
│   ├── utils/             # Utility functions
│   └── web/               # Web client files
├── mobile/                # React Native mobile app
│   ├── app/               # Main app code
│   ├── components/        # Reusable UI components
│   ├── screens/           # App screens
│   └── state/             # State management
├── test/                  # Test files
├── logs/                  # Game logs
└── monitoring/            # Debug and monitoring tools
```

### **Core Components**
1. **Game Engine** (`src/game/new/GameEngine.js`)
   - Manages game state and flow
   - Handles card dealing and placement
   - Coordinates between players

2. **Socket.IO Server** (`src/net/io.js`)
   - Real-time communication
   - Event handling and routing
   - Connection management

3. **Database Layer** (`src/store/database.js`)
   - User management
   - Chip balance persistence
   - Game statistics

4. **Mobile App** (`mobile/app/`)
   - React Native frontend
   - Real-time game interface
   - State management with Zustand

---

## 🎮 Game Rules & Mechanics

### **Open Face Chinese (OFC) Pineapple**
- **Objective**: Create the best 3-row poker hand
- **Rows**: 
  - **Top**: 3 cards (weakest)
  - **Middle**: 5 cards (medium strength)
  - **Bottom**: 5 cards (strongest)
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

### **Game Modes**
- **Custom Lobbies**: Free games with friends
- **Ranked Matches**: Chip-based competitive games
- **Tournament Mode**: Multi-table competitions (planned)

---

## 💰 Chip Management System

### **Centralized Architecture**
All chip logic is centralized in `src/game/chipManager.js` to eliminate duplications and ensure consistency across platforms.

### **Key Constants**
```javascript
export const CHIP_CONSTANTS = {
  POINTS_PER_CHIP: 10,        // 1 point = 10 chips
  STARTING_CHIPS: 500,        // Each player starts with 500 chips
  TOTAL_TABLE_CHIPS: 1000,    // Total chips on table always equals 1000
  WIN_THRESHOLD: 1000,        // Player wins when they reach 1000 chips
  LOSE_THRESHOLD: 0           // Player loses when they reach 0 chips
};
```

### **Chip Flow**
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

### **Key Functions**
- `calculateChipChanges(players)` - Calculates points and chip changes
- `applyChipChanges(players, chipChanges)` - Applies chip changes to player states
- `checkGameEndConditions(players)` - Checks for win/lose conditions
- `validateChipTotals()` - Validates total chips equal 1000

---

## 🔐 Authentication & User Management

### **Phone Verification System**
1. **Phone Number Input**: User enters phone number
2. **SMS Code**: Verification code sent via SMS
3. **Code Verification**: User enters received code
4. **Username Creation**: User creates unique username
5. **Account Creation**: Account created with 10,000 starting chips

### **JWT Token Management**
- **Session Tokens**: Secure authentication across sessions
- **Token Refresh**: Automatic token renewal
- **Secure Storage**: Tokens stored securely on client devices

### **User Database Schema**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  chips INTEGER DEFAULT 10000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Security Features**
- **Input Validation**: All user inputs validated
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Sanitized outputs
- **Phone Number Verification**: SMS-based authentication

---

## 🎯 Matchmaking & Game Flow

### **Ranked Matchmaking**
- **Queue Management**: Server-side in-memory queue
- **Auto-Matching**: Players paired when 2+ in queue
- **Auto-Start**: Matched games start immediately
- **Cleanup**: Disconnected players removed from queue

### **Match Creation Process**
1. **Queue Entry**: Player enters ranked queue
2. **Match Found**: Server pairs 2 players
3. **Room Generation**: Unique room ID created
4. **Chip Staking**: 500 chips deducted from accounts
5. **Game Initialization**: Auto-ready and start

### **Custom Lobbies**
- **Room Creation**: Manual room creation with codes
- **No Chip Cost**: Free to create and join
- **Manual Start**: Players must ready up manually
- **Friend Invites**: Share room codes with friends

### **Game State Management**
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

---

## 📱 Mobile Application

### **React Native Architecture**
- **Expo Managed Workflow**: Simplified development and deployment
- **Component-Based**: Reusable UI components
- **State Management**: Zustand for global state
- **Real-time Integration**: Socket.IO client

### **Screen Structure**
1. **AuthPhone.js**: Phone number input
2. **AuthCode.js**: Verification code input
3. **CreateUsername.js**: Username creation
4. **Lobby.js**: Game lobby and room creation
5. **Searching.js**: Ranked matchmaking
6. **Room.js**: Game room and player management
7. **Play.js**: Main game interface
8. **Profile.js**: User profile and statistics
9. **Leaderboard.js**: Player rankings

### **Key Components**
- **Card.js**: Individual card display
- **DraggableCard.js**: Drag-and-drop card functionality
- **Panel.js**: Game board panels
- **BackButton.js**: Navigation component

### **State Management**
```javascript
// Zustand store structure
{
  user: { id, username, chips, phone },
  socket: Socket.IO instance,
  currentRoom: room state,
  gameState: current game state
}
```

### **Real-time Features**
- **Live Updates**: Game state synchronization
- **Chat System**: In-game communication
- **Sound Effects**: Audio feedback for actions
- **Push Notifications**: Game invitations and updates

---

## 🌐 Web Application

### **HTML/JavaScript Implementation**
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Socket.IO client integration
- **Same Features**: Identical functionality to mobile app
- **Cross-browser**: Compatible with modern browsers

### **Page Structure**
1. **phone.html**: Phone authentication
2. **code.html**: Verification code input
3. **create-username.html**: Username creation
4. **lobby.html**: Game lobby
5. **room.html**: Game room
6. **play.html**: Main game interface
7. **board.html**: Game board display

### **Shared Components**
- **Authentication Flow**: Same as mobile app
- **Game Logic**: Identical game mechanics
- **Real-time Updates**: Socket.IO events
- **Chip System**: Same chip calculations

---

## 🗄️ Database & Storage

### **SQLite Database**
- **File-based**: Lightweight, no separate server needed
- **Automatic Creation**: Database created on first server start
- **Location**: `data/users.db` in project directory

### **Database Schema**
```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar TEXT,
  chips INTEGER DEFAULT 10000,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Data Operations**
- **User Creation**: New accounts with phone verification
- **Chip Updates**: Balance modifications after games
- **Statistics**: Game history and player performance
- **Backup**: Regular database backups for production

### **Storage Considerations**
- **Local Development**: `./data/users.db`
- **Production**: `/path/to/your/app/data/users.db`
- **Backup Strategy**: Regular database backups
- **File Permissions**: Proper write access for Node.js process

---

## 🔧 Technical Implementation

### **Game Engine Architecture**
```javascript
class GameEngine {
  constructor(roomId, players, isRanked = false)
  
  // Core methods
  startGame()
  dealCards()
  placeCard(playerId, cardIndex, row)
  nextRound()
  revealHands()
  endGame()
}
```

### **Socket.IO Event System**
#### **Client → Server Events**
- `auth:phone` - Phone number authentication
- `auth:code` - Verification code submission
- `auth:create-username` - Username creation
- `room:create` - Create custom room
- `room:join` - Join room by code
- `room:ready` - Player ready status
- `game:place` - Card placement
- `ranked:search` - Enter ranked queue
- `ranked:cancel` - Leave ranked queue

#### **Server → Client Events**
- `auth:success` - Authentication successful
- `room:state` - Room state update
- `game:deal` - New cards dealt
- `game:reveal` - Hand results
- `ranked:match-found` - Ranked match created
- `match:end` - Ranked match concluded

### **Card Management System**
- **Deck Generation**: Standard 52-card deck
- **Shuffling**: Random card distribution
- **Dealing Logic**: 5 initial + 3 per round
- **Placement Validation**: Ensures valid board structure

### **Timer System**
- **Round Timers**: Automatic progression between rounds
- **Auto-Placement**: Cards placed automatically if time expires
- **Configurable**: Timer durations can be adjusted

---

## 🧪 Testing & Debugging

### **Test Files Structure**
```
test/
├── fouls.test.js           # Board validation tests
├── scoring.test.js         # Scoring system tests
└── integration/            # End-to-end tests
```

### **Testing Strategy**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **Game Logic Tests**: Hand evaluation and scoring
- **Chip System Tests**: Balance calculations
- **Matchmaking Tests**: Queue management

### **Debug Tools**
1. **view-room.js**: Real-time room monitoring
   - Live room information
   - Player states and chip stacks
   - Game phase tracking
   - Auto-refresh every 15 seconds

2. **monitor-server.js**: Server-wide monitoring
   - Active rooms overview
   - Player connections
   - System performance

3. **Debug Scripts**:
   - `debug-foul.js`: Foul detection testing
   - `debug-hands.js`: Hand evaluation testing
   - `debug-scoring.js`: Scoring system testing

### **Logging System**
- **Game Logs**: Detailed game flow logging
- **Chip Logs**: Chip calculation details
- **Error Logs**: Comprehensive error tracking
- **Performance Logs**: System performance metrics

---

## 🚀 Deployment & Production

### **Local Development Setup**
```bash
# Start backend server
npm run dev

# Start mobile app
cd mobile
npx expo start
```

### **Production Deployment (DigitalOcean)**
1. **App Platform Setup**:
   - Connect GitHub repository
   - Set source directory to `/`
   - Use Dockerfile for build process
   - Set environment variables

2. **Environment Variables**:
   - `NODE_ENV=production`
   - `PORT=3000`
   - `JWT_SECRET=your-secure-secret`

3. **Database Setup**:
   - Database created automatically on first start
   - Ensure proper file permissions
   - Set up regular backups

### **Mobile App Distribution**
```bash
# Android APK build
cd mobile
npx expo build:android --type apk

# iOS Archive build
npx expo build:ios --type archive
```

### **Docker Configuration**
- **Dockerfile**: Multi-stage build for production
- **docker-compose.yml**: Local development setup
- **Port Mapping**: 3000 for application
- **Volume Mounts**: Database persistence

---

## 📊 Monitoring & Analytics

### **Real-time Monitoring**
- **Room Status**: Live game room information
- **Player Activity**: Connection and gameplay tracking
- **System Performance**: Server health metrics
- **Error Tracking**: Comprehensive error logging

### **Game Analytics**
- **Player Statistics**: Win/loss ratios, chip balances
- **Game Metrics**: Average game duration, hand strength
- **Performance Data**: Response times, connection quality
- **Usage Patterns**: Peak hours, popular game modes

### **Debug Information**
- **Chip Calculations**: Detailed chip change logs
- **Game Flow**: Phase transitions and player actions
- **Network Events**: Socket.IO connection tracking
- **Database Operations**: Query performance and results

### **Log Management**
- **Structured Logging**: JSON format for easy parsing
- **Log Rotation**: Automatic log file management
- **Error Aggregation**: Grouped error reporting
- **Performance Metrics**: Response time tracking

---

## 🔍 Development Workflow

### **Development Environment**
1. **Local Server**: `npm start` from root directory
2. **Mobile App**: `npx expo start` from mobile directory
3. **Database**: SQLite file automatically created
4. **Hot Reload**: Automatic server and app restart

### **Code Organization**
- **Feature-based**: Group related functionality
- **Shared Constants**: Centralized configuration
- **Component Reuse**: Common UI components
- **State Management**: Centralized game state

### **Version Control**
- **Git Workflow**: Feature branches and pull requests
- **Commit Messages**: Descriptive commit history
- **Code Review**: Peer review process
- **Documentation**: Inline code documentation

### **Testing Workflow**
1. **Unit Tests**: Run before commits
2. **Integration Tests**: Run before merging
3. **Manual Testing**: Game flow verification
4. **Performance Testing**: Load and stress testing

---

## 📚 API Reference

### **Authentication Endpoints**
```javascript
// Phone verification
POST /auth/phone
Body: { phone: string }

// Code verification
POST /auth/code
Body: { phone: string, code: string }

// Username creation
POST /auth/create-username
Body: { phone: string, username: string }
```

### **Room Management**
```javascript
// Create custom room
POST /room/create
Body: { userId: string }

// Join room
POST /room/join
Body: { roomCode: string, userId: string }

// Player ready status
POST /room/ready
Body: { roomId: string, userId: string, ready: boolean }
```

### **Game Actions**
```javascript
// Place card
POST /game/place
Body: { roomId: string, userId: string, cardIndex: number, row: string }

// Get room state
GET /room/:roomId/state

// Get user profile
GET /user/:userId/profile
```

### **Socket.IO Events**
```javascript
// Connection events
socket.on('connect', () => {})
socket.on('disconnect', () => {})

// Game events
socket.on('room:state', (state) => {})
socket.on('game:deal', (cards) => {})
socket.on('game:reveal', (results) => {})

// Matchmaking events
socket.on('ranked:match-found', (roomId) => {})
socket.on('match:end', (results) => {})
```

---

## 🚧 Future Enhancements

### **Planned Features**
1. **Tournament Mode**: Multi-table tournaments
2. **Leaderboards**: Global and seasonal rankings
3. **Achievements**: Player progression system
4. **Spectator Mode**: Watch live games
5. **Replay System**: Game history and analysis
6. **Social Features**: Friends list and invitations

### **Technical Improvements**
1. **WebSocket Optimization**: Binary protocol for efficiency
2. **Mobile Performance**: Native optimizations
3. **Analytics Dashboard**: Game statistics and insights
4. **API Documentation**: OpenAPI/Swagger specs
5. **Microservices**: Modular architecture for scalability
6. **Real-time Analytics**: Live performance monitoring

### **Scalability Considerations**
1. **Horizontal Scaling**: Multiple server instances
2. **Database Migration**: PostgreSQL for larger scale
3. **Caching Layer**: Redis for session management
4. **Load Balancing**: Nginx reverse proxy
5. **CDN Integration**: Static asset delivery
6. **Monitoring**: Prometheus and Grafana

### **User Experience Improvements**
1. **Tutorial System**: Interactive game learning
2. **Customization**: Themes and UI preferences
3. **Accessibility**: Screen reader and keyboard support
4. **Localization**: Multiple language support
5. **Offline Mode**: Basic functionality without internet
6. **Push Notifications**: Game updates and invitations

---

## 📝 Notes & Observations

### **Key Design Decisions**
- **Percentage-based positioning** for mobile scalability
- **Centralized chip management** to eliminate duplications
- **Real-time Socket.IO** for immediate game updates
- **SQLite database** for simplicity and portability

### **Performance Considerations**
- **In-memory game state** for fast access
- **Efficient card dealing** algorithms
- **Optimized Socket.IO** event handling
- **Minimal server logging** in production

### **Security Measures**
- **Phone verification** for account creation
- **JWT token** authentication
- **Input validation** on all endpoints
- **SQL injection** prevention

### **Development Preferences**
- **Ctrl+C to stop server** and restart with `npm start`
- **Minimal server monitoring** logs in production
- **Separate debug terminal** for development logging
- **Percentage-based UI** for cross-device compatibility

---

*This document provides a comprehensive overview of the OFC Pineapple Tournament system. For specific implementation details, refer to the individual source files and inline documentation.*

**Last Updated**: December 2024
**Version**: 1.0
**Status**: Active Development
