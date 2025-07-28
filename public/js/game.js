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
  socket.emit('submit-caption', {
    roomId,
    templateId: templateFile,
    text,
  });
  sendBtn.disabled = true;
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

socket.on('start-vote', ({ captions, roomId }) => {
  console.debug('Received start-vote, redirecting to vote.html');
  // Save vote data and redirect
  sessionStorage.setItem('voteData', JSON.stringify({ captions, roomId }));
  window.location.href = 'vote.html';
});

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
  voteArea.innerHTML = '<h3>Sonuçlar</h3>';
  Object.entries(tally).forEach(([pid, score]) => {
    const div = document.createElement('div');
    div.textContent = `${pid === socket.id ? 'Sen' : pid}: ${score} oy`;
    voteArea.appendChild(div);
  });
});
