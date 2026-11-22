const CONTACT_EMAIL = "abangzuliqmalsyah@gmail.com";
const ROLES = ["Web Developer", "UI Designer", "Voice Actor", "Dungeon Master", "Audio Engineer", "Communicator", "Problem Solver", "Student"];

// Shared functionality: each feature checks whether its target exists,
// so this file can safely be loaded by every page.

const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Mobile navigation
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Typing animation (only runs on pages containing #typed)
const typed = document.getElementById("typed");
if (typed) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    typed.textContent = ROLES[0];
  } else {
    let role = 0, char = 0, deleting = false;
    function tick() {
      const word = ROLES[role];
      char += deleting ? -1 : 1;
      typed.textContent = word.slice(0, char);
      let delay = deleting ? 45 : 90;
      if (!deleting && char === word.length) { deleting = true; delay = 1600; }
      else if (deleting && char === 0) { deleting = false; role = (role + 1) % ROLES.length; delay = 350; }
      setTimeout(tick, delay);
    }
    tick();
  }
}

// Cursor aura (only if the decorative element exists)
const aura = document.querySelector(".cursor-aura");
if (aura && window.matchMedia("(pointer: fine)").matches) {
  let targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;
  let curX = targetX, curY = targetY;
  window.addEventListener("pointermove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    aura.classList.add("active");
  });
  document.addEventListener("pointerleave", () => aura.classList.remove("active"));

  function animateAura() {
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    aura.style.left = curX + "px";
    aura.style.top = curY + "px";
    requestAnimationFrame(animateAura);
  }
  animateAura();
}

// Card spotlight
document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

// Project filters (only on pages containing filter controls)
const filters = document.querySelectorAll(".filter");
const projects = document.querySelectorAll(".project");
filters.forEach((btn) => {
  btn.addEventListener("click", () => {
    filters.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    const wanted = btn.dataset.filter;
    projects.forEach((p) => {
      p.hidden = !(wanted === "all" || p.dataset.category === wanted);
    });
  });
});

// Scroll reveal
if ("IntersectionObserver" in window) {
  const revealItems = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealItems.forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
}

// Contact form (only on pages containing #contact-form)
const form = document.getElementById("contact-form");
const note = document.getElementById("form-note");
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const subject = encodeURIComponent(`Portfolio message from ${data.get("name")}`);
    const body = encodeURIComponent(`${data.get("message")}\n\n${data.get("name")}\n${data.get("email")}`);
    if (note) note.textContent = "Opening your email app…";
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  });
}

// ==========================================================
// E-resume interactivity (each block only runs if its markup exists)
// ==========================================================
(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Expand / collapse all ----------
  const entries = [...document.querySelectorAll(".exp-entry")];
  const toggleAll = document.getElementById("toggle-all");

  function syncToggleAll() {
    if (!toggleAll) return;
    const allOpen = entries.every((e) => e.open);
    toggleAll.textContent = allOpen ? "Collapse all" : "Expand all";
    toggleAll.setAttribute("aria-expanded", String(allOpen));
  }
  if (toggleAll && entries.length) {
    entries.forEach((e) => e.addEventListener("toggle", syncToggleAll));
    toggleAll.addEventListener("click", () => {
      const open = !entries.every((e) => e.open);
      entries.forEach((e) => { e.open = open; });
    });
    syncToggleAll();
  }

  // ---------- Highlight experience by skill ----------
  const chips = [...document.querySelectorAll(".skill-chip")];
  const skillStatus = document.getElementById("skill-status");
  let activeSkill = null;

  function usesSkill(entry, skill) {
    return [...entry.querySelectorAll(".entry-tags li")].some((li) => li.dataset.skill === skill);
  }

  function applySkill(skill, label) {
    activeSkill = skill;
    const matches = [];
    entries.forEach((entry) => {
      const hit = !!skill && usesSkill(entry, skill);
      entry.classList.toggle("is-match", hit);
      entry.classList.toggle("is-dim", !!skill && !hit);
      entry.querySelectorAll(".entry-tags li").forEach((li) => {
        li.classList.toggle("on", !!skill && li.dataset.skill === skill);
      });
      if (hit) { entry.open = true; matches.push(entry); }
    });
    chips.forEach((chip) => {
      const on = chip.dataset.skill === skill;
      chip.classList.toggle("active", on);
      chip.setAttribute("aria-pressed", String(on));
    });
    if (skillStatus) {
      skillStatus.textContent = skill
        ? `${matches.length} ${matches.length === 1 ? "entry uses" : "entries use"} ${label}. Select it again to clear.`
        : "";
    }
    if (matches[0]) {
      matches[0].scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "nearest" });
    }
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const skill = chip.dataset.skill;
      applySkill(activeSkill === skill ? null : skill, chip.textContent.trim());
    });
  });

  // ---------- Click-to-copy ----------
  const copyStatus = document.getElementById("copy-status");

  function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const original = btn.textContent;
    let timer = 0;
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (err) {
        ok = legacyCopy(text); // http:// and file:// pages have no Clipboard API
      }
      btn.textContent = ok ? "Copied ✓" : "Copy failed";
      btn.classList.toggle("copied", ok);
      if (copyStatus) copyStatus.textContent = ok ? `Copied ${text} to clipboard.` : "Could not copy. Select the text and copy it manually.";
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, 1800);
    });
  });
})();