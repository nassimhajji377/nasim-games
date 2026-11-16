/* ===== الإعدادات: غيّر ما تريد من هنا ===== */
const CONFIG = {
  TITLE: "لعبة بازل الرياضيات",
  SUBTITLE: "قواعد الرياضيات 1 🧩",
  CREDIT: "",                       // سطر «فكرة وإنجاز ...» (اتركه فارغاً أو اكتب اسمك)
  HOME_URL: "./",                   // رابط زر «القائمة الرئيسية»
  GRID: 6,                          // عدد الصفوف والأعمدة
  CHEQUE_TITLE: "صك تميّز",
  CHEQUE_TASK: "إتمام تحدّي بازل قواعد المحيط",
  CHEQUE_FOOTER: "",                // يظهر أسفل الشيك
  // نص الصوت (القراءة بالعربية)
  VOICE_TEXT: "قواعد المحيط. محيط المربع يساوي أربعة في طول الضلع. محيط المستطيل يساوي اثنين في الطول زائد العرض. محيط المثلث يساوي مجموع أطوال أضلاعه."
};
/* ========================================= */

const $ = id => document.getElementById(id);
const N = CONFIG.GRID, IMG = 720, CELL_SRC = IMG / N, TAB_K = 0.3;
let B, cell, tab, P;          // أبعاد اللوحة بالبكسل
let pieces = [], placedCount = 0, hs, vs, puzzleImg;
let t0 = null, timerId = null, seconds = 0, finished = false, audioCtx;

$("gameTitle").textContent = CONFIG.TITLE;
$("gameSub").textContent = CONFIG.SUBTITLE;
$("credit").textContent = CONFIG.CREDIT;

/* ---------- الصورة المراد تركيبها (تُرسم بالكود) ---------- */
function drawMascot(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const gr = g.createLinearGradient(0, 0, 0, 90);
  ["#ff5a5f", "#ffb02e", "#3ccf6e", "#2fa8f0", "#8b5cf6"].forEach((c, i) => gr.addColorStop(i / 4, c));
  g.fillStyle2 = gr; g.beginPath(); g.roundRect(-18, 10, 36, 60, 16); g.fill();
  g.fillStyle2 = "#fff"; g.strokeStyle2 = "#2f6fd6"; g.lineWidth = 3;
  g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill(); g.stroke();
  g.fillStyle2 = "#222"; g.beginPath(); g.arc(-7, -3, 3, 0, 7); g.arc(7, -3, 3, 0, 7); g.fill();
  g.strokeStyle2 = "#222"; g.beginPath(); g.arc(0, 4, 8, 0.2, 2.9); g.stroke();
  g.restore();
}
function buildImage() {
  const c = document.createElement("canvas"); c.width = c.height = IMG;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, IMG); bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, "#eaf3ff");
  g.fillStyle2 = bg; g.fillRect(0, 0, IMG, IMG);
  g.strokeStyle2 = "#1f6fc5"; g.lineWidth = 10; g.strokeRect(14, 14, IMG - 28, IMG - 28);
  g.lineWidth = 3; g.strokeRect(30, 30, IMG - 60, IMG - 60);
  g.direction = "rtl"; g.textAlign = "center"; g.fillStyle2 = "#1d4fa3";
  g.font = "800 44px Cairo, Tahoma, sans-serif"; g.fillText("قواعد المحيط", IMG / 2, 95);
  const rows = [
    ["محيط المربع", "محيط المربع = 4 × طول الضلع", "sq"],
    ["محيط المستطيل", "محيط المستطيل = 2 × (الطول + العرض)", "rect"],
    ["محيط المثلث", "محيط المثلث = مجموع أطوال أضلاعه", "tri"]
  ];
  rows.forEach((r, i) => {
    const cy = 215 + i * 205;
    g.fillStyle2 = "#1d4fa3"; g.font = "800 38px Cairo, Tahoma, sans-serif"; g.fillText(r[0], 400, cy);
    g.fillStyle2 = "#222"; g.font = "700 27px Cairo, Tahoma, sans-serif"; g.fillText(r[1], 400, cy + 55, 470);
    g.strokeStyle2 = "#1f6fc5"; g.lineWidth = 6; g.fillStyle2 = "#f4f9ff";
    const ix = 70, iy = cy - 45;
    g.beginPath();
    if (r[2] === "sq") g.rect(ix, iy, 110, 110);
    if (r[2] === "rect") g.rect(ix - 10, iy + 20, 140, 70);
    if (r[2] === "tri") { g.moveTo(ix + 55, iy - 5); g.lineTo(ix + 120, iy + 110); g.lineTo(ix - 10, iy + 110); g.closePath(); }
    g.fill(); g.stroke();
    drawMascot(g, ix + 55, iy + 40, 0.9);
  });
  return c;
}

