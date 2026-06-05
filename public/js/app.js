/**
 * Hamdy Shalaby — Landing page interactions
 */

(function () {
  "use strict";

  const STORAGE_KEY = "hamdy-lang";
  const DEFAULT_LANG = "ar";

  /** Update these when you have real contact details */
  const SITE_CONFIG = {
    phone: "17069",
    phoneDisplay: "17069",
    whatsapp: "966500000000",
    orderApiUrl: null,
  };

  window.HamdySiteConfig = SITE_CONFIG;

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

    updateLangToggle(lang);
    refreshSlideCartLabels();
    window.HamdyOrder?.refreshAllSlidePrices?.();

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const content = metaDesc.getAttribute(isAr ? "data-ar-content" : "data-en-content");
      if (content) metaDesc.setAttribute("content", content);
    }

    setStoredLang(lang);
    document.dispatchEvent(new CustomEvent("hamdy-lang-change", { detail: { lang } }));
  }

  function updateLangToggle(lang) {
    const toggle = document.getElementById("lang-toggle");
    if (!toggle) return;

    const isAr = lang === "ar";
    const label = toggle.querySelector(".lang-toggle__label");
    if (label) {
      const text = label.getAttribute(isAr ? "data-show-when-ar" : "data-show-when-en");
      if (text) label.textContent = text;
    }

    const aria = toggle.getAttribute(isAr ? "data-ar-aria" : "data-en-aria");
    if (aria) toggle.setAttribute("aria-label", aria);
  }

  function initLanguage() {
    const lang = getStoredLang();
    applyTranslations(lang);

    const toggle = document.getElementById("lang-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      applyTranslations(currentLang === "ar" ? "en" : "ar");
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
    const menu = document.getElementById("nav-menu");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const open = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      menu.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
          menu.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ——— Manifesto scrollytelling ——— */
  function initManifestoScrolly() {
    const section = document.querySelector("[data-scrolly-section]");
    if (!section) return;

    const scrollTrack = section.querySelector(".manifesto-track");
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
      const scrollRange = scrollTrack
        ? scrollTrack.offsetHeight
        : section.offsetHeight - window.innerHeight;

      if (scrollRange <= 0) return;

      const scrolled = window.scrollY - sectionTop;
      const progress = Math.min(1, Math.max(0, scrolled / scrollRange));
      const index =
        progress >= 1 ? count - 1 : Math.min(count - 1, Math.floor(progress * count));

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

  /* ——— Menu slide order CTA ——— */
  function wrapSlideMedia(slide) {
    if (slide.querySelector(".slide-media")) {
      return slide.querySelector(".slide-media");
    }
    const img = slide.querySelector(":scope > img");
    if (!img) return null;

    const media = document.createElement("div");
    media.className = "slide-media";
    img.parentNode.insertBefore(media, img);
    media.appendChild(img);
    return media;
  }

  function addSlideCartActions(slide) {
    const media = wrapSlideMedia(slide);
    if (!media || media.querySelector(".slide-actions")) return;

    window.HamdyOrder?.ensureSlidePrice(slide);

    const actions = document.createElement("div");
    actions.className = "slide-actions";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "slide-add-btn";
    addBtn.setAttribute("aria-label", currentLang === "ar" ? "أضف للطلب" : "Add to your order");
    addBtn.innerHTML =
      '<svg class="slide-add-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "slide-details-btn";
    detailsBtn.setAttribute("data-en", "View details");
    detailsBtn.setAttribute("data-ar", "التفاصيل");
    detailsBtn.textContent =
      detailsBtn.getAttribute(`data-${currentLang}`) || detailsBtn.getAttribute("data-ar");

    actions.append(addBtn, detailsBtn);
    media.appendChild(actions);
  }

  function initSlideActionDelegation() {
    const menu = document.getElementById("menu");
    if (!menu || menu.dataset.slideActionsBound) return;
    menu.dataset.slideActionsBound = "true";

    menu.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".slide-add-btn");
      const detailsBtn = e.target.closest(".slide-details-btn");
      if (!addBtn && !detailsBtn) return;

      const slide = (addBtn || detailsBtn).closest(".slide");
      if (!slide) return;

      e.preventDefault();
      e.stopPropagation();

      if (addBtn) {
        window.HamdyOrder?.addItem(slide);
      } else {
        window.HamdyOrder?.openProductDetail(slide);
      }
    });
  }

  function refreshSlideCartLabels() {
    document.querySelectorAll(".slide-details-btn[data-en][data-ar]").forEach((btn) => {
      btn.textContent = btn.getAttribute(`data-${currentLang}`) || btn.getAttribute("data-ar");
    });
  }

  /* ——— Menu tracks: continuous marquee ——— */
  function initTracks() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    document.querySelectorAll("[data-track-panel]").forEach((panel, index) => {
      const track = panel.querySelector(".track");
      if (!track) return;

      track.querySelectorAll(".slide").forEach(wrapSlideMedia);
      track.querySelectorAll(".slide").forEach(addSlideCartActions);

      const viewport = document.createElement("div");
      viewport.className = "track-viewport";
      track.parentNode.insertBefore(viewport, track);
      viewport.appendChild(track);

      /* Mobile + reduced motion: no CSS transform marquee (iOS Safari makes cards vanish) */
      if (reduced || isMobile) {
        track.classList.add("track--static");
        return;
      }

      const originals = [...track.querySelectorAll(".slide")];
      const minLoopSlides = 8;
      let sets = 1;
      while (originals.length * sets < minLoopSlides) {
        sets += 1;
      }
      for (let i = 1; i < sets; i += 1) {
        originals.forEach((slide) => {
          const repeat = slide.cloneNode(true);
          repeat.classList.add("slide--repeat");
          repeat.setAttribute("aria-hidden", "true");
          repeat.querySelectorAll("img").forEach((img) => img.setAttribute("alt", ""));
          track.appendChild(repeat);
        });
      }

      const loopSet = [...track.querySelectorAll(".slide")];
      loopSet.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.classList.add("slide--clone");
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("img").forEach((img) => img.setAttribute("alt", ""));
        track.appendChild(clone);
      });

      track.classList.add("track--marquee");
      track.removeAttribute("tabindex");
      const secondsPerSlide = isMobile ? 6.5 : 5.5;
      const loopCount = loopSet.length;
      const duration = Math.max(isMobile ? 32 : 28, loopCount * secondsPerSlide);
      track.style.setProperty("--marquee-duration", `${duration}s`);
      track.style.setProperty("--marquee-delay", `${index * -4}s`);
    });

    applySiteConfig();
    initSlideActionDelegation();
  }

  function closeMenuOrderOverlays() {
    /* legacy no-op */
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

  /* ——— Lightbox (legacy — offers use product detail now) ——— */
  function initLightbox() {
    /* Offer lightbox disabled — View details + Your Order handles all menu items */
  }

  /* ——— Footer year ——— */
  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ——— Menu category rail: fixed below header while in menu ——— */
  function syncHeaderOffset() {
    const header = document.getElementById("site-header");
    if (!header) return;
    document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
  }

  function initMenuRailDock() {
    const menu = document.getElementById("menu");
    const rail = document.getElementById("menu-rail");
    const slot = document.querySelector(".menu-rail-slot");
    const header = document.getElementById("site-header");
    if (!menu || !rail || !header) return;

    const dock = () => {
      syncHeaderOffset();
      const headerH = header.offsetHeight;
      const railH = rail.offsetHeight;
      const menuRect = menu.getBoundingClientRect();
      const shouldDock = menuRect.top <= headerH && menuRect.bottom > headerH + railH;
      rail.classList.toggle("menu-rail--dock", shouldDock);
      if (slot) {
        slot.style.minHeight = shouldDock ? `${railH}px` : "";
      }
    };

    dock();
    window.addEventListener("scroll", dock, { passive: true });
    window.addEventListener("resize", dock);
  }

  /* ——— Menu category rail (scroll spy) ——— */
  function initMenuCategoryScroll() {
    const panels = [...document.querySelectorAll(".track-panel[id^='menu-']")];
    const chips = document.querySelectorAll("[data-menu-chip]");
    const railScroll = document.querySelector(".menu-rail__scroll");
    if (!panels.length || !chips.length) return;

    const setActive = (key) => {
      chips.forEach((chip) => {
        const active = chip.dataset.menuChip === key;
        chip.classList.toggle("is-active", active);
        if (active && railScroll) {
          chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (!visible.length) return;
        const key = visible[0].target.id.replace("menu-", "");
        setActive(key);
      },
      { rootMargin: "-28% 0px -48% 0px", threshold: [0, 0.15, 0.35, 0.55] }
    );

    panels.forEach((panel) => observer.observe(panel));
  }

  /* ——— Smooth anchor offset for fixed nav + menu rail ——— */
  function initAnchors() {
    const menuRail = document.getElementById("menu-rail");

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href");
        if (!id || id === "#") return;
        let target = document.querySelector(id);
        if (!target) return;
        if (id === "#manifesto") {
          target =
            document.getElementById("manifesto-gateway-title") ||
            document.getElementById("manifesto");
        }
        if (id === "#menu") {
          target = document.getElementById("menu-offers") || document.getElementById("menu");
        }
        e.preventDefault();
        syncHeaderOffset();
        const headerH = document.getElementById("site-header")?.offsetHeight || 72;
        const inMenu = target.closest("#menu");
        const railH =
          menuRail && inMenu && target.id !== "menu" ? menuRail.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - headerH - railH - 8;
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
    initMenuRailDock();
    initMenuCategoryScroll();
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
