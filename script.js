const TARGET_BUTTERFLIES = 20;
const CACHE_VERSION = '303';

const app = document.getElementById('app');
const flash = document.getElementById('flash');
const sparkLayer = document.getElementById('sparkLayer');
const gameLayer = document.getElementById('gameLayer');
const progressBox = document.getElementById('progressBox');
const photoFrame = document.getElementById('photoFrame');
const mainPhoto = document.getElementById('mainPhoto');

const screens = {
  start: document.getElementById('startScreen'),
  game: document.getElementById('gameScreen'),
  bloom: document.getElementById('bloomScreen'),
  wish: document.getElementById('wishScreen'),
  photo: document.getElementById('photoScreen'),
  final: document.getElementById('finalScreen')
};

const startBtn = document.getElementById('startBtn');
const openBloomBtn = document.getElementById('openBloomBtn');
const photoBtn = document.getElementById('photoBtn');
const finalBtn = document.getElementById('finalBtn');
const replayBtn = document.getElementById('replayBtn');

let collected = 0;
let gameRunning = false;
let spawnTimer = null;
let audioCtx = null;
let musicTimer = null;
let musicStarted = false;
let activeNodes = [];
let tapLock = false;

const photoCandidates = [
  'photos/prathima.jpg',
  'photos/prathima.JPG',
  'photos/prathima.jpeg',
  'photos/prathima.JPEG',
  'photos/prathima.png',
  'photos/prathima.PNG',
  'photos/prathima.webp',
  'photos/Prathima.jpg',
  'photos/Prathima.png',
  'photos/main-photo.jpg',
  'photos/main-photo.JPG',
  'photos/main-photo.jpeg',
  'photos/main-photo.png',
  'photos/main-photo.PNG',
  'photos/main-photo.webp',
  'photos/photo.jpg',
  'photos/photo.JPG',
  'photos/photo.jpeg',
  'photos/photo.png',
  'photos/photo.webp',
  'photos/photo1.jpg',
  'photos/photo1.JPG',
  'photos/photo1.jpeg',
  'photos/photo1.png',
  'photos/fullphoto.jpg',
  'photos/fullphoto.JPG',
  'photos/fullphoto.jpeg',
  'photos/fullphoto.png',
  'assets/photo.jpg',
  'assets/main-photo.jpg'
];

function show(name){
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[name].classList.add('active');
}

function initAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  if(!musicStarted){
    musicStarted = true;
    playMusicLoop();
  }
}

function tone(freq, dur=.18, type='sine', vol=.055, delay=0){
  if(!audioCtx || !freq) return;
  const t = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  activeNodes.push({osc,gain});
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + .02);
  gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.onended = () => {
    activeNodes = activeNodes.filter(n => n.osc !== osc);
    try{ osc.disconnect(); gain.disconnect(); }catch(e){}
  };
  osc.start(t);
  osc.stop(t + dur + .05);
}

function sparkleSound(){
  tone(740,.08,'triangle',.06);
  tone(1180,.13,'sine',.045,.05);
}

function openSound(){
  tone(220,.18,'sine',.07);
  tone(440,.28,'triangle',.07,.08);
  tone(880,.36,'sine',.055,.20);
  tone(1320,.42,'triangle',.04,.34);
}

function photoSound(){
  tone(196,.32,'sine',.07);
  tone(392,.42,'triangle',.06,.12);
  tone(784,.56,'sine',.047,.28);
  tone(1174,.72,'triangle',.032,.48);
}

function playMusicLoop(){
  const melody = [392, 440, 523, 494, 392, 440, 587, 523, 392, 784, 659, 523, 494, 440, 698, 659, 523, 587, 523];
  let i = 0;
  function next(){
    if(!musicStarted || !audioCtx) return;
    const freq = melody[i % melody.length];
    tone(freq, .42, 'sine', .018);
    tone(freq * 2, .30, 'triangle', .006, .05);
    i++;
    musicTimer = setTimeout(next, 470);
  }
  next();
}

function stopAudio(){
  musicStarted = false;
  if(musicTimer){
    clearTimeout(musicTimer);
    musicTimer = null;
  }
  activeNodes.forEach(n => {
    try{ n.osc.stop(0); }catch(e){}
    try{ n.osc.disconnect(); n.gain.disconnect(); }catch(e){}
  });
  activeNodes = [];
  if(audioCtx){
    try{ audioCtx.close(); }catch(e){}
    audioCtx = null;
  }
}

function updateProgress(){
  progressBox.textContent = `Butterflies ${collected} / ${TARGET_BUTTERFLIES}`;
}

function sparkleBurst(x, y, count=18){
  for(let i=0;i<count;i++){
    const spark = document.createElement('div');
    spark.className = 'spark';
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    spark.style.setProperty('--x', (Math.random()*170 - 85) + 'px');
    spark.style.setProperty('--y', (Math.random()*170 - 85) + 'px');
    sparkLayer.appendChild(spark);
    setTimeout(() => spark.remove(), 900);
  }
}

