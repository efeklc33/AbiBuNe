const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
// Serve meme images
app.use('/memes', express.static(path.join(__dirname, 'memes')));

// Database files
const DB_DIR = path.join(__dirname, 'database');
const PLAYERS_DB = path.join(DB_DIR, 'players.json');
const LEADERBOARD_DB = path.join(DB_DIR, 'leaderboard.json');
const ACHIEVEMENTS_DB = path.join(DB_DIR, 'achievements.json');
const CHALLENGES_DB = path.join(DB_DIR, 'challenges.json');

// Create database directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

// Initialize database files
function initDatabase() {
  if (!fs.existsSync(PLAYERS_DB)) {
    fs.writeFileSync(PLAYERS_DB, JSON.stringify({}));
  }
  if (!fs.existsSync(LEADERBOARD_DB)) {
    fs.writeFileSync(LEADERBOARD_DB, JSON.stringify({
      weekly: [],
      monthly: [],
      alltime: []
    }));
  }
  if (!fs.existsSync(ACHIEVEMENTS_DB)) {
    fs.writeFileSync(ACHIEVEMENTS_DB, JSON.stringify({}));
  }
  if (!fs.existsSync(CHALLENGES_DB)) {
    fs.writeFileSync(CHALLENGES_DB, JSON.stringify({}));
  }
}

// Database functions
function loadDatabase(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error('Error loading database:', error);
    return {};
  }
}

