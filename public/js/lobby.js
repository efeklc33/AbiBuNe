const socket = io();

const form = document.getElementById('usernameForm');
const usernameInput = document.getElementById('username');
const playerList = document.getElementById('playerList');
const statusP = document.getElementById('status');
const playerCountEl = document.getElementById('playerCount');

// Game settings
let selectedMode = 'quick';
let selectedPlayerCount = 3;
let selectedRoundTime = 60;

const modeInfo = {
  quick: { name: 'Hızlı Oyun', desc: 'Rastgele oyuncularla hemen başla' },
  private: { name: 'Özel Oyun', desc: 'Arkadaşlarınla özel oda' },
  custom: { name: 'Özel Ayarlar', desc: 'Kendi kurallarını belirle' }
};

document.addEventListener('DOMContentLoaded', () => {
  const modeCards = document.querySelectorAll('.mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      selectedMode = card.dataset.mode;
      updateModeDisplay();
      showUsernameSection();
      
      // Show notification based on mode
      const modeNames = {
        quick: 'Hızlı Oyun',
        private: 'Özel Oda',
        custom: 'Yaratıcı Mod'
      };
      showNotification(`${modeNames[selectedMode]} seçildi!`, 'info');
    });
  });
  
  // Player count selection
  const countBtns = document.querySelectorAll('.count-btn');
  countBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      countBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPlayerCount = parseInt(btn.dataset.count);
    });
  });
  
  // Round time selection
  const timeBtns = document.querySelectorAll('.time-btn');
  timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRoundTime = parseInt(btn.dataset.time);
    });
  });
});

function updateModeDisplay() {
  const modeNameEl = document.getElementById('selectedModeName');
  const modeDescEl = document.getElementById('selectedModeDesc');
  
  if (modeNameEl && modeDescEl && modeInfo[selectedMode]) {
    modeNameEl.textContent = modeInfo[selectedMode].name;
    modeDescEl.textContent = modeInfo[selectedMode].desc;
  }
}

function showGameModes() {
  document.getElementById('gameModes').style.display = 'grid';
  document.getElementById('usernameSection').style.display = 'none';
  document.getElementById('lobbySection').style.display = 'none';
}

function showUsernameSection() {
  document.getElementById('gameModes').style.display = 'none';
  document.getElementById('usernameSection').style.display = 'block';
  document.getElementById('lobbySection').style.display = 'none';
}

function showLobbySection() {
  document.getElementById('gameModes').style.display = 'none';
  document.getElementById('usernameSection').style.display = 'none';
  document.getElementById('lobbySection').style.display = 'block';
}

function showJoinByCode() {
  document.getElementById('roomCodeSection').style.display = 'flex';
  document.getElementById('roomCodeInput').focus();
}

function hideJoinByCode() {
  document.getElementById('roomCodeSection').style.display = 'none';
  document.getElementById('roomCodeInput').value = '';
}

function joinWithCode() {
  const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!roomCode) {
    showNotification('Oda kodu gerekli!', 'error');
    return;
  }
  
  if (roomCode.length !== 6) {
    showNotification('Oda kodu 6 karakter olmalı!', 'error');
    return;
  }
  
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) {
    showNotification('Önce kullanıcı adını gir!', 'error');
    hideJoinByCode();
    return;
  }
  
  socket.emit('joinByCode', {
    username: username,
    roomCode: roomCode
  });
  
  hideJoinByCode();
  showNotification(`${roomCode} kodlu odaya katılmaya çalışılıyor...`, 'info');
}

function joinRandomGame() {
  if (!selectedMode) {
    showNotification('Önce bir oyun modu seç!', 'error');
    return;
  }
  
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) {
    showNotification('Kullanıcı adı gerekli!', 'error');
    return;
  }
  
  // Emit join request with settings
  socket.emit('joinGame', {
    username: username,
    mode: selectedMode,
    playerCount: selectedPlayerCount,
    roundDuration: selectedRoundTime
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;
  
  const gameSettings = {
    mode: selectedMode,
    playerCount: selectedPlayerCount,
    roundTime: selectedRoundTime
  };
  
  socket.emit('join-lobby', { username, settings: gameSettings });
  showLobbySection();
  statusP.textContent = `${selectedPlayerCount} oyuncu bekleniyor... (${selectedPlayerCount - 1} kişi daha)`;
});

// Countdown overlay element
const countdownOverlay = document.getElementById('countdownOverlay');

