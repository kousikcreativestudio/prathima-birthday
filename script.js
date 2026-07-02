const TARGET_BUTTERFLIES = 12;
const PHOTO_SOURCES = [
  './photos/main-photo.jpg',
  './photos/main-photo.jpeg',
  './photos/main-photo.png',
  './photos/photo.jpg',
  './photos/photo1.jpg'
];

let collected = 0;
let gameRunning = false;
let spawnTimer = null;
let audioCtx = null;
let musicStarted = false;
let musicTimer = null;
let musicIndex = 0;
let activeNodes = [];
let particleTimer = null;

const app = document.getElementById('app');
const personName = (app.dataset.personName || 'SAHITYA').trim();

const screens = {
  start: document.getElementById('startScreen'),
  game: document.getElementById('gameScreen'),
  gift: document.getElementById('giftScreen'),
  wish: document.getElementById('wishScreen'),
  photo: document.getElementById('photoScreen'),
  final: document.getElementById('finalScreen')
};

const playBtn = document.getElementById('playBtn');
const score = document.getElementById('score');
const gameLayer = document.getElementById('gameLayer');
const moonGate = document.getElementById('moonGate');
const flash = document.getElementById('flash');
const openPhotoBtn = document.getElementById('openPhotoBtn');
const finalBtn = document.getElementById('finalBtn');
const replayBtn = document.getElementById('replayBtn');
const mainPhoto = document.getElementById('mainPhoto');
const photoFrame = document.querySelector('.photoFrame');
const nameTitle = document.getElementById('nameTitle');
const finalName = document.getElementById('finalName');
const canvas = document.getElementById('skyCanvas');
const ctx = canvas.getContext('2d');

nameTitle.textContent = personName;
finalName.textContent = personName;

function show(screenName){
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');

  if(screenName !== 'wish') screens.wish.classList.remove('ready');
  if(screenName === 'final') stopMusicSoon();
}

function resizeCanvas(){
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(app.clientWidth * dpr);
  canvas.height = Math.floor(app.clientHeight * dpr);
  canvas.style.width = app.clientWidth + 'px';
  canvas.style.height = app.clientHeight + 'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  if(!musicStarted){
    musicStarted = true;
    startMusic();
  }
}

function tone(freq, dur = .18, type = 'sine', vol = .06, delay = 0){
  if(!audioCtx || !freq) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  activeNodes.push({osc, gain});
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + .025);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur + .04);
  osc.onended = () => {
    try{ osc.disconnect(); gain.disconnect(); }catch(e){}
    activeNodes = activeNodes.filter(node => node.osc !== osc);
  };
}

function collectSound(){
  tone(740,.1,'triangle',.07);
  tone(1180,.18,'sine',.055,.05);
}

function gateSound(){
  tone(196,.28,'sine',.07);
  tone(392,.38,'triangle',.075,.12);
  tone(784,.55,'sine',.06,.28);
  tone(1175,.65,'triangle',.04,.42);
}

function photoSound(){
  tone(330,.20,'sine',.06);
  tone(660,.35,'triangle',.055,.12);
  tone(990,.55,'sine',.04,.24);
}

function finalSound(){
  tone(262,.28,'sine',.07);
  tone(392,.35,'triangle',.065,.12);
  tone(523,.45,'sine',.06,.25);
  tone(784,.65,'triangle',.05,.42);
}

function startMusic(){
  const melody = [
    [392,.28],[440,.28],[523,.42],[440,.32],[392,.45],[0,.22],
    [392,.28],[440,.28],[587,.42],[523,.55],[0,.28],
    [523,.28],[587,.28],[659,.42],[587,.35],[523,.50],[440,.55],[0,.38]
  ];

  function next(){
    if(!musicStarted || !audioCtx) return;
    const [freq,dur] = melody[musicIndex % melody.length];
    if(freq){
      tone(freq,dur,'sine',.024);
      tone(freq*2,dur*.66,'triangle',.009,.03);
    }
    musicIndex++;
    musicTimer = setTimeout(next, dur * 1000);
  }

  next();
}

function stopMusicSoon(){
  setTimeout(stopMusic, 1200);
}

