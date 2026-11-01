(() => {
  const quote = document.querySelector(".quote");
  if (!quote) return;

  const trigger = quote.querySelector(".quote-text");
  const inner = quote.querySelector(".quote-inner");
  if (!trigger || !inner) return;

  const DENSITY = 1 / 6;
  const MAX_SPECKS = 2400;
  const DRIFT = 7;
  const WAVE_MS = 520;
  const FADE_MS = 360;
  const THROW = 70;

  const hint = quote.querySelector(".quote-hint");
  if (hint && window.matchMedia("(hover: none)").matches) hint.textContent = "Toque para revelar";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const easeOut = (t) => 1 - (1 - t) ** 3;

  const canvas = document.createElement("canvas");
  canvas.className = "spoiler-canvas";
  canvas.setAttribute("aria-hidden", "true");
  trigger.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  let boxes = [];
  let specks = [];
  let width = 0;
  let height = 0;
  let color = "#f4f4f4";
  let raf = 0;
  let last = 0;
  let visible = true;
  let wave = null;
  let revealed = false;

  const lineRects = () => {
    const range = document.createRange();
    range.selectNodeContents(inner);
    return [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
  };

  const layout = () => {
    const lines = lineRects();
    if (!lines.length) return false;

    const host = trigger.getBoundingClientRect();
    const left = Math.min(...lines.map((r) => r.left));
    const top = Math.min(...lines.map((r) => r.top));
    const right = Math.max(...lines.map((r) => r.right));
    const bottom = Math.max(...lines.map((r) => r.bottom));

    width = right - left;
    height = bottom - top;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.left = `${left - host.left}px`;
    canvas.style.top = `${top - host.top}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    boxes = lines.map((r) => ({
      left: r.left - left,
      top: r.top - top,
      right: r.right - left,
      bottom: r.bottom - top,
    }));

    specks = makeSpecks();
    color = getComputedStyle(trigger).color;
    return true;
  };

  const makeSpecks = () => {
    const out = [];
    const area = boxes.reduce((sum, b) => sum + (b.right - b.left) * (b.bottom - b.top), 0);
    const scale = Math.min(1, MAX_SPECKS / Math.max(1, area * DENSITY));
    boxes.forEach((box, index) => {
      const w = box.right - box.left;
      const h = box.bottom - box.top;
      const count = Math.round(w * h * DENSITY * scale);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = DRIFT * (0.3 + Math.random() * 0.7);
        out.push({
          x: box.left + Math.random() * w,
          y: box.top + Math.random() * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          phase: Math.random(),
          rate: 0.35 + Math.random() * 0.9,
          size: Math.random() < 0.18 ? 1.5 : 1,
          box: index,
          hit: 0,
        });
      }
    });
    return out;
  };

  const farthestCorner = (at) =>
    Math.max(
      Math.hypot(at.x, at.y),
      Math.hypot(width - at.x, at.y),
      Math.hypot(at.x, height - at.y),
      Math.hypot(width - at.x, height - at.y)
    );

  const step = (s, now, dt, radius) => {
    if (wave && !s.hit && Math.hypot(s.x - wave.x, s.y - wave.y) <= radius) {
      s.hit = now;
      const dx = s.x - wave.x;
      const dy = s.y - wave.y;
      const len = Math.hypot(dx, dy) || 1;
      const push = THROW * (0.5 + Math.random());
      s.vx += (dx / len) * push;
      s.vy += (dy / len) * push;
    }
    const fade = s.hit ? 1 - (now - s.hit) / FADE_MS : 1;
    if (fade <= 0) return 0;

    if (!reduced || s.hit) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.phase = (s.phase + s.rate * dt) % 1;
    }

    const box = s.hit ? null : boxes[s.box];
    if (box) {
      if (s.x < box.left || s.x > box.right) {
        s.vx = -s.vx;
        s.x = Math.min(box.right, Math.max(box.left, s.x));
      }
      if (s.y < box.top || s.y > box.bottom) {
        s.vy = -s.vy;
        s.y = Math.min(box.bottom, Math.max(box.top, s.y));
      }
    }

    const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(s.phase * Math.PI));
    return twinkle * fade * 0.9;
  };

  const draw = (now) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;

    const radius = wave
      ? farthestCorner(wave) * easeOut(Math.min(1, (now - wave.start) / WAVE_MS))
      : -1;

    let alive = 0;
    for (const s of specks) {
      const alpha = step(s, now, dt, radius);
      if (alpha > 0) {
        alive++;
        ctx.globalAlpha = alpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    }
    ctx.globalAlpha = 1;

    if (wave && alive === 0) {
      teardown();
      return;
    }
    if ((!reduced || wave) && visible) raf = requestAnimationFrame(draw);
  };

  const restart = () => {
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(draw);
  };

  let resizeObserver = null;
  let intersection = null;

  const teardown = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    wave = null;
    resizeObserver?.disconnect();
    intersection?.disconnect();
    canvas.remove();
  };

  const start = () => {
    if (!layout()) return;
    restart();

    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        if (wave) return;
        if (layout()) restart();
      });
      resizeObserver.observe(trigger);
    }

    if ("IntersectionObserver" in window) {
      intersection = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible) restart();
        else cancelAnimationFrame(raf);
      });
      intersection.observe(trigger);
    }
  };

  const revealQuote = (clientX, clientY) => {
    if (revealed) return;
    revealed = true;
    quote.classList.add("is-revealed");

    trigger.removeAttribute("role");
    trigger.removeAttribute("tabindex");
    trigger.removeAttribute("aria-expanded");
    trigger.removeAttribute("aria-label");

    if (!canvas.isConnected || !width) return;

    const rect = canvas.getBoundingClientRect();
    const first = lineRects()[0];
    const x = clientX ?? (first ? first.left + 4 : rect.left);
    const y = clientY ?? (first ? first.top + first.height / 2 : rect.top);
    wave = { x: x - rect.left, y: y - rect.top, start: performance.now() };
    visible = true;
    restart();
  };

  quote.addEventListener("click", (event) => {
    if (event.detail === 0) revealQuote();
    else revealQuote(event.clientX, event.clientY);
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      revealQuote();
    }
  });

  if (document.fonts?.ready) document.fonts.ready.then(start);
  else start();
})();