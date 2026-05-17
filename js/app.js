/**
 * Hamdy Shalaby — Landing page interactions
 */

(function () {
  "use strict";

  const STORAGE_KEY = "hamdy-lang";
  const DEFAULT_LANG = "ar";

  /** Update these when you have real contact details */
  const SITE_CONFIG = {
    phone: "+966500000000",
    phoneDisplay: "+966 50 000 0000",
    whatsapp: "966500000000",
  };

  const html = document.documentElement;
  const body = document.body;
  let currentLang = DEFAULT_LANG;
  let lightboxLastFocus = null;

  /* ——— Config: phone / WhatsApp ——— */
  function applySiteConfig() {
    const tel = SITE_CONFIG.phone;
    const display = SITE_CONFIG.phoneDisplay;
    const wa = SITE_CONFIG.whatsapp;

    document.querySelectorAll("[data-phone-href]").forEach((el) => {
      el.setAttribute("href", `tel:${tel.replace(/\s/g, "")}`);
    });

    document.querySelectorAll("[data-phone-display]").forEach((el) => {
      el.textContent = display;
    });

    document.querySelectorAll("[data-whatsapp-href]").forEach((el) => {
      el.setAttribute("href", `https://wa.me/${wa.replace(/\D/g, "")}`);
    });
  }

  /* ——— i18n ——— */
  function getStoredLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ar") return stored;
    } catch (_) {
      /* private browsing */
    }
    return DEFAULT_LANG;
  }

  function setStoredLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}
  }

  function applyTranslations(lang) {
    currentLang = lang;
    const isAr = lang === "ar";

    html.lang = lang;
    html.dir = isAr ? "rtl" : "ltr";
    body.classList.toggle("is-rtl", isAr);
    body.classList.toggle("is-en", !isAr);

    document.querySelectorAll("[data-en][data-ar]").forEach((el) => {
      if (el.hasAttribute("data-hero-lead")) return;
      const text = el.getAttribute(`data-${lang}`);
      if (text != null) {
        if (el.tagName === "TITLE") {
          document.title = text;
        } else {
          el.textContent = text;
        }
      }
    });

    animateHeroLead();

    document.querySelectorAll("[data-en-aria][data-ar-aria]").forEach((el) => {
      const label = el.getAttribute(isAr ? "data-ar-aria" : "data-en-aria");
      if (label) el.setAttribute("aria-label", label);
    });

    document.querySelectorAll(".lang-opt").forEach((opt) => {
      opt.classList.toggle("is-active", opt.dataset.lang === lang);
    });

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const content = metaDesc.getAttribute(isAr ? "data-ar-content" : "data-en-content");
      if (content) metaDesc.setAttribute("content", content);
    }

    setStoredLang(lang);
  }

  function initLanguage() {
    const lang = getStoredLang();
    applyTranslations(lang);

    const toggle = document.getElementById("lang-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      applyTranslations(currentLang === "ar" ? "en" : "ar");
    });

    toggle.querySelectorAll(".lang-opt").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = opt.dataset.lang;
        if (target && target !== currentLang) applyTranslations(target);
      });
    });
  }

  /* ——— Hero lead entrance ——— */
  function animateHeroLead() {
    const lead = document.getElementById("hero-lead");
    const copy = document.querySelector(".hero-copy--entrance");
    if (!lead) return;

    copy?.classList.remove("is-ready");

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const text = lead.getAttribute(`data-${currentLang}`) || lead.textContent.trim();

    if (reduced) {
      lead.textContent = text;
      lead.classList.add("is-animated");
      copy?.classList.add("is-ready");
      if (copy) copy.style.setProperty("--hero-cta-delay", "0.6s");
      return;
    }

    const tokens = text.split(/(\s+)/);
    let wordIndex = 0;

    lead.classList.remove("is-animated");
    lead.replaceChildren();

    const accent = document.createElement("span");
    accent.className = "hero-lead-accent";
    accent.setAttribute("aria-hidden", "true");
    lead.appendChild(accent);

    tokens.forEach((token) => {
      if (!token.trim()) {
        lead.appendChild(document.createTextNode(token));
        return;
      }
      const word = document.createElement("span");
      word.className = "hero-lead-word";
      word.style.setProperty("--word-i", String(wordIndex));
      word.textContent = token;
      lead.appendChild(word);
      wordIndex += 1;
    });

    const ctaDelay = 0.72 + wordIndex * 0.052 + 0.55;
    if (copy) copy.style.setProperty("--hero-cta-delay", `${ctaDelay}s`);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lead.classList.add("is-animated");
        copy?.classList.add("is-ready");
      });
    });
  }

  /* ——— Sticky nav shrink ——— */
  function initHeader() {
    const header = document.getElementById("site-header");
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 40);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const toggle = document.getElementById("nav-toggle");
    const drawer = document.getElementById("nav-drawer");
    if (toggle && drawer) {
      toggle.addEventListener("click", () => {
        const open = drawer.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      drawer.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          drawer.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ——— Manifesto scrollytelling ——— */
  function initManifestoScrolly() {
    const section = document.querySelector("[data-scrolly-section]");
    if (!section) return;

    const beats = [...section.querySelectorAll("[data-scrolly-beat]")];
    const count = beats.length;
    if (count === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let activeIndex = 0;

    const showBeat = (index) => {
      if (index === activeIndex) return;
      beats[activeIndex]?.classList.remove("is-active");
      activeIndex = index;
      beats[activeIndex]?.classList.add("is-active");
    };

    if (reduced) {
      beats.forEach((beat, i) => beat.classList.toggle("is-active", i === 0));
      section.style.setProperty("--manifesto-progress", "1");
      return;
    }

    let ticking = false;

    const update = () => {
      ticking = false;

      const rect = section.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      const scrollRange = section.offsetHeight - window.innerHeight;

      if (scrollRange <= 0) return;

      const progress = Math.min(1, Math.max(0, (window.scrollY - sectionTop) / scrollRange));
      const index = Math.min(count - 1, Math.floor(progress * count));

      section.style.setProperty("--manifesto-progress", String(progress));
      showBeat(index);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    beats.forEach((beat, i) => beat.classList.toggle("is-active", i === 0));
    section.style.setProperty("--manifesto-progress", "0");
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  /* ——— Reveal on scroll ——— */
  function initReveal() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll("[data-reveal]");

    if (reduced) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    nodes.forEach((n) => observer.observe(n));
  }

  /* ——— Horizontal tracks ——— */
  function initTracks() {
    const nudge = (track, direction) => {
      const slide = track.querySelector(".slide");
      const gap = 20;
      const amount = slide ? slide.offsetWidth + gap : 360;
      const sign = direction === "next" ? 1 : -1;
      const rtlMult = html.dir === "rtl" ? -1 : 1;
      track.scrollBy({ left: amount * sign * rtlMult, behavior: "smooth" });
    };

    document.querySelectorAll("[data-track-panel]").forEach((panel) => {
      const track = panel.querySelector(".track");
      const prev = panel.querySelector(".track-btn--prev");
      const next = panel.querySelector(".track-btn--next");
      if (!track) return;

      prev?.addEventListener("click", () => nudge(track, "prev"));
      next?.addEventListener("click", () => nudge(track, "next"));
    });
  }

  /* ——— FAQ accordion ——— */
  function initFaq() {
    const items = document.querySelectorAll(".faq-item");
    if (!items.length) return;

    const closeItem = (item) => {
      const trigger = item.querySelector(".faq-trigger");
      const panel = item.querySelector(".faq-panel");
      item.classList.remove("is-open");
      trigger?.setAttribute("aria-expanded", "false");
      if (panel) {
        panel.style.maxHeight = "0";
        panel.hidden = true;
      }
    };

    const openItem = (item) => {
      const trigger = item.querySelector(".faq-trigger");
      const panel = item.querySelector(".faq-panel");
      item.classList.add("is-open");
      trigger?.setAttribute("aria-expanded", "true");
      if (panel) {
        panel.hidden = false;
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    };

    items.forEach((item) => {
      const trigger = item.querySelector(".faq-trigger");
      if (!trigger) return;

      trigger.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          if (other !== item) closeItem(other);
        });
        if (isOpen) {
          closeItem(item);
        } else {
          openItem(item);
        }
      });
    });

    window.addEventListener(
      "resize",
      () => {
        document.querySelectorAll(".faq-item.is-open .faq-panel").forEach((panel) => {
          panel.style.maxHeight = `${panel.scrollHeight}px`;
        });
      },
      { passive: true }
    );
  }

  /* ——— Lightbox ——— */
  function initLightbox() {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    const img = lightbox.querySelector(".lightbox-img");
    const titleEl = lightbox.querySelector(".lightbox-title");
    const descEl = lightbox.querySelector(".lightbox-desc");
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const trapFocus = (e) => {
      if (e.key !== "Tab" || lightbox.hidden) return;
      const focusables = [...lightbox.querySelectorAll(focusableSelector)].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const open = (card) => {
      const src = card.dataset.lightbox;
      if (!src || !img) return;

      lightboxLastFocus = document.activeElement;
      const isAr = currentLang === "ar";

      img.src = src;
      img.alt = isAr ? card.dataset.offerTitleAr || "" : card.dataset.offerTitleEn || "";

      if (titleEl) {
        titleEl.textContent = isAr ? card.dataset.offerTitleAr || "" : card.dataset.offerTitleEn || "";
      }
      if (descEl) {
        descEl.textContent = isAr ? card.dataset.offerDescAr || "" : card.dataset.offerDescEn || "";
      }

      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      lightbox.querySelector(".lightbox-close")?.focus();
    };

    const close = () => {
      lightbox.hidden = true;
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (img) img.src = "";
      lightboxLastFocus?.focus();
    };

    document.querySelectorAll(".offer-card[data-lightbox]").forEach((card) => {
      card.addEventListener("click", () => open(card));
    });

    lightbox.querySelectorAll("[data-lightbox-close]").forEach((el) => {
      el.addEventListener("click", close);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hidden) close();
      trapFocus(e);
    });
  }

  /* ——— Footer year ——— */
  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ——— Smooth anchor offset for fixed nav ——— */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const headerH = document.getElementById("site-header")?.offsetHeight || 72;
        const top = target.getBoundingClientRect().top + window.scrollY - headerH;
        window.scrollTo({ top, behavior: "smooth" });
      });
    });
  }

  function init() {
    applySiteConfig();
    initLanguage();
    initHeader();
    initReveal();
    initManifestoScrolly();
    initTracks();
    initFaq();
    initLightbox();
    initYear();
    initAnchors();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