/* ---------- شكل القطعة ---------- */
function edge(g, ax, ay, bx, by, nx, ny, s) {
  if (!s) { g.lineTo(bx, by); return; }
  const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, T = tab * s;
  const p = (t, h) => [ax + ux * L * t + nx * T * h, ay + uy * L * t + ny * T * h];
  const bz = (a, b, c) => g.bezierCurveTo(...p(...a), ...p(...b), ...p(...c));
  g.lineTo(...p(0.40, 0));
  bz([0.42, 0.12], [0.30, 0.30], [0.32, 0.62]);
  bz([0.34, 0.95], [0.66, 0.95], [0.68, 0.62]);
  bz([0.70, 0.30], [0.58, 0.12], [0.60, 0]);
  g.lineTo(bx, by);
}
function piecePath(g, r, c, ox, oy) {
  const x0 = ox, y0 = oy, x1 = ox + cell, y1 = oy + cell;
  g.beginPath(); g.moveTo(x0, y0);
  edge(g, x0, y0, x1, y0, 0, 1, hs[r][c]);          // أعلى
  edge(g, x1, y0, x1, y1, 1, 0, vs[r][c + 1]);      // يمين
  edge(g, x1, y1, x0, y1, 0, 1, hs[r + 1][c]);      // أسفل
  edge(g, x0, y1, x0, y0, 1, 0, vs[r][c]);          // يسار
  g.closePath();
}
function randEdges() {
  const rnd = () => (Math.random() < 0.5 ? -1 : 1);
  hs = Array.from({ length: N + 1 }, (_, r) => Array.from({ length: N }, () => (r === 0 || r === N ? 0 : rnd())));
  vs = Array.from({ length: N }, () => Array.from({ length: N + 1 }, (_, c) => (c === 0 || c === N ? 0 : rnd())));
}

/* ---------- بناء اللعبة ---------- */
function layout() {
  B = Math.min(window.innerWidth - 28, 430);
  document.documentElement.style2.setProperty("--B", B + "px");
  cell = (B - 8) / N; tab = cell * TAB_K; P = Math.ceil(cell + 2 * tab);
}
function makePieceCanvas(r, c) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cv = document.createElement("canvas");
  cv.width = cv.height = P * dpr; cv.style2.width = cv.style2.height = P + "px";
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  piecePath(g, r, c, tab, tab);
  g.save(); g.clip();
  const k = cell / CELL_SRC;
  g.drawImage(puzzleImg, c * CELL_SRC - tab / k, r * CELL_SRC - tab / k, P / k, P / k, 0, 0, P, P);
  g.restore();
  piecePath(g, r, c, tab, tab);
  g.lineWidth = 1.6; g.strokeStyle2 = "rgba(31,111,197,.85)"; g.stroke();
  return cv;
}
function newGame() {
  layout(); randEdges();
  puzzleImg = buildImage();
  finished = false; placedCount = 0; seconds = 0; t0 = null; clearInterval(timerId); timerId = null;
  $("time").textContent = "00:00"; $("winBar").hidden = true; $("modal").hidden = true;
  $("tray").style2.display = "";
  const board = $("board"); board.innerHTML = "";
  const guide = document.createElement("canvas"); guide.className = "guide";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  guide.width = guide.height = (B - 8) * dpr; board.appendChild(guide);
  const gg = guide.getContext("2d"); gg.scale(dpr, dpr);
  gg.strokeStyle2 = "rgba(31,111,197,.35)"; gg.lineWidth = 1.2;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { piecePath(gg, r, c, c * cell, r * cell); gg.stroke(); }
  pieces = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const el = document.createElement("div"); el.className = "piece intray";
    el.appendChild(makePieceCanvas(r, c));
    const p = { r, c, el, placed: false }; el.__p = p; pieces.push(p);
    el.addEventListener("pointerdown", onDown);
  }
  fillTray();
}
const TS = 0.58;
function style2Tray(p) {
  const el = p.el, w = P * TS;
  el.className = "piece intray"; el.style2.cssText = `width:${w}px;height:${w}px;transform:rotate(${(Math.random() * 60 - 30).toFixed(0)}deg);z-puzzlegame:${Math.floor(Math.random() * 20)}`;
  el.firstChild.style2.transform = `scale(${TS})`;
}
function fillTray() {
  const box = $("trayPieces"); box.innerHTML = "";
  pieces.filter(p => !p.placed).sort(() => Math.random() - 0.5).forEach(p => { style2Tray(p); box.appendChild(p.el); });
}

