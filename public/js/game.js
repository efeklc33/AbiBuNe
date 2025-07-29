const socket = io();
// === DEBUG LOGGING ===
socket.onAny((event, ...args) => {
  console.debug('[SOCKET]', event, args);
});
console.debug('Game script loaded');

// Parse query params
const urlParams = new URLSearchParams(window.location.search);
const templateFile = urlParams.get('template');
const roomId = urlParams.get('roomId');
const duration = parseInt(urlParams.get('dur') || '60', 10);
const startTs = parseInt(urlParams.get('start') || Date.now().toString(), 10);

document.getElementById('templateName').textContent = templateFile;

const canvas = document.getElementById('memeCanvas');
const ctx = canvas.getContext('2d');
const captionInput = document.getElementById('captionInput');
const sendBtn = document.getElementById('sendBtn');

let submitted = false;

const img = new Image();
img.src = `/memes/${templateFile}`;

// Timer setup
const timerEl = document.getElementById('timer');
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTs) / 1000);
  const remaining = Math.max(0, duration - elapsed);
  timerEl.textContent = `Süre: ${remaining}s`;
  if (remaining === 0) {
    captionInput.disabled = true;
    sendBtn.disabled = true;
    clearInterval(timerInterval);
    autoSubmit();
  }
}
const timerInterval = setInterval(updateTimer, 1000);
updateTimer();
img.onload = () => {
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
};

function redraw(text) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  if (text) {
    ctx.font = '28px Impact';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    const x = canvas.width / 2;
    const y = canvas.height - 40;
    ctx.fillText(text, x, y);
    ctx.strokeText(text, x, y);
  }
}

captionInput.addEventListener('input', () => {
  redraw(captionInput.value);
});

function autoSubmit() {
  console.debug('Auto submit triggered');
  if (submitted) return;
  const text = captionInput.value.trim();
  console.debug('Emitting submit-caption', { roomId, templateFile, text });
  socket.emit('submit-caption', { roomId, templateId: templateFile, text });
  submitted = true;
}



sendBtn.addEventListener('click', () => {
  const text = captionInput.value.trim();
  if (submitted) return;
  console.debug('Sending caption:', { roomId, templateFile, text });
  socket.emit('submit-caption', {
    roomId,
    templateId: templateFile,
    text,
  });
  sendBtn.disabled = true;
  submitted = true;
  
  // Show waiting message
  captionInput.placeholder = 'Caption gönderildi, diğer oyuncular bekleniyor...';
  captionInput.disabled = true;
  
  // Add manual voting trigger button for testing
  setTimeout(() => {
    if (document.getElementById('votingSection').style.display === 'none') {
      const testBtn = document.createElement('button');
      testBtn.textContent = '📝 Test Oylama Başlat';
      testBtn.style.cssText = 'margin-top:10px;padding:10px 20px;background:#ff6b6b;border:none;border-radius:8px;color:white;cursor:pointer;';
      testBtn.onclick = () => {
        console.debug('Manual voting trigger clicked');
        const fakeVoteData = {
          captions: [
            {
              playerId: socket.id,
              imageUrl: canvas.toDataURL(),
              text: text || 'Test caption'
            },
            {
              playerId: 'bot_player',
              imageUrl: canvas.toDataURL(), 
              text: 'Bot yaptı bu meme’i'
            },
            {
              playerId: 'test_player',
              imageUrl: canvas.toDataURL(),
              text: 'Test oyuncu caption’ı'
            }
          ],
          roomId: roomId
        };
        // Manually trigger the start-vote event
        const event = new CustomEvent('start-vote');
        socket.emit('start-vote', fakeVoteData);
        // Also directly call the handler
        handleStartVote(fakeVoteData);
        testBtn.remove();
      };
      document.querySelector('.container').appendChild(testBtn);
    }
  }, 3000);
});

socket.on('receive-caption', ({ playerId, username, templateId, text }) => {
  // Şimdilik console yerine ekrana ufak bildirim olarak ekleyelim
  const note = document.createElement('div');
  note.textContent = `${username}: ${text}`;
  note.style.fontSize = '12px';
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 4000);
});

// Voting phase
const voteArea = document.getElementById('voteArea');
function createVoteButton(item) {
  const btn = document.createElement('button');
  btn.textContent = `${item.username}: ${item.text || '(boş)'}`;
  btn.style.display = 'block';
  btn.style.margin = '6px auto';
  btn.onclick = () => {
    socket.emit('vote', { roomId, votedId: item.playerId });
    voteArea.textContent = 'Oyun sonuçları bekleniyor...';
  };
  return btn;
}

