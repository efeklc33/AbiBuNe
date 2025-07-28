const socket = io();
const voteData = JSON.parse(sessionStorage.getItem('voteData'));
if(!voteData){ location.href='index.html'; }
const { captions, roomId } = voteData;
const grid = document.getElementById('memeGrid');

captions.forEach(item=>{
  const card=document.createElement('div');
  card.className='meme-card';
  card.innerHTML=`<img src="/memes/${item.template}" alt="meme" />`;
  const captionP=document.createElement('p');
  captionP.textContent=item.text;
  card.appendChild(captionP);
  const btnWrap=document.createElement('div');
  btnWrap.className='vote-btns';
  const babaBtn=document.createElement('button');
  babaBtn.className='babapro';
  babaBtn.textContent='🤯';
  const likeBtn=document.createElement('button');
  likeBtn.className='like';
  likeBtn.textContent='👍';
  const mehBtn=document.createElement('button');
  mehBtn.className='meh';
  mehBtn.textContent='😐';
  const dislikeBtn=document.createElement('button');
  dislikeBtn.className='dislike';
  dislikeBtn.textContent='👎';
  [babaBtn,likeBtn,mehBtn,dislikeBtn].forEach(btn=>btnWrap.appendChild(btn));
  card.appendChild(btnWrap);
  grid.appendChild(card);

  function disable(){[likeBtn,dislikeBtn,babaBtn].forEach(b=>b.classList.add('disabled'))}
  babaBtn.onclick=()=>{socket.emit('vote',{roomId,votedId:item.playerId,type:'babapro'});disable();};
  likeBtn.onclick=()=>{socket.emit('vote',{roomId,votedId:item.playerId,type:'like'});disable();};
  mehBtn.onclick=()=>{socket.emit('vote',{roomId,votedId:item.playerId,type:'meh'});disable();};
  dislikeBtn.onclick=()=>{socket.emit('vote',{roomId,votedId:item.playerId,type:'dislike'});disable();};
});

socket.on('round-result',({tally})=>{
  alert('Oylar sayıldı! Sonuçlar geliyor...');
  location.href='index.html';
});
