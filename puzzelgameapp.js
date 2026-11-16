(() => {
  "use strict";
  const SIZE = 5, TOTAL = SIZE * SIZE;
  const board = document.getElementById("board");
  const tray = document.getElementById("tray");
  const timerEl = document.getElementById("timer");
  const statusEl = document.getElementById("status");
  let image = new Image(), pieces = [], placed = 0, seconds = 0, clock = null, drag = null, started = false;

  // رسم ملصق تعليمي أصلي قريب من روح اللعبة الظاهرة في الفيديو.
  const posterSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
    <defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#fff000"/><stop offset="1" stop-color="#fffbd1"/></linearGradient></defs>
    <rect width="900" height="900" fill="url(#bg)"/>
    <text x="450" y="105" text-anchor="middle" font-family="Arial" font-size="64" font-weight="bold" fill="#0875c8" stroke="#fff" stroke-width="3">Jeu Prima Puzzle</text>
    <text x="450" y="170" text-anchor="middle" font-family="Arial" font-size="48" font-weight="bold" fill="#0875c8">🧩 قواعد الرياضيات 1</text>
    <text x="450" y="218" text-anchor="middle" font-family="Arial" font-size="25" font-weight="bold" fill="#174b88">Prima Pôle — فكرة وإنجاز عمار دقاز</text>
    <g font-family="Arial" fill="#15539a" text-anchor="middle">
      <rect x="95" y="275" width="710" height="500" rx="24" fill="#fff" stroke="#087ac5" stroke-width="12"/>
      <text x="450" y="340" font-size="42" font-weight="bold">قواعد المحيط</text>
      <rect x="155" y="380" width="170" height="130" fill="#f9fcff" stroke="#3b70b2" stroke-width="9"/>
      <text x="240" y="465" font-size="70">🤖</text>
      <text x="560" y="420" font-size="38" font-weight="bold">محيط المربع</text>
      <text x="560" y="470" font-size="29">محيط المربع = 4 × طول الضلع</text>
      <rect x="140" y="545" width="205" height="90" fill="#f9fcff" stroke="#3b70b2" stroke-width="9"/>
      <text x="240" y="615" font-size="60">🤖</text>
      <text x="570" y="570" font-size="38" font-weight="bold">محيط المستطيل</text>
      <text x="570" y="620" font-size="27">2 × (الطول + العرض)</text>
      <path d="M240 680 L335 820 L145 820 Z" fill="#f9fcff" stroke="#3b70b2" stroke-width="9"/>
      <text x="240" y="790" font-size="50">🤖</text>
      <text x="590" y="710" font-size="38" font-weight="bold">محيط المثلث</text>
      <text x="590" y="760" font-size="27">مجموع أطوال أضلاعه</text>
    </g>
    <g fill="#087ac5"><circle cx="55" cy="55" r="22"/><circle cx="845" cy="55" r="22"/></g>
  </svg>`;
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(posterSvg);
  image.onload = () => startGame();

  function drawTile(index, canvas) {
    const ctx = canvas.getContext("2d");
    const w = 180, h = 180;
    canvas.width = w; canvas.height = h;
    const col = index % SIZE, row = Math.floor(index / SIZE);
    ctx.drawImage(image, col * image.width / SIZE, row * image.height / SIZE,
      image.width / SIZE, image.height / SIZE, 0, 0, w, h);
    ctx.strokeStyle = "#477caa"; ctx.lineWidth = 3; ctx.strokeRect(2,2,w-4,h-4);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2; ctx.strokeRect(5,5,w-10,h-10);
  }

  function makePiece(index) {
    const el = document.createElement("div");
    el.className = "piece"; el.draggable = false; el.dataset.index = index;
    const c = document.createElement("canvas"); drawTile(index,c); el.appendChild(c);
    el.setAttribute("aria-label", `قطعة رقم ${index+1}`);
    el.addEventListener("pointerdown", beginDrag);
    return el;
  }

  function startClock() {
    if (clock) clearInterval(clock);
    clock = setInterval(() => {
      seconds++;
      timerEl.textContent = `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
    },1000);
  }

  function startGame() {
    if (!image.complete || !image.naturalWidth) return;
    if (clock) clearInterval(clock);
    seconds=0; placed=0; started=false; timerEl.textContent="00:00";
    board.innerHTML=""; tray.innerHTML=""; pieces=[];
    for(let i=0;i<TOTAL;i++){
      const slot=document.createElement("div");
      slot.className="slot"; slot.dataset.index=i;
      slot.addEventListener("pointerup",()=>{ if(drag) dropOn(i); });
      board.appendChild(slot);
      pieces.push(makePiece(i));
    }
    shufflePieces();
    statusEl.textContent="ابدأ بسحب القطع إلى أماكنها الصحيحة! 🌟";
  }

  function shufflePieces() {
    const remaining = pieces.filter(p => !p.parentElement?.classList.contains("slot"));
    remaining.forEach(p=>{p.classList.remove("selected");});
    for(let i=remaining.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
    tray.innerHTML=""; remaining.forEach(p=>tray.appendChild(p));
    if(placed===0) statusEl.textContent="تم بعثرة القطع! اسحب كل قطعة إلى مكانها الصحيح.";
    else statusEl.textContent=`بقيت ${TOTAL-placed} قطعة. واصل اللعب!`;
  }

  function beginDrag(e) {
    if(e.button!==0 || e.currentTarget.parentElement.classList.contains("slot")) return;
    e.preventDefault();
    const el=e.currentTarget, rect=el.getBoundingClientRect();
    drag={el,index:Number(el.dataset.index),offsetX:e.clientX-rect.left,offsetY:e.clientY-rect.top};
    el.classList.add("dragging");
    el.style.width=rect.width+"px"; el.style.height=rect.height+"px";
    moveDrag(e);
    document.addEventListener("pointermove",moveDrag);
    document.addEventListener("pointerup",endDrag,{once:true});
    if(!started){started=true;startClock();}
  }
  function moveDrag(e){
    if(!drag)return;
    drag.el.style.left=(e.clientX-drag.offsetX)+"px";
    drag.el.style.top=(e.clientY-drag.offsetY)+"px";
  }
  function endDrag(e){
    document.removeEventListener("pointermove",moveDrag);
    if(!drag)return;
    const x=e.clientX,y=e.clientY;
    const target=document.elementFromPoint(x,y);
    const slot=target?.closest(".slot");
    if(slot) dropOn(Number(slot.dataset.index));
    else {
      drag.el.classList.remove("dragging");
      drag.el.style.cssText="";
    }
    drag=null;
  }
  function dropOn(slotIndex){
    if(!drag)return;
    const item=drag.el, index=drag.index;
    item.classList.remove("dragging"); item.style.cssText="";
    const slot=board.children[slotIndex];
    if(index===slotIndex && !slot.classList.contains("done")){
      slot.classList.add("done"); slot.appendChild(item);
      placed++;
      statusEl.textContent=`أحسنت! ${placed} من ${TOTAL} قطعة صحيحة ⭐`;
      if(placed===TOTAL) win();
    } else {
      statusEl.textContent="ليست هذه مكانها الصحيح، جرّب قطعة أخرى 😊";
      tray.appendChild(item);
    }
    drag=null;
  }
  function win(){
    if(clock)clearInterval(clock);
    const name=document.getElementById("firstName"), surname=document.getElementById("lastName");
    document.getElementById("certDate").textContent=new Date().toLocaleDateString("ar-TN");
    document.getElementById("winModal").classList.remove("hidden");
    statusEl.textContent=`🎉 مبروك! أكملت الأحجية في ${timerEl.textContent}`;
    name.focus();
  }

  document.getElementById("newGame").addEventListener("click",startGame);
  document.getElementById("shuffle").addEventListener("click",shufflePieces);
  document.getElementById("home").addEventListener("click",()=>document.getElementById("rulesModal").classList.remove("hidden"));
  document.getElementById("sound").addEventListener("click",()=>{
    const utterance=new SpeechSynthesisUtterance("مرحبا! هيا نركب قطع الأحجية. بالتوفيق!");
    utterance.lang="ar"; speechSynthesis.cancel(); speechSynthesis.speak(utterance);
  });
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close).classList.add("hidden")));
  document.getElementById("firstName").addEventListener("input",updateCert);
  document.getElementById("lastName").addEventListener("input",updateCert);
  function updateCert(){
    const a=document.getElementById("firstName").value.trim(),b=document.getElementById("lastName").value.trim();
    document.getElementById("certName").textContent=(a+" "+b).trim()||"اسمك هنا";
  }
  document.getElementById("downloadCert").addEventListener("click",()=>{
    updateCert();
    const cert=document.getElementById("certificate");
    const text=`شهادة تقدير\nPrima Pôle\nتُسند للتلميذ(ة): ${document.getElementById("certName").textContent}\nلإتمام لعبة قواعد الرياضيات بنجاح\nالوقت: ${timerEl.textContent}\n${document.getElementById("certDate").textContent}`;
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="prima-puzzle-certificate.txt";a.click();URL.revokeObjectURL(a.href);
  });
  document.getElementById("shareCert").addEventListener("click",async()=>{
    updateCert();
    const text=`أكملت لعبة Prima Puzzle بنجاح! ${document.getElementById("certName").textContent} — الوقت ${timerEl.textContent}`;
    if(navigator.share){try{await navigator.share({title:"شهادة Prima Puzzle",text});}catch(e){}}
    else if(navigator.clipboard){await navigator.clipboard.writeText(text);alert("تم نسخ نص الشهادة للمشاركة.");}
    else alert(text);
  });
  document.getElementById("playAgain").addEventListener("click",()=>{
    document.getElementById("winModal").classList.add("hidden");startGame();
  });
})();