function saveDatabase(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Player management
function getPlayerData(ip) {
  const players = loadDatabase(PLAYERS_DB);
  if (!players[ip]) {
    players[ip] = {
      caption: '',
      votes: 0,
      score: 0,
      xp: 0,
      coins: 0,
      streak: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      memesCreated: 0,
      level: 1,
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    saveDatabase(PLAYERS_DB, players);
  }
  return players[ip];
}

function resetPlayerData(ip) {
  const players = loadDatabase(PLAYERS_DB);
  if (players[ip]) {
    players[ip] = {
      caption: '',
      votes: 0,
      score: 0,
      xp: 0,
      coins: 0,
      streak: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      memesCreated: 0,
      level: 1,
      joinDate: players[ip].joinDate || new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    saveDatabase(PLAYERS_DB, players);
  }
  // clear achievements and challenges
  const achievements = loadDatabase(ACHIEVEMENTS_DB);
  if (achievements[ip]) {
    delete achievements[ip];
    saveDatabase(ACHIEVEMENTS_DB, achievements);
  }
  const challenges = loadDatabase(CHALLENGES_DB);
  if (challenges[ip]) {
    delete challenges[ip];
    saveDatabase(CHALLENGES_DB, challenges);
  }
}

function updatePlayerData(ip, updates) {
  const players = loadDatabase(PLAYERS_DB);
  if (players[ip]) {
    Object.assign(players[ip], updates);
    players[ip].lastActive = new Date().toISOString();
    saveDatabase(PLAYERS_DB, players);
  }
}

function addXP(ip, amount) {
  const player = getPlayerData(ip);
  const oldLevel = Math.floor(player.xp / 1000);
  player.xp += amount;
  const newLevel = Math.floor(player.xp / 1000);
  
  updatePlayerData(ip, { xp: player.xp });
  
  // Check for level up
  if (newLevel > oldLevel) {
    updatePlayerData(ip, { 
      level: newLevel + 1,
      coins: player.coins + 100 // Level up bonus
    });
    return { levelUp: true, newLevel: newLevel + 1 };
  }
  
  return { levelUp: false };
}

// Leaderboard management
function updateLeaderboard(ip, username, xp) {
  const leaderboard = loadDatabase(LEADERBOARD_DB);
  const playerEntry = { ip, username, xp, lastUpdate: new Date().toISOString() };
  
  ['weekly', 'monthly', 'alltime'].forEach(period => {
    const existing = leaderboard[period].findIndex(p => p.ip === ip);
    
    if (existing !== -1) {
      leaderboard[period][existing] = playerEntry;
    } else {
      leaderboard[period].push(playerEntry);
    }
    
    // Sort and keep top 50
    leaderboard[period].sort((a, b) => b.xp - a.xp);
    leaderboard[period] = leaderboard[period].slice(0, 50);
  });
  
  saveDatabase(LEADERBOARD_DB, leaderboard);
}

function getLeaderboard(period = 'alltime') {
  const leaderboard = loadDatabase(LEADERBOARD_DB);
  return leaderboard[period] || [];
}

// Achievement system
function unlockAchievement(ip, achievementId, name, xp) {
  const achievements = loadDatabase(ACHIEVEMENTS_DB);
  if (!achievements[ip]) {
    achievements[ip] = {};
  }
  
  if (!achievements[ip][achievementId]) {
    achievements[ip][achievementId] = {
      name,
      unlockedAt: new Date().toISOString(),
      xp
    };
    saveDatabase(ACHIEVEMENTS_DB, achievements);
    
    // Give XP reward
    addXP(ip, xp);
    return true;
  }
  return false;
}

// Challenge system
function updateChallenge(ip, challengeId, progress = 1) {
  const challenges = loadDatabase(CHALLENGES_DB);
  const today = new Date().toDateString();
  
  if (!challenges[ip]) {
    challenges[ip] = {};
  }
  
  if (!challenges[ip][today]) {
    challenges[ip][today] = {
      challenge1: { progress: 0, max: 1, completed: false },
      challenge2: { progress: 0, max: 3, completed: false },
      challenge3: { progress: 0, max: 5, completed: false }
    };
  }
  
  const challenge = challenges[ip][today][challengeId];
  if (!challenge.completed) {
    challenge.progress = Math.min(challenge.progress + progress, challenge.max);
    
    if (challenge.progress >= challenge.max) {
      challenge.completed = true;
      const rewards = { challenge1: 100, challenge2: 250, challenge3: 150 };
      addXP(ip, rewards[challengeId]);
      
      saveDatabase(CHALLENGES_DB, challenges);
      return { completed: true, xp: rewards[challengeId] };
    }
  }
  
  saveDatabase(CHALLENGES_DB, challenges);
  return { completed: false };
}

function getPlayerChallenges(ip) {
  const challenges = loadDatabase(CHALLENGES_DB);
  const today = new Date().toDateString();
  
  if (!challenges[ip] || !challenges[ip][today]) {
    return {
      challenge1: { progress: 0, max: 1, completed: false },
      challenge2: { progress: 0, max: 3, completed: false },
      challenge3: { progress: 0, max: 5, completed: false }
    };
  }
  
  return challenges[ip][today];
}

// Initialize database
initDatabase();

// Lobby and room management
const DEFAULT_MAX_PLAYERS = 4;

// roomId -> { players: [{id, username}], stage: 'lobby' | 'playing', currentTemplates: {}, settings: {} }
const rooms = new Map();

function getAvailableRoom(settings) {
  for (const [roomId, room] of rooms.entries()) {
    if (room.players.length < room.settings.playerCount && 
        room.stage === 'lobby' &&
        room.settings.mode === settings.mode) {
      return roomId;
    }
  }
  // create new room
  const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;
  rooms.set(roomId, { 
    players: [], 
    stage: 'lobby', 
    currentTemplates: {},
    settings: settings || { mode: 'quick', playerCount: DEFAULT_MAX_PLAYERS, roundTime: 60 }
  });
  return roomId;
}

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // Get client IP
  const clientIP = socket.handshake.address || socket.request.connection.remoteAddress;
  socket.clientIP = clientIP;

  // Send player data on connection
  socket.emit('playerData', {
    stats: getPlayerData(clientIP),
    challenges: getPlayerChallenges(clientIP),
    leaderboard: {
      weekly: getLeaderboard('weekly').slice(0, 10),
      monthly: getLeaderboard('monthly').slice(0, 10),
      alltime: getLeaderboard('alltime').slice(0, 10)
    }
  });

  socket.on('join-lobby', (data) => {
    const { username, settings } = typeof data === 'string' ? { username: data, settings: null } : data;
    const roomId = getAvailableRoom(settings);
    const room = rooms.get(roomId);

    room.players.push({ id: socket.id, username, ip: clientIP });
    socket.join(roomId);

    // Notify members
    io.to(roomId).emit('lobby-update', {
      players: room.players.map((p) => p.username),
      settings: room.settings,
      roomId: roomId
    });

    // Start game when room full
    if (room.players.length === room.settings.playerCount) {
      io.to(roomId).emit('countdown', 3);
      setTimeout(() => startGame(roomId), 3000);
    }
  });

  // Profil sıfırlama
  socket.on('reset-profile', () => {
    resetPlayerData(clientIP);
    socket.emit('playerData', {
      stats: getPlayerData(clientIP),
      challenges: getPlayerChallenges(clientIP),
      leaderboard: {
        weekly: getLeaderboard('weekly').slice(0, 10),
        monthly: getLeaderboard('monthly').slice(0, 10),
        alltime: getLeaderboard('alltime').slice(0, 10)
      }
    });
  });

  // Join with room code
  socket.on('joinByCode', ({ username, roomCode }) => {
    if (!roomCode || roomCode.length !== 6) {
      socket.emit('joinError', 'Geçersiz oda kodu');
      return;
    }
    const roomId = `room-${roomCode.toLowerCase()}`;
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('joinError', 'Oda bulunamadı');
      return;
    }
    if (room.stage !== 'lobby') {
      socket.emit('joinError', 'Oda şu an kapalı');
      return;
    }
    if (room.players.length >= room.settings.playerCount) {
      socket.emit('joinError', 'Oda dolu');
      return;
    }
    room.players.push({ id: socket.id, username, ip: clientIP });
    socket.join(roomId);
    io.to(roomId).emit('lobby-update', {
      players: room.players.map((p) => p.username),
      settings: room.settings,
      roomId: roomId,
    });
    if (room.players.length === room.settings.playerCount) {
      startGame(roomId);
    }
  });

  socket.on('submit-caption', ({ roomId, templateId, text }) => {
    const room = rooms.get(roomId);
    if (!room || room.stage !== 'caption') return;
    // Save caption
    room.captions[socket.id] = { template: templateId, text };
    // Broadcast caption to everyone (kendisi dahil)
    io.to(roomId).emit('receive-caption', {
      playerId: socket.id,
      username: room.players.find((p) => p.id === socket.id)?.username,
      templateId,
      text,
    });
    // Herkes gönderdi mi?
    if (Object.keys(room.captions).length === room.players.length) {
      startVote(roomId);
    }
  });

  // Oy verme
  socket.on('vote', ({ roomId, votedId, type = 'like' }) => {
    const room = rooms.get(roomId);
    if (!room || room.stage !== 'voting') return;
    const validTypes = ['like', 'dislike', 'babapro'];
    if (!validTypes.includes(type)) type = 'like';
    room.votes[socket.id] = { votedId, type };
    if (Object.keys(room.votes).length === room.players.length) {
      finishRound(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected', socket.id);
    // Remove from rooms
    for (const [roomId, room] of rooms.entries()) {
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        io.to(roomId).emit('lobby-update', room.players.map((p) => p.username));
        // If room empty remove
        if (room.players.length === 0) {
          rooms.delete(roomId);
        }
        break;
      }
    }
  });
});

function startGame(roomId) {
  const room = rooms.get(roomId);
  room.stage = 'caption';
  room.captions = {};
  room.votes = {};
  const fs = require('fs');
  const templatesDir = path.join(__dirname, 'memes');
  const files = fs.readdirSync(templatesDir).filter((f) => /\.(png|jpe?g|gif)$/i.test(f));
  const shuffled = files.sort(() => 0.5 - Math.random());
  const DURATION = room.settings.roundTime; // saniye
  const startTs = Date.now();
  room.currentTemplates = {};
  room.players.forEach((player, idx) => {
    const template = shuffled[idx % shuffled.length];
    room.currentTemplates[player.id] = template;
    io.to(player.id).emit('start-round', {
      template,
      roomId,
      duration: DURATION,
      startTs,
    });
  });
  room.roundTimer = setTimeout(() => {
    startVote(roomId);
  }, DURATION * 1000);
}

function startVote(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.stage !== 'caption') return;
  clearTimeout(room.roundTimer);
  room.stage = 'voting';
  const captions = room.players.map((p) => ({
    playerId: p.id,
    username: p.username,
    template: room.currentTemplates[p.id],
    text: room.captions[p.id]?.text || '',
  }));
  io.to(roomId).emit('start-vote', { captions, roomId });
}

function finishRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const tally = {};
  const voteWeights = { babapro: 3, like: 1, meh: 0, dislike: -1 };
  room.players.forEach((p) => (tally[p.id] = 0));
  Object.values(room.votes).forEach(({ votedId, type }) => {
    if (tally[votedId] !== undefined) tally[votedId] += voteWeights[type] || 0;
  });
  // Update player scores and XP based on tally
  room.players.forEach((p) => {
    const ip = p.ip;
    const scoreGain = tally[p.id] || 0;
    updatePlayerData(ip, { score: (getPlayerData(ip).score || 0) + scoreGain, votes: (getPlayerData(ip).votes || 0) + scoreGain });
    if (scoreGain > 0) addXP(ip, scoreGain * 10);
  });
  io.to(roomId).emit('round-result', { tally });
  // Şimdilik oyun bitti, odayı kapat
  setTimeout(() => rooms.delete(roomId), 10000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Veritabanı sistemi aktif - IP bazlı oyuncu takibi');
});
