(() => {
  const sections = [...document.querySelectorAll(".section")];
  if (!sections.length) return;

  const reveal = (section) => section.classList.add("visible");

  const revealInView = () => {
    const viewport = window.innerHeight;
    sections.forEach((section) => {
      if (section.classList.contains("visible")) return;
      const rect = section.getBoundingClientRect();
      if (rect.top < viewport * 0.92 && rect.bottom > 0) reveal(section);
    });
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  window.addEventListener("scroll", revealInView, { passive: true });
  window.addEventListener("load", revealInView);
  revealInView();
})();