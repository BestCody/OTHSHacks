document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if ("IntersectionObserver" in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    }
  }, { threshold: 0.13 });

  document.querySelectorAll("[data-reveal]").forEach((node) => revealObserver.observe(node));
} else {
  document.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("visible"));
}

const forge = document.querySelector("[data-forge]");
const forgeStates = Array.from({ length: 9 }, (_, index) => `forge-state-${index + 1}`);

function updateForge() {
  if (!forge || reducedMotion) return;

  const rect = forge.getBoundingClientRect();
  const viewport = window.innerHeight;
  const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height * 0.5)));
  const state = Math.max(0, Math.min(9, Math.floor(progress * 10)));

  forge.classList.remove(...forgeStates);
  if (state > 0) forge.classList.add(`forge-state-${state}`);
}

updateForge();
window.addEventListener("scroll", updateForge, { passive: true });
window.addEventListener("resize", updateForge);