function flashOpen(){
  flash.classList.remove('show');
  void flash.offsetWidth;
  flash.classList.add('show');
}

function spawnButterfly(initial=false){
  if(!gameRunning) return;
  const butterfly = document.createElement('button');
  butterfly.className = 'butterfly';
  butterfly.type = 'button';
  butterfly.textContent = '🦋';

  const w = app.clientWidth;
  const h = app.clientHeight;
  const sx = initial ? Math.random() * (w - 70) : -80;
  const sy = initial ? 80 + Math.random() * (h - 220) : 80 + Math.random() * (h - 180);
  const ex = w + 100;
  const ey = 80 + Math.random() * (h - 180);
  const dur = 6.5 + Math.random() * 2.4;

  butterfly.style.setProperty('--sx', sx + 'px');
  butterfly.style.setProperty('--sy', sy + 'px');
  butterfly.style.setProperty('--ex', ex + 'px');
  butterfly.style.setProperty('--ey', ey + 'px');
  butterfly.style.animationDuration = `${dur}s, .7s`;

  butterfly.addEventListener('pointerdown', e => {
    e.preventDefault();
    if(!gameRunning) return;
    const rect = butterfly.getBoundingClientRect();
    butterfly.remove();
    collected++;
    updateProgress();
    sparkleSound();
    sparkleBurst(rect.left + rect.width/2, rect.top + rect.height/2, 18);
    if(collected >= TARGET_BUTTERFLIES) finishGame();
  }, {once:true});

  butterfly.addEventListener('animationend', () => butterfly.remove());
  gameLayer.appendChild(butterfly);
}

function startGame(){
  initAudio();
  show('game');
  gameLayer.innerHTML = '';
  collected = 0;
  updateProgress();
  gameRunning = true;
  clearInterval(spawnTimer);
  for(let i=0;i<6;i++) spawnButterfly(true);
  spawnTimer = setInterval(() => spawnButterfly(false), 850);
}

function finishGame(){
  gameRunning = false;
  clearInterval(spawnTimer);
  document.querySelectorAll('.butterfly').forEach(b => b.remove());
  sparkleBurst(app.clientWidth/2, app.clientHeight/2, 50);
  setTimeout(() => show('bloom'), 620);
}

function openBloom(){
  initAudio();
  openSound();
  openBloomBtn.classList.add('open');
  flashOpen();
  sparkleBurst(app.clientWidth/2, app.clientHeight/2, 60);
  setTimeout(() => {
    openBloomBtn.classList.remove('open');
    show('wish');
  }, 780);
}

function tryLoadPhoto(src){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(null);
    img.src = `${src}?v=${CACHE_VERSION}`;
  });
}

async function loadMainPhoto(){
  photoFrame.classList.remove('photoLoaded');
  mainPhoto.removeAttribute('src');

  for(const src of photoCandidates){
    const ok = await tryLoadPhoto(src);
    if(ok){
      mainPhoto.src = `${ok}?v=${CACHE_VERSION}`;
      photoFrame.classList.add('photoLoaded');
      return true;
    }
  }
  console.warn('Birthday photo not found. Rename your image to photos/prathima.jpg or photos/main-photo.jpg');
  return false;
}

async function openPhoto(){
  initAudio();
  openSound();
  flashOpen();
  show('photo');
  await loadMainPhoto();
  setTimeout(() => {
    photoSound();
    sparkleBurst(app.clientWidth/2, app.clientHeight/2, 55);
  }, 350);
}

function finalWish(){
  initAudio();
  openSound();
  flashOpen();
  sparkleBurst(app.clientWidth/2, app.clientHeight/2, 70);
  setTimeout(() => show('final'), 500);
}

function replay(){
  clearInterval(spawnTimer);
  gameRunning = false;
  gameLayer.innerHTML = '';
  photoFrame.classList.remove('photoLoaded');
  mainPhoto.removeAttribute('src');
  show('start');
}

function safeTap(handler){
  return e => {
    if(e){
      e.preventDefault();
      e.stopPropagation();
    }
    if(tapLock) return;
    tapLock = true;
    setTimeout(() => tapLock = false, 360);
    handler(e);
  };
}

startBtn.addEventListener('pointerup', safeTap(startGame));
startBtn.addEventListener('click', safeTap(startGame));
openBloomBtn.addEventListener('pointerup', safeTap(openBloom));
openBloomBtn.addEventListener('click', safeTap(openBloom));
photoBtn.addEventListener('pointerup', safeTap(openPhoto));
photoBtn.addEventListener('click', safeTap(openPhoto));
finalBtn.addEventListener('pointerup', safeTap(finalWish));
finalBtn.addEventListener('click', safeTap(finalWish));
replayBtn.addEventListener('pointerup', safeTap(replay));
replayBtn.addEventListener('click', safeTap(replay));

window.addEventListener('pagehide', stopAudio);
window.addEventListener('beforeunload', stopAudio);
document.addEventListener('visibilitychange', () => {
  if(document.hidden) stopAudio();
});
