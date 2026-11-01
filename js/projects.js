(() => {
  const root = document.getElementById("projects-list");
  if (!root) return;

  const DATA_URL = "data/projects.json";

  const LOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/>
  <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>
</svg>`;

  const buildLocked = (message, badge = "Lockdown ativo") => {
    const locked = document.createElement("div");
    locked.className = "projects-locked";
    locked.innerHTML = `
      <span class="lock-icon" aria-hidden="true">${LOCK_ICON}</span>
      <div class="lock-body">
        <h3>Em breve</h3>
        <p></p>
        <span class="lock-badge"></span>
      </div>`;
    locked.querySelector("p").textContent =
      message || "Estou construindo os primeiros projetos. Esta seção volta em breve.";
    locked.querySelector(".lock-badge").textContent = badge;
    return locked;
  };

  const buildProject = (project, index) => {
    const isLocked = project.locked === true;
    const name = project.name || "Sem nome";

    const item = document.createElement(isLocked ? "div" : "a");
    item.className = isLocked ? "project is-locked" : "project";

    if (isLocked) {
      item.setAttribute("aria-disabled", "true");
      item.setAttribute("aria-label", `Projeto ${name} — bloqueado`);
    } else {
      const url = typeof project.url === "string" ? project.url.trim() : "";
      item.href = url || "#";
      if (url) {
        item.target = "_blank";
        item.rel = "noopener";
      }
      item.setAttribute("aria-label", `Projeto ${name}`);
    }

    const num = document.createElement("span");
    num.className = "project-num";
    num.textContent = String(index + 1).padStart(3, "0");

    const info = document.createElement("div");
    info.className = "project-info";
    const title = document.createElement("h3");
    title.textContent = name;
    const meta = document.createElement("p");
    meta.textContent = [project.description, project.year].filter(Boolean).join(" — ");
    info.append(title, meta);

    const tag = document.createElement("span");
    tag.className = "project-tag";
    tag.textContent = Array.isArray(project.tags) ? project.tags.join(" · ") : "";

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");

    if (isLocked) {
      arrow.className = "arrow arrow-lock";
      arrow.title = "Bloqueado";
      arrow.innerHTML = LOCK_ICON;
    } else {
      arrow.className = "arrow";
      arrow.textContent = "→";
    }

    item.append(num, info, tag, arrow);
    return item;
  };

  const render = (data) => {
    const projects = Array.isArray(data.projects) ? data.projects : [];
    root.replaceChildren();

    if (data.lockdown !== false) {
      root.appendChild(buildLocked(data.lockdownMessage));
      return;
    }

    if (!projects.length) {
      const empty = document.createElement("p");
      empty.className = "projects-empty";
      empty.textContent = "Nenhum projeto publicado ainda.";
      root.appendChild(empty);
      return;
    }

    projects.forEach((project, index) => {
      root.appendChild(buildProject(project, index));
    });
  };

  const renderError = (message, badge) => {
    root.replaceChildren(buildLocked(message, badge));
  };

  const load = async () => {
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      render(data);
    } catch (error) {
      console.warn("Falha ao carregar data/projects.json.", error);
      renderError(
        "Não foi possível carregar data/projects.json. Verifique se o arquivo existe e se o JSON é válido.",
        "JSON não carregado"
      );
    }
  };

  load();
})();