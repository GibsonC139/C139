(() => {
    const switcher = document.querySelector(".lang-switch");
    const views = document.querySelector(".code-views");
    if (!switcher || !views) return;

    const tabs = [...switcher.querySelectorAll('[role="tab"]')];
    const panels = new Map(tabs.map((tab) => [tab, document.getElementById(tab.getAttribute("aria-controls"))]));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Map();

    const resetRun = (panel) => {
        clearTimeout(timers.get(panel));
        const btn = panel.querySelector("[data-run]");
        const out = panel.querySelector(".code-out");
        btn.dataset.state = "";
        btn.removeAttribute("aria-busy");
        btn.querySelector(".run-label").textContent = "Executar";
        const idle = document.createElement("span");
        idle.className = "out-idle";
        idle.textContent = "saída do programa";
        out.replaceChildren(idle);
    };

    const runCode = (panel) => {
        const btn = panel.querySelector("[data-run]");
        const out = panel.querySelector(".code-out");
        if (btn.dataset.state === "running") return;

        const cmd = document.createElement("span");
        cmd.className = "out-cmd";
        cmd.textContent = `$ ${out.dataset.cmd}`;
        out.replaceChildren(cmd);

        btn.dataset.state = "running";
        btn.setAttribute("aria-busy", "true");
        btn.querySelector(".run-label").textContent = "Executando…";

        const lines = out.dataset.result.split("|");
        const instant = reduceMotion.matches;
        let i = 0;

        const printNext = () => {
            const res = document.createElement("span");
            res.className = "out-res";
            res.textContent = lines[i++];
            out.append(res);

            if (i < lines.length) {
                timers.set(panel, setTimeout(printNext, instant ? 0 : 280));
                return;
            }
            btn.dataset.state = "done";
            btn.removeAttribute("aria-busy");
            btn.querySelector(".run-label").textContent = "Executar";
        };

        timers.set(panel, setTimeout(printNext, instant ? 0 : 600));
    };

    panels.forEach((panel) => {
        panel.querySelector("[data-run]").addEventListener("click", () => runCode(panel));
    });

    const select = (tab, focus = false) => {
        if (tab.getAttribute("aria-selected") === "true") {
            if (focus) tab.focus();
            return;
        }

        tabs.forEach((t) => {
            const on = t === tab;
            const panel = panels.get(t);
            t.setAttribute("aria-selected", String(on));
            t.tabIndex = on ? 0 : -1;
            panel.classList.toggle("is-active", on);
            panel.inert = !on;
        });

        panels.forEach(resetRun);
        switcher.dataset.lang = tab.dataset.lang;
        views.classList.add("is-animated");
        if (focus) tab.focus();
    };

    tabs.forEach((t) => {
        panels.get(t).inert = t.getAttribute("aria-selected") !== "true";
    });

    tabs.forEach((tab) => tab.addEventListener("click", () => select(tab)));

    switcher.addEventListener("keydown", (event) => {
        const current = tabs.indexOf(document.activeElement);
        if (current === -1) return;

        let next = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % tabs.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;

        if (next === null) return;
        event.preventDefault();
        select(tabs[next], true);
    });
})();