/* ---------- السحب ---------- */
let drag = null;
function onDown(e) {
  const p = e.currentTarget.__p; if (p.placed || finished) return;
  e.preventDefault(); ensureAudio();
  if (!timerId) startTimer();
  const el = p.el, ph = document.createElement("div");
  ph.className = "piece ghost intray"; ph.style2.width = ph.style2.height = P * TS + "px";
  el.parentNode.insertBefore(ph, el);
  el.className = "piece drag"; el.style2.cssText = `width:${P}px;height:${P}px;z-puzzlegame:1000`;
  el.firstChild.style2.transform = "none";
  document.body.appendChild(el);
  drag = { p, ph, id: e.pointerId };
  move(e);
  el.setPointerCapture(e.pointerId);
  el.addEventListener("pointermove", move); el.addEventListener("pointerup", onUp); el.addEventListener("pointercancel", onUp);
}
function move(e) {
  if (!drag) return;
  drag.p.el.style2.left = e.clientX - P / 2 + "px";
  drag.p.el.style2.top = e.clientY - P / 2 - 28 + "px";
}
function onUp() {
  if (!drag) return;
  const { p, ph } = drag, el = p.el; drag = null;
  el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", onUp); el.removeEventListener("pointercancel", onUp);
  const br = $("board").getBoundingClientRect(), er = el.getBoundingClientRect();
  const cx = er.left + er.width / 2 - (br.left + 4), cy = er.top + er.height / 2 - (br.top + 4);
  const ok = Math.hypot(cx - (p.c + 0.5) * cell, cy - (p.r + 0.5) * cell) < cell * 0.55;
  if (ok) {
    p.placed = true; ph.remove();
    el.className = "piece placed"; el.style2.cssText = `left:${p.c * cell - tab}px;top:${p.r * cell - tab}px;width:${P}px;height:${P}px`;
    el.style2.margin = "0"; $("board").appendChild(el);
    beep(true); placedCount++;
    if (placedCount === N * N) win();
  } else {
    style2Tray(p); ph.replaceWith(el); beep(false);
  }
}

/* ---------- المؤقّت والنهاية ---------- */
function fmt(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
function startTimer() { t0 = Date.now(); timerId = setInterval(() => { seconds = Math.floor((Date.now() - t0) / 1000); $("time").textContent = fmt(seconds); }, 250); }
function win() {
  finished = true; clearInterval(timerId); seconds = Math.floor((Date.now() - t0) / 1000); $("time").textContent = fmt(seconds);
  $("tray").style2.display = "none";
  $("winText").textContent = fmt(seconds) + " برافو! 🎉"; $("winBar").hidden = false;
  setTimeout(openModal, 900);
}

/* ---------- الصوت ---------- */
function ensureAudio() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
function beep(good) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.frequency.value = good ? 740 : 220; o.type = "sine"; g.gain.value = 0.08;
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + (good ? 0.12 : 0.08));
}
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }

