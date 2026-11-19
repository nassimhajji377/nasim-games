
(() => {
  "use strict";

  const SIZE = 4;
  const TOTAL = SIZE * SIZE;

  const board = document.getElementById("board");
  const tray = document.getElementById("tray");
  const timerEl = document.getElementById("timer");
  const statusEl = document.getElementById("status");

  let image = new Image();
  let pieces = [];
  let placed = 0;
  let seconds = 0;
  let clock = null;
  let drag = null;
  let started = false;

  // صورة البازل
  image.src = "assets/puzzle-perimeter.png";

  image.onload = () => startGame();

  image.onerror = () => {
    statusEl.textContent =
      "تعذّر تحميل صورة البازل. تأكد من وجودها داخل مجلد assets.";
  };

  // رسم قطعة من الصورة الأصلية
  function drawTile(index, canvas) {
    const ctx = canvas.getContext("2d");

    canvas.width = 441;
    canvas.height = 450;

    const col = index % SIZE;
    const row = Math.floor(index / SIZE);

    const sourceX = col * image.naturalWidth / SIZE;
    const sourceY = row * image.naturalHeight / SIZE;
    const sourceW = image.naturalWidth / SIZE;
    const sourceH = image.naturalHeight / SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.strokeStyle = "#477caa";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  }

  // إنشاء قطعة
  function makePiece(index) {
    const el = document.createElement("div");

    el.className = "piece";
    el.draggable = false;
    el.dataset.index = index;

    const canvas = document.createElement("canvas");
    drawTile(index, canvas);

    el.appendChild(canvas);

    el.setAttribute("aria-label", `قطعة رقم ${index + 1}`);

    el.addEventListener("pointerdown", beginDrag);

    return el;
  }

  // تشغيل المؤقت
  function startClock() {
    if (clock) clearInterval(clock);

    clock = setInterval(() => {
      seconds++;

      timerEl.textContent =
        `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    }, 1000);
  }

  // بدء اللعبة
  function startGame() {
    if (!image.complete || !image.naturalWidth) return;

    if (clock) clearInterval(clock);

    seconds = 0;
    placed = 0;
    started = false;

    timerEl.textContent = "00:00";

    board.innerHTML = "";
    tray.innerHTML = "";
    pieces = [];

    for (let i = 0; i < TOTAL; i++) {
      const slot = document.createElement("div");

      slot.className = "slot";
      slot.dataset.index = i;

      slot.addEventListener("click", () => placeSelected(i));

      board.appendChild(slot);

      pieces.push(makePiece(i));
    }

    shufflePieces();

    statusEl.textContent =
      "ابدأ بسحب القطع إلى أماكنها الصحيحة! 🌟";
  }

  // خلط القطع
  function shufflePieces() {
    const remaining = pieces.filter(
      p => !p.parentElement?.classList.contains("slot")
    );

    remaining.forEach(p => p.classList.remove("selected"));

    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [remaining[i], remaining[j]] =
        [remaining[j], remaining[i]];
    }

    tray.innerHTML = "";

    remaining.forEach(p => {
      p.style.cssText = "";
      tray.appendChild(p);
    });

    if (placed === 0) {
      statusEl.textContent =
        "تم بعثرة القطع! اسحب كل قطعة إلى مكانها الصحيح.";
    } else {
      statusEl.textContent =
        `بقيت ${TOTAL - placed} قطعة. واصل اللعب!`;
    }
  }

  // بدء السحب
  function beginDrag(e) {
    if (
      e.button !== 0 ||
      e.currentTarget.parentElement.classList.contains("slot")
    ) return;

    e.preventDefault();

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();

    drag = {
      el,
      index: Number(el.dataset.index),
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    };

    document.querySelectorAll(".piece.selected").forEach(p => {
      p.classList.remove("selected");
    });

    el.classList.add("dragging");

    el.style.width = rect.width + "px";
    el.style.height = rect.height + "px";

    moveDrag(e);

    document.addEventListener("pointermove", moveDrag);
    document.addEventListener("pointerup", endDrag, { once: true });
    document.addEventListener("pointercancel", cancelDrag, { once: true });

    if (!started) {
      started = true;
      startClock();
    }
  }

  // تحريك القطعة
  function moveDrag(e) {
    if (!drag) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (Math.hypot(dx, dy) > 7) {
      drag.moved = true;
    }

    if (drag.moved) {
      drag.el.style.left =
        (e.clientX - drag.offsetX) + "px";

      drag.el.style.top =
        (e.clientY - drag.offsetY) + "px";
    }
  }

  // إزالة أحداث السحب
  function clearDragListeners() {
    document.removeEventListener("pointermove", moveDrag);
    document.removeEventListener("pointercancel", cancelDrag);
  }

  // إلغاء السحب
  function cancelDrag() {
    if (!drag) return;

    clearDragListeners();

    drag.el.classList.remove("dragging");
    drag.el.style.cssText = "";

    drag = null;
  }

  // إنهاء السحب
  function endDrag(e) {
    clearDragListeners();

    if (!drag) return;

    const current = drag;

    const target = document.elementFromPoint(
      e.clientX,
      e.clientY
    );

    let slot = target?.closest?.(".slot");

    if (!slot) {
      const rect = board.getBoundingClientRect();

      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const col = Math.min(
          SIZE - 1,
          Math.max(0, Math.floor(
            (e.clientX - rect.left) / rect.width * SIZE
          ))
        );

        const row = Math.min(
          SIZE - 1,
          Math.max(0, Math.floor(
            (e.clientY - rect.top) / rect.height * SIZE
          ))
        );

        slot = board.children[row * SIZE + col];
      }
    }

    current.el.classList.remove("dragging");

    if (!current.moved) {
      current.el.style.cssText = "";
      current.el.classList.add("selected");

      statusEl.textContent =
        "تم اختيار القطعة. اضغط على المكان الذي تريد وضعها فيه، أو اسحبها إليه.";
    } else {
      current.el.style.cssText = "";

      if (slot) {
        placePiece(
          current.index,
          Number(slot.dataset.index),
          current.el
        );
      } else {
        tray.appendChild(current.el);

        statusEl.textContent =
          "أفلت القطعة داخل لوحة الأحجية.";
      }
    }

    drag = null;
  }

  // اختيار قطعة بالنقر
  function placeSelected(slotIndex) {
    const selected = document.querySelector(".piece.selected");

    if (!selected) return;

    const index = Number(selected.dataset.index);

    selected.classList.remove("selected");

    placePiece(index, slotIndex, selected);
  }

  // وضع القطعة في مكانها
  function placePiece(pieceIndex, slotIndex, item) {
    const slot = board.children[slotIndex];

    if (
      pieceIndex === slotIndex &&
      !slot.classList.contains("done")
    ) {
      slot.classList.add("done");

      slot.appendChild(item);

      item.classList.remove("selected", "dragging");
      item.style.cssText = "";

      placed++;

      statusEl.textContent =
        `أحسنت! ${placed} من ${TOTAL} قطعة صحيحة ⭐`;

      if (placed === TOTAL) {
        win();
      }
    } else {
      item.classList.remove("selected", "dragging");
      item.style.cssText = "";

      tray.appendChild(item);

      statusEl.textContent =
        "هذه ليست القطعة المناسبة لهذا المكان. جرّب مرة أخرى 😊";
    }
  }

  // ==================================
  // ==================================
  // نظام الشيك المطابق للعبة الأولى
  // ==================================

  const cheque = document.getElementById("cheque");
  const tpl = new Image();
  let chequeReady = false;

  const CHEQUE_REASON = "قواعد الرياضيات 1";

  function today() {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  function fitText(g, text, maxW, size, weight, family) {
    let s = size;
    g.font = `${weight} ${s}px ${family}`;

    while (g.measureText(text).width > maxW && s > 18) {
      s -= 2;
      g.font = `${weight} ${s}px ${family}`;
    }
  }

  function drawCheque() {
    if (!chequeReady) return;

    const c = cheque;
    const g = c.getContext("2d");

    const first = document.getElementById("firstName").value.trim();
    const last = document.getElementById("lastName").value.trim();
    const name = `${first} ${last}`.trim();

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(tpl, 0, 0, c.width, c.height);

    g.direction = "rtl";
    g.textAlign = "center";
    g.textBaseline = "middle";

    const fam = "Tajawal, 'Segoe UI', Arial, sans-serif";

    // الاسم واللقب - نفس مكان اللعبة الأولى
    g.fillStyle = "#0b2a6b";
    fitText(g, name, 380, 52, 800, fam);
    g.fillText(name, 718, 270);

    // عبارة الإنجاز - نفس مكان اللعبة الأولى
    g.fillStyle = "#1a2a6c";
    fitText(g, CHEQUE_REASON, 290, 20, 700, fam);
    g.fillText(CHEQUE_REASON, 432, 341);

    // التاريخ - نفس مكان اللعبة الأولى
    g.fillStyle = "#1a2a6c";
    g.font = `800 32px ${fam}`;
    g.fillText(today(), 974, 416);
  }

  // تحميل قالب الشيك من cheque-data.js
  tpl.onload = () => {
    chequeReady = true;
    drawCheque();
  };

  tpl.onerror = () => {
    console.error("تعذّر تحميل قالب الشيك من cheque-data.js");
  };

  tpl.src = window.CHEQUE_TEMPLATE;

  // تحديث الشيك عند كتابة الاسم واللقب
  document.getElementById("firstName").addEventListener("input", drawCheque);
  document.getElementById("lastName").addEventListener("input", drawCheque);

  // تحويل الشيك إلى صورة PNG
  function chequeBlob() {
    return new Promise(resolve => {
      cheque.toBlob(resolve, "image/png");
    });
  }

  // اسم الملف مثل اللعبة الأولى
  function chequeFileName() {
    const name =
      document.getElementById("firstName").value.trim() || "champion";

    return `cheque-${name}.png`;
  }

  // تنزيل الشيك
  async function downloadCheque() {
    if (!chequeReady) {
      alert("انتظر قليلاً حتى يتم تحميل صورة الشيك.");
      return;
    }

    drawCheque();

    const blob = await chequeBlob();

    if (!blob) {
      alert("تعذّر إنشاء صورة الشيك.");
      return;
    }

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = chequeFileName();

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  document.getElementById("downloadCert").addEventListener(
    "click",
    downloadCheque
  );

  // مشاركة الشيك
  document.getElementById("shareCert").addEventListener(
    "click",
    async () => {
      if (!chequeReady) {
        alert("انتظر قليلاً حتى يتم تحميل صورة الشيك.");
        return;
      }

      drawCheque();

      const blob = await chequeBlob();

      if (!blob) {
        alert("تعذّر إنشاء صورة الشيك.");
        return;
      }

      const file = new File(
        [blob],
        chequeFileName(),
        { type: "image/png" }
      );

      if (
        navigator.canShare &&
        navigator.canShare({ files: [file] }) &&
        navigator.share
      ) {
        try {
          await navigator.share({
            files: [file],
            title: "Prima Puzzle"
          });
        } catch (e) {
          // المستخدم قد يغلق نافذة المشاركة
        }
      } else {
        await downloadCheque();
      }
    }
  );

  // تحميل خط Tajawal قبل الرسم
  if (document.fonts && document.fonts.load) {
    document.fonts.load("800 40px Tajawal").then(drawCheque).catch(() => {});
  }

  // ==================================
  // الفوز
  // ==================================

  function win() {
    if (clock) {
      clearInterval(clock);
      clock = null;
    }

    document.getElementById("winModal").classList.remove("hidden");

    drawCheque();

    statusEl.textContent =
      `🎉 مبروك! أكملت الأحجية في ${timerEl.textContent}`;

    document.getElementById("firstName").focus();
  }

  // ==================================
  // الأزرار الأصلية
  // ==================================

  document.getElementById("newGame").addEventListener(
    "click",
    startGame
  );

  document.getElementById("shuffle").addEventListener(
    "click",
    shufflePieces
  );

  document.getElementById("home").addEventListener("click", () => {
  window.location.href = "index.html";
});

  document.getElementById("sound").addEventListener("click", () => {
    const utterance = new SpeechSynthesisUtterance(
      "مرحبا! هيا نركب قطع الأحجية. بالتوفيق!"
    );

    utterance.lang = "ar";

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });

  // إغلاق النوافذ
  document.querySelectorAll("[data-close]").forEach(b => {
    b.addEventListener("click", () => {
      document.getElementById(b.dataset.close).classList.add("hidden");
    });
  });

  // اللعب مرة أخرى
  document.getElementById("playAgain").addEventListener(
    "click",
    () => {
      document.getElementById("winModal").classList.add("hidden");
      startGame();
    }
  );

})();

// موسيقى خلفية لعبة البازل
const music = new Audio("assets/math1-music.mp3");

music.loop = true;
music.volume = 0.15;

music.play().catch(() => {
  console.log("المتصفح منع التشغيل التلقائي للموسيقى");
});
