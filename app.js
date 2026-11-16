console.log('multiplication-game v4');
/* ===== إعدادات اللعبة — عدّل هنا بحرية ===== */
const CONFIG = {
  title: 'أنقذوا بريمو بجدول الضرب',
  credit: '',                    // مثال: 'فكرة وإنجاز: اسمك'
  heroName: 'بريمو',
  heroImage: 'assets/hero.png',  // استبدل الصورة بصورتك (نفس المسار أو غيّره هنا)
  logoImage: 'assets/logo.png',
  chequeTitle: 'شيك الإنجاز',
  chequeImage: 'assets/cheque-template.jpg', // قالب الشيك
  chequeReason: 'أنقذوا بريمو من الغرق بجدول الضرب',
  questionsToWin: 10,            // عدد الإجابات الصحيحة للفوز
  secondsPerQuestion: 4,         // الوقت لكل سؤال
  maxWater: 1000,                // مستوى الغرق (ml)
  waterPerMistake: 200,          // الماء المضاف لكل خطأ (ml)
  maxFactor: 10                  // جدول الضرب من 0 إلى هذا الرقم
};

(() => {
  const $ = id => document.getElementById(id);
  const el = {
    title: $('title'), credit: $('credit'), logo: $('logo'), hero: $('hero'),
    tank: $('tank'), water: $('water'), ticks: $('ticks'), bubbles: $('bubbles'), caption: $('tankCaption'),
    time: $('time'), correct: $('correct'), attempts: $('attempts'), waterLevel: $('waterLevel'),
    answer: $('answer'), n1: $('n1'), n2: $('n2'), hint: $('hint'), status: $('status'),
    keypad: $('keypad'), startBtn: $('startBtn'), homeBtn: $('homeBtn'), backBtn: $('backBtn'),
    win: $('winOverlay'), lose: $('loseOverlay'),
    first: $('firstName'), last: $('lastName'), cheque: $('cheque'),
    shareBtn: $('shareBtn'), downloadBtn: $('downloadBtn'), again1: $('againBtn1'), again2: $('againBtn2')
  };

  const maxMistakes = Math.round(CONFIG.maxWater / CONFIG.waterPerMistake);
  const pad2 = n => String(n).padStart(2, '0');

  /* ----- الواجهة الأولية ----- */
  document.title = CONFIG.title;
  el.title.textContent = CONFIG.title;
  el.credit.textContent = CONFIG.credit;
  el.logo.src = CONFIG.logoImage;
  el.hero.src = CONFIG.heroImage;
  el.hero.alt = CONFIG.heroName;
  el.logo.onerror = () => { el.logo.style.display = 'none'; };

  for (let v = 0; v <= 1000; v += 100) {
    const t = document.createElement('div');
    t.className = 'tick';
    t.style.bottom = (v / 10) + '%';
    t.innerHTML = `<i></i>${v}`;
    el.ticks.appendChild(t);
  }
  for (let i = 0; i < 7; i++) {
    const b = document.createElement('b');
    b.style.left = (10 + Math.random() * 80) + '%';
    b.style.animationDelay = (Math.random() * 3) + 's';
    b.style.animationDuration = (2.5 + Math.random() * 2) + 's';
    el.bubbles.appendChild(b);
  }

  /* ----- أصوات بسيطة ----- */
  let ac = null;
  function beep(freq, dur = 0.12, type = 'sine', vol = 0.06, when = 0) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq;
      const t = ac.currentTime + when;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  const sOk = () => { beep(660, .1, 'triangle'); beep(880, .14, 'triangle', .06, .09); };
  const sBad = () => { beep(220, .25, 'sawtooth', .05); };
  const sWin = () => [523, 659, 784, 1047].forEach((f, i) => beep(f, .2, 'triangle', .07, i * .13));
  const sLose = () => [392, 311, 262, 196].forEach((f, i) => beep(f, .25, 'sawtooth', .05, i * .18));

  /* ----- حالة اللعبة ----- */
  let state = 'idle'; // idle | playing | done
  let a = 0, b = 0, input = '', correct = 0, attempts = 0, mistakes = 0;
  let deadline = 0, tick = null, locked = false, lastKey = '';

  function setWater() {
    const ml = Math.min(CONFIG.maxWater, mistakes * CONFIG.waterPerMistake);
    el.water.style.height = (ml / CONFIG.maxWater * 100) + '%';
    el.water.dataset.empty = ml === 0 ? '1' : '0';
    el.waterLevel.textContent = 'ml ' + ml;
    el.caption.textContent = `ml / ${CONFIG.maxWater} ml ${ml}`;
    el.tank.classList.toggle('drown', ml >= CONFIG.maxWater * 0.6);
  }
  function renderStats() {
    el.correct.textContent = `${correct}/${CONFIG.questionsToWin}`;
    el.attempts.textContent = attempts;
    setWater();
  }
  function showInput(cls) {
    el.answer.className = 'answer' + (cls ? ' ' + cls : '');
    el.answer.innerHTML = input ? input : '<span class="dash">—</span>';
  }
  function setLocked(v) {
    el.keypad.classList.toggle('locked', v);
    locked = v;
  }

  function nextQuestion() {
    let key;
    do {
      a = Math.floor(Math.random() * (CONFIG.maxFactor + 1));
      b = Math.floor(Math.random() * (CONFIG.maxFactor + 1));
      key = a + 'x' + b;
    } while (key === lastKey);
    lastKey = key;
    input = '';
    showInput();
    el.n1.textContent = a;
    el.n2.textContent = b;
    el.hint.textContent = 'اكتب حاصل الضرب قبل انتهاء الوقت';
    setLocked(false);
    deadline = performance.now() + CONFIG.secondsPerQuestion * 1000;
    clearInterval(tick);
    tick = setInterval(onTick, 100);
    onTick();
  }

  function onTick() {
    const left = Math.max(0, deadline - performance.now());
    const sec = Math.ceil(left / 1000);
    el.time.textContent = pad2(sec);
    el.time.parentElement.classList.toggle('low', sec <= 1);
    if (left <= 0 && state === 'playing' && !locked) resolve(false, true);
  }

  function resolve(ok, timeout = false) {
    if (state !== 'playing' || locked) return;
    setLocked(true);
    clearInterval(tick);
    attempts++;
    if (ok) {
      correct++;
      sOk();
      showInput('ok');
      el.status.textContent = 'إجابة صحيحة! 👏';
    } else {
      mistakes++;
      sBad();
      if (timeout) { input = ''; showInput('bad'); el.answer.innerHTML = a * b; }
      else showInput('bad');
      const left = maxMistakes - mistakes;
      el.status.textContent = (timeout ? 'انتهى الوقت! ' : 'إجابة غير صحيحة! ') +
        `أضفنا ${CONFIG.waterPerMistake} ml من الماء` + (left > 0 ? `، بقيت لك ${left} محاولات.` : '.');
    }
    renderStats();

    if (correct >= CONFIG.questionsToWin) return setTimeout(win, 650);
    if (mistakes >= maxMistakes) return setTimeout(lose, 1100);
    setTimeout(() => { if (state === 'playing') nextQuestion(); }, ok ? 450 : 900);
  }

  function press(d) {
    if (state !== 'playing' || locked) return;
    const len = String(a * b).length;
    if (input.length >= len) return;
    input = input === '0' ? d : input + d;
    showInput();
    if (input.length >= len) resolve(Number(input) === a * b);
  }
  function back() {
    if (state !== 'playing' || locked) return;
    input = input.slice(0, -1);
    showInput();
  }

  function start() {
    if (state === 'playing') return;
    hideOverlays();
    state = 'playing';
    correct = 0; attempts = 0; mistakes = 0; lastKey = '';
    el.tank.classList.remove('saved', 'drown');
    el.startBtn.disabled = true;
    el.status.textContent = `لديك ${CONFIG.secondsPerQuestion} ثوانٍ لكل سؤال؛ عند انتهائها يُضاف ${CONFIG.waterPerMistake} ml.`;
    renderStats();
    nextQuestion();
  }

  function goHome() {
    clearInterval(tick);
    hideOverlays();
    state = 'idle';
    correct = attempts = mistakes = 0;
    input = '';
    showInput();
    el.n1.textContent = '0'; el.n2.textContent = '0';
    el.time.textContent = pad2(CONFIG.secondsPerQuestion);
    el.time.parentElement.classList.remove('low');
    el.startBtn.disabled = false;
    el.tank.classList.remove('saved', 'drown');
    el.hint.textContent = `أدخل حاصل الضرب خلال ${CONFIG.secondsPerQuestion} ثوانٍ — التحقق آلي.`;
    el.status.textContent = `لديك ${CONFIG.secondsPerQuestion} ثوانٍ لإدخال الإجابة.`;
    setLocked(true);
    renderStats();
  }

  function hideOverlays() { el.win.hidden = true; el.lose.hidden = true; }

  function win() {
    state = 'done';
    el.startBtn.disabled = false;
    el.tank.classList.remove('drown');
    el.tank.classList.add('saved');
    // الماء ينزل: البطل نجا
    el.water.style.height = '0%';
    el.waterLevel.textContent = 'ml 0';
    el.caption.textContent = `ml / ${CONFIG.maxWater} ml 0`;
    sWin();
    confetti();
    el.win.hidden = false;
    drawCheque();
  }
  function lose() {
    state = 'done';
    el.startBtn.disabled = false;
    sLose();
    el.lose.hidden = false;
  }

  function confetti() {
    const colors = ['#ffc83d', '#35e0ff', '#ff5d8a', '#2ee67a', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (2 + Math.random() * 2.5) + 's';
      c.style.animationDelay = Math.random() * .6 + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5500);
    }
  }

  /* ----- الشيك (Canvas) ----- */
  function today() {
    const d = new Date();
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  function drawChequeFallback() {
    const c = el.cheque, g = c.getContext('2d'), W = c.width, H = c.height;
    const name = `${el.first.value.trim()} ${el.last.value.trim()}`.trim();
    g.clearRect(0, 0, W, H);
    // خلفية
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#fff7d6'); bg.addColorStop(.55, '#fff2b8'); bg.addColorStop(1, '#ffe08a');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // دوائر زخرفية
    g.globalAlpha = .18;
    [['#35b6e8', 1300, 120, 220], ['#ff5d8a', 1450, 560, 180], ['#2ee67a', 300, 600, 200]].forEach(([col, x, y, r]) => {
      g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    });
    g.globalAlpha = 1;
    // شريط جانبي
    const side = g.createLinearGradient(0, 0, 0, H);
    side.addColorStop(0, '#ff5d8a'); side.addColorStop(1, '#ff9a5d');
    g.fillStyle = side; g.fillRect(0, 0, 170, H);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.direction = 'rtl';
    g.font = '800 44px Tajawal, Arial'; g.fillText('تحدّي', 85, 250); g.fillText('الضرب', 85, 310);
    g.font = '800 120px Tajawal, Arial'; g.fillText('×', 85, 450);
    // إطار
    g.strokeStyle = '#0f6ea8'; g.lineWidth = 8; g.strokeRect(190, 24, W - 214, H - 48);
    g.strokeStyle = '#35b6e8'; g.lineWidth = 3; g.strokeRect(204, 38, W - 242, H - 76);
    // عنوان
    g.fillStyle = '#0f6ea8'; g.textAlign = 'center';
    g.font = '800 78px Tajawal, Arial';
    g.fillText(CONFIG.chequeTitle, 870, 140);
    g.font = '700 34px Tajawal, Arial'; g.fillStyle = '#c0392b';
    g.fillText('صك عدد 01', 1330, 80);
    // السطر الرئيسي
    g.textAlign = 'right'; g.fillStyle = '#16324f';
    g.font = '700 46px Tajawal, Arial';
    g.fillText('يُسند للتلميذ(ة):', 1440, 270);
    g.font = '800 64px Tajawal, Arial'; g.fillStyle = '#0b3f6b';
    g.fillText(name || '................................', 1090, 270);
    g.strokeStyle = '#0f6ea8'; g.lineWidth = 2; g.setLineDash([8, 8]);
    g.beginPath(); g.moveTo(240, 292); g.lineTo(1440, 292); g.stroke(); g.setLineDash([]);
    g.font = '700 40px Tajawal, Arial'; g.fillStyle = '#16324f';
    g.fillText(`لإنقاذه ${CONFIG.heroName} بإتقان جدول الضرب ✔`, 1440, 380);
    g.fillText('إجابات صحيحة: ' + CONFIG.questionsToWin + ' / ' + CONFIG.questionsToWin, 1440, 450);
    g.fillText('بتاريخ: ' + today(), 1440, 520);
    // باركود زخرفي
    g.fillStyle = '#16324f';
    let x = 260; const seed = (name.length + 7) * 13;
    for (let i = 0; i < 46; i++) {
      const w = 3 + ((i * seed) % 7);
      g.fillRect(x, 560, w, 60); x += w + 5; if (x > 760) break;
    }
    // توقيع
    g.strokeStyle = '#1a237e'; g.lineWidth = 4; g.beginPath();
    g.moveTo(900, 590); g.bezierCurveTo(950, 520, 1000, 640, 1050, 560); g.bezierCurveTo(1090, 510, 1120, 620, 1180, 570); g.stroke();
    g.font = '700 26px Tajawal, Arial'; g.fillStyle = '#6b7d8f'; g.textAlign = 'center';
    g.fillText('الإمضاء', 1040, 630);
    // نجمة
    g.fillStyle = '#ffc83d'; g.strokeStyle = '#c98a00'; g.lineWidth = 3;
    star(g, 1380, 600, 44, 20, 5);
  }
  /* الشيك على قالبك الخاص: نكتب الاسم والتاريخ والعبارة فوق الصورة */
  const tpl = new Image();
  let tplReady = false;
  tpl.onload = () => { tplReady = true; drawCheque(); };
  tpl.onerror = () => console.error('cheque template failed to load');
  tpl.src = window.CHEQUE_TEMPLATE || CONFIG.chequeImage;
  function fitText(g, text, maxW, size, weight, family) {
    let s = size;
    g.font = `${weight} ${s}px ${family}`;
    while (g.measureText(text).width > maxW && s > 18) { s -= 2; g.font = `${weight} ${s}px ${family}`; }
  }
  function drawCheque() {
    if (!tplReady) return drawChequeFallback();
    const c = el.cheque, g = c.getContext('2d');
    const name = `${el.first.value.trim()} ${el.last.value.trim()}`.trim();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(tpl, 0, 0, c.width, c.height);
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const fam = "Tajawal, 'Segoe UI', Arial, sans-serif";
    // الاسم واللقب
    g.fillStyle = '#0b2a6b';
    fitText(g, name, 380, 52, 800, fam);
    g.fillText(name, 718, 270);
    // العبارة
    g.fillStyle = '#1a2a6c';
    fitText(g, CONFIG.chequeReason, 290, 20, 700, fam);
    g.fillText(CONFIG.chequeReason, 432, 341);
    // التاريخ
    g.fillStyle = '#1a2a6c';
    g.font = `800 32px ${fam}`;
    g.fillText(today(), 974, 416);
  }
  function star(g, cx, cy, R, r, n) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 ? r : R, ang = Math.PI / n * i - Math.PI / 2;
      g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
    }
    g.closePath(); g.fill(); g.stroke();
  }
  const fileName = () => 'cheque-' + (el.first.value.trim() || 'champion') + '.png';
  function chequeBlob() { return new Promise(r => el.cheque.toBlob(r, 'image/png')); }
  async function download() {
    drawCheque();
    const blob = await chequeBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  async function share() {
    drawCheque();
    const blob = await chequeBlob();
    const file = new File([blob], fileName(), { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: CONFIG.title }); } catch (e) {}
    } else {
      download();
    }
  }

  /* ----- ربط الأحداث ----- */
  el.keypad.addEventListener('click', e => {
    const k = e.target.closest('button[data-k]');
    if (k) press(k.dataset.k);
  });
  el.backBtn.addEventListener('click', back);
  el.homeBtn.addEventListener('click', () => { location.href = 'index.html'; });
  el.startBtn.addEventListener('click', start);
  el.again1.addEventListener('click', start);
  el.again2.addEventListener('click', start);
  el.first.addEventListener('input', drawCheque);
  el.last.addEventListener('input', drawCheque);
  el.downloadBtn.addEventListener('click', download);
  el.shareBtn.addEventListener('click', share);
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') back();
    else if (e.key === 'Enter' && state !== 'playing') start();
  });
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 40px Tajawal').then(drawCheque).catch(() => {});
  }

  goHome();
})();