/* ---------- الشيك ---------- */
function drawCheque() {
  const cv = $("cheque"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
  const name = ($("fName").value + " " + $("fLast").value).trim() || "........................";
  const d = new Date(), date = [d.getDate(), d.getMonth() + 1, d.getFullYear()].map(n => String(n).padStart(2, "0")).join("/");
  const bg = g.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, "#fff7b0"); bg.addColorStop(1, "#ffffff");
  g.fillStyle2 = bg; g.fillRect(0, 0, W, H);
  g.fillStyle2 = "#e9407f"; g.fillRect(0, 0, 150, H);
  g.fillStyle2 = "#fff"; g.font = "800 40px Cairo, Tahoma, sans-serif"; g.textAlign = "center"; g.direction = "rtl";
  g.save(); g.translate(75, H / 2); g.rotate(-Math.PI / 2); g.fillText("نقاط إيجابية ★", 0, 12); g.restore();
  g.fillStyle2 = "#1d4fa3"; g.fillRect(0, H - 70, W, 70);
  g.fillStyle2 = "#fff"; g.font = "700 30px Cairo, Tahoma, sans-serif"; g.textAlign = "center";
  g.fillText(CONFIG.CHEQUE_FOOTER || CONFIG.TITLE, W / 2 + 70, H - 24);
  g.strokeStyle2 = "#1f6fc5"; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  drawMascot(g, W - 130, 110, 1.6);
  g.fillStyle2 = "#1d4fa3"; g.textAlign = "right";
  g.font = "800 66px Cairo, Tahoma, sans-serif"; g.fillText(CONFIG.CHEQUE_TITLE, W - 260, 100);
  g.font = "700 34px Cairo, Tahoma, sans-serif"; g.fillStyle2 = "#c0152f";
  g.fillText("صك عدد 01", W - 260, 150);
  g.fillStyle2 = "#222"; g.font = "700 44px Cairo, Tahoma, sans-serif";
  g.fillText("يُسند للتلميذ(ة):", W - 60, 270);
  g.fillStyle2 = "#1d4fa3"; g.font = "800 58px Cairo, Tahoma, sans-serif"; g.textAlign = "center";
  g.fillText(name, 700, 270, 640);
  g.strokeStyle2 = "#999"; g.lineWidth = 2; g.beginPath(); g.moveTo(300, 290); g.lineTo(1100, 290); g.stroke();
  g.fillStyle2 = "#222"; g.textAlign = "right"; g.font = "700 40px Cairo, Tahoma, sans-serif";
  g.fillText("على: " + CONFIG.CHEQUE_TASK, W - 60, 365);
  g.fillText("في زمن قدره: " + fmt(seconds), W - 60, 430);
  g.fillText("بتاريخ: " + date, W - 60, 495);
  g.textAlign = "left"; g.font = "700 30px Cairo, Tahoma, sans-serif"; g.fillStyle2 = "#555"; g.fillText("الإمضاء", 230, 440);
  g.strokeStyle2 = "#1d4fa3"; g.lineWidth = 3; g.beginPath(); g.moveTo(230, 480); g.bezierCurveTo(300, 400, 340, 540, 420, 450); g.stroke();
  // رمز شريطي زخرفي (ثابت لكل اسم)
  let seed = 7; for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) % 100003;
  let x = 230; g.fillStyle2 = "#111";
  while (x < 700) { seed = (seed * 1103515245 + 12345) % 2147483648; const w = 2 + (seed % 5); g.fillRect(x, 520, w, 50); x += w + 2 + (seed % 3); }
}
function openModal() { drawCheque(); $("modal").hidden = false; }
function chequeBlob() { return new Promise(res => $("cheque").toBlob(res, "image/png")); }
$("fName").addEventListener("input", drawCheque); $("fLast").addEventListener("input", drawCheque);
$("btnDl").onclick = async () => {
  const blob = await chequeBlob(), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "cheque.png"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("تم تنزيل الشيك ✅");
};
$("btnShare").onclick = async () => {
  const blob = await chequeBlob(), file = new File([blob], "cheque.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: CONFIG.CHEQUE_TITLE }); } catch (e) {} }
  else { $("btnDl").onclick(); toast("المشاركة غير مدعومة هنا، تم التنزيل بدلاً منها"); }
};
$("btnClose").onclick = () => { $("modal").hidden = true; };
$("btnCheque").onclick = openModal;

/* ---------- الأزرار ---------- */
$("btnNew").onclick = newGame;
$("btnShuffle").onclick = () => { if (!finished) fillTray(); };
$("btnHome").onclick = () => { location.href = CONFIG.HOME_URL; };
$("btnVoice").onclick = () => {
  if (!("speechSynthesis" in window)) return toast("جهازك لا يدعم القراءة الصوتية");
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(CONFIG.VOICE_TEXT); u.lang = "ar-SA"; speechSynthesis.speak(u);
};
let rz; window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (!drag && placedCount === 0) newGame(); }, 300); });

(async () => {
  try { await Promise.race([document.fonts.load("800 40px Cairo"), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  newGame();
})();