// Create reusable function for starting vote
function handleStartVote({ captions, roomId }) {
  console.debug('Starting vote phase with captions:', captions);
  
  // Hide game elements
  document.getElementById('templateName').style.display = 'none';
  document.getElementById('timer').style.display = 'none';
  document.getElementById('memeCanvas').style.display = 'none';
  document.getElementById('captionInput').style.display = 'none';
  document.getElementById('sendBtn').style.display = 'none';
  
  // Remove test button if exists
  const testBtn = document.querySelector('button[style*="background:#ff6b6b"]');
  if (testBtn) testBtn.remove();
  
  // Show voting section
  const votingSection = document.getElementById('votingSection');
  const memeGrid = document.getElementById('memeGrid');
  votingSection.style.display = 'block';
  
  // Clear previous content
  memeGrid.innerHTML = '';
  
  // Create meme cards for voting
  captions.forEach(caption => {
    const card = document.createElement('div');
    card.className = 'meme-card';
    
    const img = document.createElement('img');
    img.src = caption.imageUrl;
    img.alt = 'Meme';
    
    // Add caption text display
    const captionText = document.createElement('p');
    captionText.textContent = caption.text || 'Boş caption';
    captionText.style.cssText = 'color:white;margin:10px 0;font-weight:600;text-align:center;';
    
    const voteButtons = document.createElement('div');
    voteButtons.className = 'vote-btns';
    
    const likeBtn = document.createElement('button');
    likeBtn.className = 'like';
    likeBtn.textContent = '😂 Beğendim';
    likeBtn.onclick = () => {
      socket.emit('vote', { roomId, votedId: caption.playerId, voteType: 'like' });
      voteButtons.classList.add('disabled');
      console.debug('Voted like for:', caption.playerId);
    };
    
    const dislikeBtn = document.createElement('button');
    dislikeBtn.className = 'dislike';
    dislikeBtn.textContent = '🙄 Beğenmedim';
    dislikeBtn.onclick = () => {
      socket.emit('vote', { roomId, votedId: caption.playerId, voteType: 'dislike' });
      voteButtons.classList.add('disabled');
      console.debug('Voted dislike for:', caption.playerId);
    };
    
    const babaproBtn = document.createElement('button');
    babaproBtn.className = 'babapro';
    babaproBtn.textContent = '🔥 BABAPRO';
    babaproBtn.onclick = () => {
      socket.emit('vote', { roomId, votedId: caption.playerId, voteType: 'babapro' });
      voteButtons.classList.add('disabled');
      console.debug('Voted babapro for:', caption.playerId);
    };
    
    voteButtons.appendChild(likeBtn);
    voteButtons.appendChild(dislikeBtn);
    voteButtons.appendChild(babaproBtn);
    
    card.appendChild(img);
    card.appendChild(captionText);
    card.appendChild(voteButtons);
    memeGrid.appendChild(card);
  });
}

// Socket event listener
socket.on('start-vote', handleStartVote);

/* Old inline voting removed
  // Hide caption input
  captionInput.style.display = 'none';
  sendBtn.style.display = 'none';
  timerEl.style.display = 'none';
  voteArea.style.display = 'block';
  voteArea.innerHTML = '<h3>Oyunu kime veriyorsun?</h3>';
  captions.forEach((c) => {
    if (c.playerId !== socket.id) {
      voteArea.appendChild(createVoteButton(c));
    }
  });
*/

socket.on('round-result', ({ tally }) => {
  console.debug('Received round-result:', tally);
  
  // Show results in voting section
  const votingSection = document.getElementById('votingSection');
  const memeGrid = document.getElementById('memeGrid');
  
  // Update title and clear grid
  votingSection.querySelector('h1').textContent = 'Oyun Sonuçları';
  votingSection.querySelector('p').textContent = 'İşte bu turun kazananları!';
  memeGrid.innerHTML = '';
  
  // Create results display
  const resultsDiv = document.createElement('div');
  resultsDiv.style.cssText = 'background:rgba(255,255,255,0.1);border-radius:15px;padding:20px;margin:20px auto;max-width:600px;';
  
  const resultsTitle = document.createElement('h3');
  resultsTitle.textContent = 'Sonuçlar';
  resultsTitle.style.cssText = 'color:#8a2be2;margin-bottom:15px;';
  resultsDiv.appendChild(resultsTitle);
  
  Object.entries(tally).forEach(([pid, score]) => {
    const resultItem = document.createElement('div');
    resultItem.style.cssText = 'display:flex;justify-content:space-between;padding:10px;margin:5px 0;background:rgba(255,255,255,0.05);border-radius:8px;';
    
    const playerName = document.createElement('span');
    playerName.textContent = pid === socket.id ? 'Sen' : pid;
    playerName.style.color = pid === socket.id ? '#ffc107' : '#ffffff';
    
    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = `${score} oy`;
    scoreSpan.style.cssText = 'color:#28a745;font-weight:600;';
    
    resultItem.appendChild(playerName);
    resultItem.appendChild(scoreSpan);
    resultsDiv.appendChild(resultItem);
  });
  
  // Add back to lobby button
  const backBtn = document.createElement('button');
  backBtn.textContent = '🏠 Lobiye Dön';
  backBtn.style.cssText = 'margin-top:20px;padding:12px 25px;background:linear-gradient(45deg,#4b0082,#6a0dad);border:none;border-radius:25px;color:white;font-weight:600;cursor:pointer;';
  backBtn.onclick = () => {
    window.location.href = 'index.html';
  };
  resultsDiv.appendChild(backBtn);
  
  memeGrid.appendChild(resultsDiv);
});
