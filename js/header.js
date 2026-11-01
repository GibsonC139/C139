(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const navLinks = [...document.querySelectorAll(".nav a")];
  const sections = [...document.querySelectorAll("main section[id]")];

  const setActiveLink = () => {
    const center = window.scrollY + window.innerHeight / 2;
    let current = null;

    sections.forEach((section) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      if (top <= center) current = section.id;
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1]?.id ?? current;
    }

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
    });
  };

  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 24);
    setActiveLink();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();