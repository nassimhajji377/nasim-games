(() => {
  "use strict";
  const SIZE = 4, TOTAL = SIZE * SIZE;
  const board = document.getElementById("board");
  const tray = document.getElementById("tray");
  const timerEl = document.getElementById("timer");
  const statusEl = document.getElementById("status");
  let image = new Image(), pieces = [], placed = 0, seconds = 0, clock = null, drag = null, started = false;

  // صورة البازل الجديدة داخل مجلد assets.
  image.src = "assets/puzzle-perimeter.png";
  image.onload = () => startGame();
  image.onerror = () => {
    statusEl.textContent = "تعذّر تحميل صورة البازل. تأكد من وجود assets/puzzle-perimeter.png.";
  };


function drawTile(index, canvas) {
  const ctx = canvas.getContext("2d");

  // المحافظة على النسبة الأصلية للصورة
  const w = 441;
  const h = 450;

  canvas.width = w;
  canvas.height = h;

  const col = index % SIZE;
  const row = Math.floor(index / SIZE);

  ctx.drawImage(
    image,
    col * image.width / SIZE,
    row * image.height / SIZE,
    image.width / SIZE,
    image.height / SIZE,
    0, 0, w, h
  );

  ctx.strokeStyle = "#477caa";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.strokeStyle = "rgba(255,255,255,.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(5, 5, w - 10, h - 10);
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
      slot.addEventListener("click",()=>placeSelected(i));
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
    drag={
      el,
      index:Number(el.dataset.index),
      offsetX:e.clientX-rect.left,
      offsetY:e.clientY-rect.top,
      startX:e.clientX,
      startY:e.clientY,
      moved:false
    };
    document.querySelectorAll(".piece.selected").forEach(p=>p.classList.remove("selected"));
    el.classList.add("dragging");
    el.style.width=rect.width+"px";
    el.style.height=rect.height+"px";
    moveDrag(e);
    document.addEventListener("pointermove",moveDrag);
    document.addEventListener("pointerup",endDrag,{once:true});
    document.addEventListener("pointercancel",cancelDrag,{once:true});
    if(!started){started=true;startClock();}
  }

  function moveDrag(e){
    if(!drag)return;
    const dx=e.clientX-drag.startX, dy=e.clientY-drag.startY;
    if(Math.hypot(dx,dy)>7) drag.moved=true;
    if(drag.moved){
      drag.el.style.left=(e.clientX-drag.offsetX)+"px";
      drag.el.style.top=(e.clientY-drag.offsetY)+"px";
    }
  }

  function clearDragListeners(){
    document.removeEventListener("pointermove",moveDrag);
    document.removeEventListener("pointercancel",cancelDrag);
  }

  function cancelDrag(){
    if(!drag)return;
    clearDragListeners();
    drag.el.classList.remove("dragging");
    drag.el.style.cssText="";
    drag=null;
  }

  function endDrag(e){
    clearDragListeners();
    if(!drag)return;
    const current=drag;
    const target=document.elementFromPoint(e.clientX,e.clientY);
    let slot=target?.closest?.(".slot");
    // Fallback for touch browsers: resolve the cell from the pointer position
    // when the browser does not report the underlying slot reliably.
    if(!slot){
      const rect=board.getBoundingClientRect();
      if(e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom){
        const col=Math.min(SIZE-1,Math.max(0,Math.floor((e.clientX-rect.left)/rect.width*SIZE)));
        const row=Math.min(SIZE-1,Math.max(0,Math.floor((e.clientY-rect.top)/rect.height*SIZE)));
        slot=board.children[row*SIZE+col];
      }
    }
    current.el.classList.remove("dragging");

    if(!current.moved){
      current.el.style.cssText="";
      current.el.classList.add("selected");
      statusEl.textContent="تم اختيار القطعة. اضغط على المكان الذي تريد وضعها فيه، أو اسحبها إليه.";
    } else {
      current.el.style.cssText="";
      if(slot) placePiece(current.index,Number(slot.dataset.index),current.el);
      else {
        tray.appendChild(current.el);
        statusEl.textContent="أفلت القطعة داخل لوحة الأحجية.";
      }
    }
    drag=null;
  }

  function placeSelected(slotIndex){
    const selected=document.querySelector(".piece.selected");
    if(!selected)return;
    const index=Number(selected.dataset.index);
    selected.classList.remove("selected");
    placePiece(index,slotIndex,selected);
  }

  function placePiece(pieceIndex,slotIndex,item){
    const slot=board.children[slotIndex];
    if(pieceIndex===slotIndex && !slot.classList.contains("done")){
      slot.classList.add("done");
      slot.appendChild(item);
      item.classList.remove("selected","dragging");
      item.style.cssText="";
      placed++;
      statusEl.textContent=`أحسنت! ${placed} من ${TOTAL} قطعة صحيحة ⭐`;
      if(placed===TOTAL) win();
    } else {
      item.classList.remove("selected","dragging");
      item.style.cssText="";
      tray.appendChild(item);
      statusEl.textContent="هذه ليست القطعة المناسبة لهذا المكان. جرّب مرة أخرى 😊";
    }
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