socket.on('countdown', (seconds) => {
  let counter = seconds;
  countdownOverlay.style.display = 'flex';
  countdownOverlay.textContent = counter;
  const intId = setInterval(() => {
    counter -= 1;
    if (counter <= 0) {
      clearInterval(intId);
      countdownOverlay.style.display = 'none';
    } else {
      countdownOverlay.textContent = counter;
    }
  }, 1000);
});

socket.on('lobby-update', (data) => {
  const { players, settings, roomId } = data;
  
  playerList.innerHTML = '';
  players.forEach((u, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="player-name">${u}</span> <span class="player-status">Hazır</span>`;
    li.style.animationDelay = `${index * 0.1}s`;
    playerList.appendChild(li);
  });
  
  if (playerCountEl) {
    playerCountEl.textContent = players.length;
  }
  
  // Update max player count display
  const maxPlayerEl = document.querySelector('.player-count');
  if (maxPlayerEl && settings) {
    maxPlayerEl.innerHTML = `<span id="playerCount">${players.length}</span>/${settings.playerCount} Oyuncu`;
  }
  
  // Generate room code based on roomId
  const roomCodeEl = document.getElementById('roomCode');
  if (roomCodeEl && roomId && !roomCodeEl.dataset.set) {
    roomCodeEl.textContent = roomId.substring(5).toUpperCase();
    roomCodeEl.dataset.set = 'true';
  }
  
  // Update status message
  if (settings && statusP) {
    const remaining = settings.playerCount - players.length;
    if (remaining > 0) {
      statusP.textContent = `${remaining} oyuncu daha bekleniyor...`;
    } else {
      statusP.textContent = 'Oyun başlıyor!';
    }
  }
});

socket.on('lobbyUpdate', (data) => {
  updateLobbyDisplay(data);
});

socket.on('joinError', (error) => {
  showNotification(error, 'error');
});

socket.on('playerData', (data) => {
  // Update player stats from server
  playerStats = data.stats;
  playerChallenges = data.challenges;
  leaderboardData = data.leaderboard;
  
  updatePlayerStats();
  updateChallengeDisplay();
});

socket.on('gameStarted', () => {
  showNotification('🎮 Oyun başladı!', 'success');
});

socket.on('gameWon', (data) => {
  handleXPGain(data.xp, data.levelUp);
  showNotification('🏆 Kazandın!', 'success');
});

socket.on('gameLost', (data) => {
  handleXPGain(data.xp);
  showNotification('😔 Kaybettin, tekrar dene!', 'info');
});

socket.on('memeCreated', () => {
  showNotification('🎨 Meme oluşturuldu!', 'success');
});

socket.on('achievementUnlocked', (data) => {
  handleAchievementUnlock(data.name, data.xp);
});

socket.on('challengeCompleted', (data) => {
  handleChallengeCompleted(data.challenge, data.xp);
});

socket.on('start-round', ({ template, roomId, duration, startTs }) => {
  const params = new URLSearchParams({
    template,
    roomId,
    dur: duration,
    start: startTs,
  });
  window.location.href = `game.html?${params.toString()}`;
});

// Menu functions
function showProfile() {
  document.getElementById('profileModal').style.display = 'flex';
}

function showLeaderboard() {
  document.getElementById('leaderboardModal').style.display = 'flex';
}

function showAchievements() {
  document.getElementById('achievementsModal').style.display = 'flex';
}

function showSettings() {
  showNotification('Ayarlar yakında gelecek!', 'info');
}

function showTournament() {
  showNotification('Turnuva modu yakında gelecek!', 'info');
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Real server-based data
let playerStats = {
  xp: 0,
  coins: 0,
  streak: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  memesCreated: 0,
  level: 1
};

let leaderboardData = {
  weekly: [],
  monthly: [],
  alltime: []
};

let playerChallenges = {
  challenge1: { progress: 0, max: 1, completed: false },
  challenge2: { progress: 0, max: 3, completed: false },
  challenge3: { progress: 0, max: 5, completed: false }
};

function updatePlayerStats() {
  const statCards = document.querySelectorAll('.stat-card');
  if (statCards.length >= 3) {
    statCards[0].querySelector('.stat-value').textContent = playerStats.xp.toLocaleString();
    statCards[1].querySelector('.stat-value').textContent = playerStats.coins.toLocaleString();
    statCards[2].querySelector('.stat-value').textContent = playerStats.streak;
  }
}

function updateLeaderboardDisplay() {
  // Leaderboard is now managed by server
  // This function is kept for compatibility but data comes from server
}

function showLeaderboardTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  const data = leaderboardData[tab] || [];
  const list = document.getElementById('leaderboardList');
  list.innerHTML = '';
  
  if (data.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'leaderboard-item';
    emptyMessage.innerHTML = '<span class="player-name">Henüz oyuncu yok</span>';
    list.appendChild(emptyMessage);
    return;
  }
  
  data.forEach((player, index) => {
    const item = document.createElement('div');
    item.className = index < 3 ? 'leaderboard-item top-3' : 'leaderboard-item';
    
    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
    
    item.innerHTML = `
      <span class="rank">${rankEmoji}</span>
      <span class="player-name">${player.username || player.name}</span>
      <span class="score">${player.xp.toLocaleString()} XP</span>
    `;
    list.appendChild(item);
  });
  
  // Add current player if not in top list
  const currentPlayerName = document.getElementById('usernameInput').value.trim() || 'Sen';
  const currentPlayerInList = data.find(p => (p.username || p.name) === currentPlayerName);
  
  if (!currentPlayerInList && playerStats.xp > 0) {
    const currentPlayerRank = data.length + 1;
    const currentPlayer = document.createElement('div');
    currentPlayer.className = 'leaderboard-item current-player';
    currentPlayer.innerHTML = `
      <span class="rank">${currentPlayerRank}</span>
      <span class="player-name">${currentPlayerName}</span>
      <span class="score">${playerStats.xp.toLocaleString()} XP</span>
    `;
    list.appendChild(currentPlayer);
  }
}

function joinRandomGame() {
  selectedMode = 'quick';
  updateModeDisplay();
  showUsernameSection();
}

function createRoom() {
  selectedMode = 'private';
  updateModeDisplay();
  showUsernameSection();
}

function joinWithCode() {
  const code = prompt('Oda kodunu girin:');
  if (code) {
    alert(`Oda ${code} aranıyor...`);
  }
}

function leaveLobby() {
  if (confirm('Lobiden ayrılmak istediğinizden emin misiniz?')) {
    location.reload();
  }
}

function copyRoomCode() {
  const code = document.getElementById('roomCode').textContent;
  navigator.clipboard.writeText(code).then(() => {
    alert('Oda kodu kopyalandı!');
  });
}

function inviteFriends() {
  const code = document.getElementById('roomCode').textContent;
  const url = `${window.location.origin}?room=${code}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('Davet linki kopyalandı!');
  });
}

function changeLobbySettings() {
  showNotification('Lobi ayarları yakında gelecek!', 'info');
}

// Notification system
function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notifications');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

// Daily challenge timer
function updateChallengeTimer() {
  const timer = document.getElementById('challengeTimer');
  if (!timer) return;
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Initialize features
document.addEventListener('DOMContentLoaded', () => {
  // Player stats and challenges will be loaded from server
  // Initial display will be updated when server sends data
  
  // Update challenge timer every second
  setInterval(updateChallengeTimer, 1000);
  updateChallengeTimer();
  
  // Add click handlers for modal backgrounds
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Animate stat cards on hover
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px) scale(1.05)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) scale(1)';
    });
  });
  
  // Add Enter key support for room code input
  document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      joinWithCode();
    }
  });
  
  // Show welcome notification
  setTimeout(() => {
    showNotification('🎮 Make it Meme\'e hoş geldin!', 'success');
  }, 1000);
});

// Add CSS for slide out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// XP updates now come from server
function handleXPGain(amount, levelUp = false) {
  showNotification(`+${amount} XP kazandın!`, 'success');
  
  if (levelUp) {
    setTimeout(() => {
      showNotification(`🎉 Seviye atladın!`, 'success');
    }, 500);
  }
}

// Achievement system now handled by server
function handleAchievementUnlock(name, xp) {
  showNotification(`🏅 Başarı: ${name}`, 'success', 4000);
  setTimeout(() => {
    handleXPGain(xp);
  }, 1000);
}

// Challenge system now handled by server
function updateChallengeDisplay() {
  Object.keys(playerChallenges).forEach(challengeId => {
    const challenge = playerChallenges[challengeId];
    const progressBar = document.getElementById(`${challengeId}Progress`);
    if (progressBar) {
      const percentage = (challenge.progress / challenge.max) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  });
}

function handleChallengeCompleted(challengeId, xp) {
  showNotification(`✅ Günlük görev tamamlandı! +${xp} XP`, 'success');
}

// Game events now handled by server
// These functions are kept for compatibility but events come from server
