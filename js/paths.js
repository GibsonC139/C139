(() => {
    const MOBILE_QUERY = "(max-width: 640px)";

    const CONFIG = {
        count: 42,
        spread: 1,
        angle: -8,
        speed: 1,
        interactive: true
    };

    const SAMPLES = 64;
    const OVERSCAN = 0.06;
    const DRAW_MS = 1400;
    const DRAW_STAGGER_MS = 40;
    const PART_RADIUS = 150;
    const PART_PUSH = 56;

    const LAYERS = [
        { width: 1, opacity: 0.16, phase: 0.6, pace: 0.7, part: 0.45 },
        { width: 1.25, opacity: 0.26, phase: 0.3, pace: 0.85, part: 0.75 },
        { width: 1.5, opacity: 0.4, phase: 0, pace: 1, part: 1 },
    ];

    const EASE_OUT = (t) => 1 - (1 - t) ** 3;

    function lineY(s, u, layer, frame, shape, band) {
        const t = frame.time * layer.pace;
        const x = u * frame.width;
        const center =
            frame.height * 0.5 +
            shape.slope * (x - frame.width / 2) +
            band * 0.1 * Math.sin(Math.PI * 2 * (0.75 * u + 0.1) + layer.phase + t * 0.35);
        const turn = 0.22 + 0.09 * Math.sin(t * 0.21 + layer.phase);
        const breathe = 0.3 * Math.sin(t * 0.5 + s * 4 + layer.phase);
        const twist = Math.cos(Math.PI * (u - turn) + s * (0.6 + breathe) + layer.phase);
        return center + s * shape.spread * band * twist;
    }

    function part(x, y, frame, strength) {
        const { pointer } = frame;
        if (pointer.amount < 0.001) return y;
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const falloff = Math.exp(-(dx * dx + dy * dy) / (PART_RADIUS * PART_RADIUS));
        const side = dy / (Math.abs(dy) + 24);
        return y + side * falloff * PART_PUSH * strength * pointer.amount;
    }

    function drawLines(ctx, frame, shape, color) {
        const { width, height } = frame;
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const band = Math.min(height, width * 1.1);
        const perLayer = Math.max(1, Math.round(shape.count / LAYERS.length));
        const xs = new Float32Array(SAMPLES + 1);
        const ys = new Float32Array(SAMPLES + 1);

        LAYERS.forEach((layer, layerIndex) => {
            ctx.lineWidth = layer.width;
            for (let i = 0; i < perLayer; i++) {
                const drawn = frame.drawn[layerIndex * perLayer + i] ?? 1;
                if (drawn <= 0) continue;
                const s = perLayer === 1 ? 0 : i / (perLayer - 1) - 0.5;
                const last = Math.max(1, Math.ceil(SAMPLES * drawn));
                for (let k = 0; k <= last; k++) {
                    const u = -OVERSCAN + (k / SAMPLES) * (1 + OVERSCAN * 2);
                    const x = u * width;
                    const y = lineY(s, u, layer, frame, shape, band);
                    xs[k] = x;
                    ys[k] = shape.interactive ? part(x, y, frame, layer.part) : y;
                }
                ctx.globalAlpha = layer.opacity * (0.45 + 0.55 * (1 - Math.abs(s) * 2));
                ctx.beginPath();
                ctx.moveTo(xs[0], ys[0]);
                for (let k = 1; k < last; k++) {
                    const mx = (xs[k] + xs[k + 1]) / 2;
                    const my = (ys[k] + ys[k + 1]) / 2;
                    ctx.quadraticCurveTo(xs[k], ys[k], mx, my);
                }
                ctx.lineTo(xs[last], ys[last]);
                ctx.stroke();
            }
        });
        ctx.globalAlpha = 1;
    }

    function mount() {
        const hero = document.querySelector(".hero");
        if (!hero) return null;

        const root = document.createElement("div");
        root.className = "bg-paths";
        root.setAttribute("aria-hidden", "true");
        const canvas = document.createElement("canvas");
        root.appendChild(canvas);
        hero.prepend(root);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            root.remove();
            return null;
        }

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const shape = {
            count: CONFIG.count,
            spread: CONFIG.spread,
            slope: Math.tan((CONFIG.angle * Math.PI) / 180),
            interactive: CONFIG.interactive && !reduceMotion,
        };
        const perLayer = Math.max(1, Math.round(CONFIG.count / LAYERS.length));
        const frame = {
            width: 0,
            height: 0,
            time: 40,
            drawn: new Array(perLayer * LAYERS.length).fill(reduceMotion ? 1 : 0),
            pointer: { x: 0, y: 0, amount: 0, on: false },
        };

        const color = getComputedStyle(root).color;
        let start = 0;
        let last = 0;
        let raf = 0;
        let onScreen = true;
        let visible = !document.hidden;
        let alive = true;

        const paint = () => drawLines(ctx, frame, shape, color);

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            frame.width = rect.width;
            frame.height = rect.height;
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            paint();
        };

        const loop = (now) => {
            raf = 0;
            if (!alive) return;
            if (!start) {
                start = now;
                last = now;
            }
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            frame.time += dt * CONFIG.speed;

            const elapsed = now - start;
            for (let i = 0; i < frame.drawn.length; i++) {
                if (frame.drawn[i] < 1) {
                    const local = (elapsed - (i % perLayer) * DRAW_STAGGER_MS) / DRAW_MS;
                    frame.drawn[i] = EASE_OUT(Math.min(Math.max(local, 0), 1));
                }
            }

            const { pointer } = frame;
            pointer.amount += ((pointer.on ? 1 : 0) - pointer.amount) * 0.08;
            paint();

            const settling =
                frame.drawn.some((d) => d < 1) || (pointer.amount > 0.001 && !pointer.on) || pointer.on;
            if (visible && (CONFIG.speed > 0 || settling)) raf = requestAnimationFrame(loop);
        };

        const play = () => {
            if (!raf && visible && !reduceMotion) {
                last = performance.now();
                raf = requestAnimationFrame(loop);
            }
        };

        const updateVisible = () => {
            visible = onScreen && !document.hidden;
            if (visible) play();
            else {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        };

        const onMove = (event) => {
            if (event.pointerType !== "mouse") return;
            const rect = canvas.getBoundingClientRect();
            frame.pointer.x = event.clientX - rect.left;
            frame.pointer.y = event.clientY - rect.top;
            frame.pointer.on = true;
            play();
        };
        const onLeave = () => {
            frame.pointer.on = false;
            play();
        };

        resize();
        canvas.style.opacity = "1";

        let resizeObserver = null;
        if ("ResizeObserver" in window) {
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(canvas);
        } else window.addEventListener("resize", resize, { passive: true });

        let intersection = null;
        if ("IntersectionObserver" in window) {
            intersection = new IntersectionObserver(([entry]) => {
                onScreen = entry.isIntersecting;
                updateVisible();
            });
            intersection.observe(root);
        }

        document.addEventListener("visibilitychange", updateVisible);
        if (shape.interactive) {
            window.addEventListener("pointermove", onMove, { passive: true });
            document.documentElement.addEventListener("pointerleave", onLeave);
        }

        play();

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            resizeObserver?.disconnect();
            intersection?.disconnect();
            window.removeEventListener("resize", resize);
            document.removeEventListener("visibilitychange", updateVisible);
            window.removeEventListener("pointermove", onMove);
            document.documentElement.removeEventListener("pointerleave", onLeave);
            root.remove();
        };
    }

    const mq = window.matchMedia(MOBILE_QUERY);
    let destroy = null;
    const sync = () => {
        if (!mq.matches && !destroy) destroy = mount();
        else if (mq.matches && destroy) {
            destroy();
            destroy = null;
        }
    };
    mq.addEventListener("change", sync);
    sync();
})();