function stopMusic(){
  musicStarted = false;
  if(musicTimer){
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  activeNodes.forEach(node => {
    try{ node.osc.stop(0); }catch(e){}
    try{ node.osc.disconnect(); node.gain.disconnect(); }catch(e){}
  });
  activeNodes = [];
  if(audioCtx){
    try{ audioCtx.close(); }catch(e){}
    audioCtx = null;
  }
}

function flashOpen(){
  flash.classList.remove('show');
  void flash.offsetWidth;
  flash.classList.add('show');
}

function updateScore(){
  score.textContent = `Butterflies ${collected} / ${TARGET_BUTTERFLIES}`;
}

function sparkBurst(x,y,count=18){
  for(let i=0;i<count;i++){
    const spark = document.createElement('div');
    spark.className = 'spark';
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    spark.style.setProperty('--x',(Math.random()*160-80)+'px');
    spark.style.setProperty('--y',(Math.random()*160-80)+'px');
    app.appendChild(spark);
    setTimeout(() => spark.remove(), 850);
  }
}

function spawnButterfly(initial=false){
  if(!gameRunning) return;

  const b = document.createElement('button');
  b.className = 'butterfly';
  b.type = 'button';
  b.setAttribute('aria-label','Collect butterfly');
  b.innerHTML = '<span></span>';

  const w = app.clientWidth;
  const h = app.clientHeight;
  const sx = Math.random() * (w - 70) + 12;
  const sy = initial ? Math.random() * (h * .72) + 60 : h + 60;
  const dx = Math.random() * 110 - 55;
  const dy = initial ? Math.random() * 160 - 80 : -(h * (.45 + Math.random() * .45));
  const dx2 = dx + Math.random() * 130 - 65;
  const dy2 = dy - 180;

  b.style.setProperty('--sx',sx + 'px');
  b.style.setProperty('--sy',sy + 'px');
  b.style.setProperty('--dx',dx + 'px');
  b.style.setProperty('--dy',dy + 'px');
  b.style.setProperty('--dx2',dx2 + 'px');
  b.style.setProperty('--dy2',dy2 + 'px');
  b.style.setProperty('--dur',(5.5 + Math.random() * 2.4) + 's');

  let collectedThis = false;
  const collect = e => {
    if(e){
      e.preventDefault();
      e.stopPropagation();
    }
    if(collectedThis || !gameRunning) return;
    collectedThis = true;
    const r = b.getBoundingClientRect();
    b.remove();
    collected++;
    updateScore();
    collectSound();
    sparkBurst(r.left + r.width/2, r.top + r.height/2, 14);
    if(collected >= TARGET_BUTTERFLIES) finishGame();
  };

  b.addEventListener('pointerdown', collect, {once:true});
  b.addEventListener('animationend', () => b.remove());
  gameLayer.appendChild(b);
}

function startGame(){
  initAudio();
  collected = 0;
  gameRunning = true;
  gameLayer.innerHTML = '';
  updateScore();
  show('game');
  clearInterval(spawnTimer);
  for(let i=0;i<8;i++) spawnButterfly(true);
  spawnTimer = setInterval(() => spawnButterfly(false), 680);
}

function finishGame(){
  gameRunning = false;
  clearInterval(spawnTimer);
  document.querySelectorAll('.butterfly').forEach(b => b.remove());
  sparkBurst(app.clientWidth/2, app.clientHeight*.45, 45);
  setTimeout(() => {
    moonGate.classList.remove('open');
    show('gift');
  }, 680);
}

function openWish(){
  initAudio();
  gateSound();
  moonGate.classList.add('open');
  flashOpen();
  setTimeout(() => {
    show('wish');
    setTimeout(() => screens.wish.classList.add('ready'), 2300);
  }, 800);
}

function loadOnePhoto(){
  return new Promise(resolve => {
    let index = 0;

    function tryNext(){
      if(index >= PHOTO_SOURCES.length){
        resolve(null);
        return;
      }
      const img = new Image();
      const src = PHOTO_SOURCES[index] + '?v=' + Date.now();
      img.onload = () => resolve(src);
      img.onerror = () => {
        index++;
        tryNext();
      };
      img.src = src;
    }

    tryNext();
  });
}

async function openPhoto(){
  initAudio();
  photoSound();
  flashOpen();
  mainPhoto.removeAttribute('src');
  photoFrame.classList.remove('hasPhoto');
  show('photo');

  const src = await loadOnePhoto();
  if(src){
    mainPhoto.src = src;
    photoFrame.classList.add('hasPhoto');
  }

  setTimeout(() => sparkBurst(app.clientWidth/2, app.clientHeight*.46, 50), 650);
}

function openFinal(){
  finalSound();
  flashOpen();
  setTimeout(() => show('final'), 550);
}

function replay(){
  collected = 0;
  gameRunning = false;
  clearInterval(spawnTimer);
  gameLayer.innerHTML = '';
  screens.wish.classList.remove('ready');
  moonGate.classList.remove('open');
  mainPhoto.removeAttribute('src');
  photoFrame.classList.remove('hasPhoto');
  show('start');
}

function bindTap(el, handler){
  let lastTap = 0;
  const run = e => {
    if(e){
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if(now - lastTap < 350) return;
    lastTap = now;
    handler(e);
  };
  el.addEventListener('pointerup', run);
  el.addEventListener('click', run);
}

bindTap(playBtn, startGame);
bindTap(moonGate, openWish);
bindTap(openPhotoBtn, openPhoto);
bindTap(finalBtn, openFinal);
bindTap(replayBtn, replay);

function startCanvasMagic(){
  const particles = [];
  for(let i=0;i<95;i++){
    particles.push({
      x:Math.random()*app.clientWidth,
      y:Math.random()*app.clientHeight,
      r:Math.random()*2.2+0.6,
      vx:Math.random()*0.24-0.12,
      vy:Math.random()*0.34+0.08,
      tw:Math.random()*Math.PI*2
    });
  }

  function draw(){
    ctx.clearRect(0,0,app.clientWidth,app.clientHeight);
    const active = Object.values(screens).some(s => s.classList.contains('active'));
    if(!active) return;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.tw += .045;
      if(p.y > app.clientHeight + 12){
        p.y = -12;
        p.x = Math.random()*app.clientWidth;
      }
      if(p.x < -12) p.x = app.clientWidth + 12;
      if(p.x > app.clientWidth + 12) p.x = -12;

      const alpha = .28 + (Math.sin(p.tw)+1)*.22;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = Math.random() > .4 ? '#dffbff' : '#ffe08a';
      ctx.shadowColor = '#68e7ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
    requestAnimationFrame(draw);
  }

  if(!particleTimer){
    particleTimer = true;
    draw();
  }
}

startCanvasMagic();

window.addEventListener('pagehide', stopMusic);
window.addEventListener('beforeunload', stopMusic);
document.addEventListener('visibilitychange', () => {
  if(document.hidden) stopMusic();
});
