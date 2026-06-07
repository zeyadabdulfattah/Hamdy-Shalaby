/**
 * Hamdy Shalaby — Your Order (client-side)
 */
(function () {
  "use strict";

  const STORAGE_KEY = "hamdy-order";
  const ORDER_API_URL = null;
  /** Demo mode: skip WhatsApp and show cinematic confirmation (for recordings). Set false for production. */
  const DEMO_CHECKOUT = true;

  /** EGP prices keyed by cart id (category-slug) */
  const MENU_PRICES = {
    "offers-large-kofta-bogo": 449,
    "offers-mazagangi-offer": 389,
    "offers-beit-el-karam": 550,
    "offers-friends-platter": 499,
    "meals-mandi-hamdy-shalaby": 189,
    "meals-rice-moammar-with-cream": 165,
    "meals-fatta-with-meat": 145,
    "meals-tandoori-chicken": 129,
    "meals-mandi": 155,
    "meals-stuffed-pigeon": 89,
    "meals-kebab-halla": 135,
    "meals-tomahawk": 175,
    "sandwiches-crispy": 38,
    "sandwiches-liver": 42,
    "sandwiches-kebab-kofta": 32,
    "sandwiches-shish-taouk": 34,
    "sandwiches-hamdy-shalaby-sandwiches": 45,
    "sandwiches-grilled-kebab": 36,
    "sandwiches-alexandrian-sausage": 40,
    "sandwiches-kofta": 44,
    "drinks-oreo-milkshake": 22,
    "drinks-red-island": 18,
    "drinks-blue-hawaii": 26,
    "desserts-hamdy-shalaby-sweets": 48,
    "signature-stuffed-grape-leaves-with-meat": 249,
    "signature-waraq-enab-with-kawaree": 219,
    "signature-beit-el-karam": 199,
    "signature-grilled-chicken": 235,
    "signature-grilled-kofta": 189,
    "signature-grilled-sausage": 210,
    "signature-mushroom-steak": 175,
    "signature-beetroot-walnut-salad": 225,
  };

  let items = [];
  let view = "collapsed";
  let checkoutStep = "form";
  let lastOrderId = null;
  let lastOrderSummary = null;
  let toastTimer = null;

  const els = {};

  function getLang() {
    return document.documentElement.lang === "en" ? "en" : "ar";
  }

  function t(en, ar) {
    return getLang() === "en" ? en : ar;
  }

  function slugify(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items = parsed.map((item) => ({
            ...item,
            price: item.price || MENU_PRICES[item.id] || 0,
          }));
        }
      }
    } catch (_) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (_) {}
    document.dispatchEvent(new CustomEvent("hamdy-order-update", { detail: { count: getTotalCount() } }));
    const skipLists = view === "collapsed";
    requestAnimationFrame(() => render({ skipLists }));
  }

  function getTotalCount() {
    return items.reduce((n, item) => n + item.qty, 0);
  }

  function getTotalAmount() {
    return items.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
  }

  function formatPrice(amount) {
    const n = Math.round(Number(amount) || 0);
    if (getLang() === "ar") {
      return `${n.toLocaleString("ar-EG")}\u00a0ج.م`;
    }
    return `EGP ${n.toLocaleString("en-US")}`;
  }

  function formatPriceHtml(amount) {
    const n = Math.round(Number(amount) || 0);
    if (getLang() === "ar") {
      return `<span class="slide-price__text">${n.toLocaleString("ar-EG")} ج.م</span>`;
    }
    return `<span class="slide-price__text">EGP ${n.toLocaleString("en-US")}</span>`;
  }

  function getCartId(slide, nameEn) {
    if (slide.dataset.cartId) return slide.dataset.cartId;
    const panel = slide.closest(".track-panel");
    const prefix = panel?.id?.replace("menu-", "") || "menu";
    return `${prefix}-${slugify(nameEn)}`;
  }

  function getSlidePrice(slide, cartId) {
    const fromAttr = parseFloat(slide.dataset.cartPrice);
    if (!Number.isNaN(fromAttr) && fromAttr > 0) return fromAttr;
    return MENU_PRICES[cartId] || 0;
  }

  function updateSlidePriceEl(slide, price) {
    const fig = slide.querySelector("figcaption");
    if (!fig) return;

    slide.querySelector(".slide-media .slide-price-badge")?.remove();

    let el = fig.querySelector(".slide-price");
    if (!el) {
      el = document.createElement("span");
      el.className = "slide-price";
      fig.appendChild(el);
    }
    el.textContent = formatPrice(price);
    el.dataset.price = String(price);
    el.setAttribute("aria-label", formatPrice(price));
  }

  function figcaptionPriceCleanup(slide) {
    slide.querySelector(".slide-media .slide-price-badge")?.remove();
  }

  function ensureSlidePrice(slide) {
    const data = extractSlideData(slide, { skipPriceEl: false });
    if (!data) return;
    updateSlidePriceEl(slide, data.price);
  }

  function refreshAllSlidePrices() {
    document.querySelectorAll("#menu .slide").forEach((slide) => {
      ensureSlidePrice(slide);
    });
  }

  function extractSlideData(slide, opts = {}) {
    const isOffer = slide.classList.contains("slide--offer");
    const strong = slide.querySelector("figcaption strong");
    const descSpan = slide.querySelector(
      "figcaption span:not(.slide-offer-badge):not(.slide-price)"
    );
    const img = slide.querySelector(".slide-media img, :scope > img");
    if (!strong) return null;

    const cardNameEn = strong.getAttribute("data-en") || strong.textContent.trim();
    const cardNameAr = strong.getAttribute("data-ar") || cardNameEn;
    const id = getCartId(slide, cardNameEn);

    let nameEn = cardNameEn;
    let nameAr = cardNameAr;
    let descEn = descSpan?.getAttribute("data-en") || descSpan?.textContent.trim() || "";
    let descAr = descSpan?.getAttribute("data-ar") || descEn;

    if (isOffer) {
      nameEn = slide.getAttribute("data-offer-title-en") || cardNameEn;
      nameAr = slide.getAttribute("data-offer-title-ar") || cardNameAr;
      descEn = slide.getAttribute("data-offer-desc-en") || descEn;
      descAr = slide.getAttribute("data-offer-desc-ar") || descAr;
    }

    const price = getSlidePrice(slide, id);
    const panel = slide.closest(".track-panel");
    const category = panel?.id?.replace("menu-", "") || "menu";

    slide.dataset.cartId = id;
    slide.dataset.cartNameEn = cardNameEn;
    slide.dataset.cartNameAr = cardNameAr;
    slide.dataset.cartDescEn = descEn;
    slide.dataset.cartDescAr = descAr;
    slide.dataset.cartPrice = String(price);
    if (img?.src) slide.dataset.cartImage = img.src;

    if (!opts.skipPriceEl) updateSlidePriceEl(slide, price);

    return {
      id,
      nameEn: cardNameEn,
      nameAr: cardNameAr,
      detailNameEn: nameEn,
      detailNameAr: nameAr,
      descEn,
      descAr,
      imageSrc: img?.src || "",
      category,
      price,
      isOffer,
    };
  }

  function addItem(slideOrData, qty = 1) {
    const data = slideOrData?.dataset
      ? extractSlideData(slideOrData, { skipPriceEl: true })
      : slideOrData;
    if (!data?.id) return;

    const existing = items.find((i) => i.id === data.id);
    if (existing) existing.qty += qty;
    else {
      items.push({
        id: data.id,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        descEn: data.descEn || "",
        descAr: data.descAr || "",
        imageSrc: data.imageSrc || "",
        category: data.category || "",
        price: data.price || 0,
        isOffer: !!data.isOffer,
        qty,
      });
    }
    save();
    pulseAddFeedback(slideOrData?.classList ? slideOrData : null, data);
  }

  function setQty(id, qty) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (qty <= 0) removeItem(id);
    else {
      item.qty = qty;
      save();
    }
  }

  function removeItem(id) {
    items = items.filter((i) => i.id !== id);
    save();
  }

  function clear() {
    items = [];
    save();
  }

  function hideAddToast() {
    if (!els.toast) return;
    els.toast.classList.add("is-leaving");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
      els.toast.classList.remove("is-visible", "is-leaving");
    }, 380);
  }

  function showAddToast(data) {
    if (!els.toast || !data) return;

    const lang = getLang();
    const name = lang === "ar" ? data.nameAr : data.nameEn;
    const inOrder = items.find((i) => i.id === data.id);
    const qty = inOrder?.qty || 1;

    if (els.toastItem) els.toastItem.textContent = name;
    if (els.toastMeta) {
      const count = getTotalCount();
      if (qty > 1) {
        els.toastMeta.textContent = t(
          `×${qty} · ${getTotalCount()} items · ${formatPrice(getTotalAmount())}`,
          `×${qty} · ${count} عناصر · ${formatPrice(getTotalAmount())}`
        );
      } else {
        els.toastMeta.textContent = t(
          `${count} item${count === 1 ? "" : "s"} · ${formatPrice(getTotalAmount())}`,
          `${count} ${count === 1 ? "عنصر" : "عناصر"} · ${formatPrice(getTotalAmount())}`
        );
      }
    }

    applyI18nTo(els.toast);

    clearTimeout(toastTimer);
    els.toast.hidden = false;
    els.toast.classList.remove("is-leaving");
    requestAnimationFrame(() => {
      els.toast.classList.add("is-visible");
    });

    toastTimer = setTimeout(hideAddToast, 3200);
  }

  function pulseAddFeedback(slide, data) {
    if (slide) {
      slide.classList.add("is-added-pulse");
      setTimeout(() => slide.classList.remove("is-added-pulse"), 650);
    }

    let itemData = data;
    if (!itemData && slide?.dataset) {
      itemData = extractSlideData(slide, { skipPriceEl: true });
    }
    if (itemData) showAddToast(itemData);

    els.root?.classList.add("is-pulse");
    setTimeout(() => els.root?.classList.remove("is-pulse"), 400);
  }

  function generateOrderId() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `HS-${date}-${rand}`;
  }

  function validatePhone(phone) {
    const digits = phone.replace(/\D/g, "");
    return /^(20)?1[0125]\d{8}$/.test(digits) || /^0?1[0125]\d{8}$/.test(digits);
  }

  function syncAddressField(isDelivery) {
    const label = document.getElementById("order-address-label");
    const input = document.getElementById("order-address");
    const lang = getLang();

    if (label) {
      if (isDelivery) {
        label.setAttribute("data-en", "Delivery address");
        label.setAttribute("data-ar", "عنوان التوصيل");
      } else {
        label.setAttribute("data-en", "Address");
        label.setAttribute("data-ar", "العنوان");
      }
      label.textContent = label.getAttribute(lang === "en" ? "data-en" : "data-ar") || "";
    }

    if (input) {
      input.required = true;
      const ph = input.getAttribute(lang === "en" ? "data-en-placeholder" : "data-ar-placeholder");
      if (ph) input.placeholder = ph;
    }
  }

  function buildWhatsAppMessage(orderId, form) {
    const lang = getLang();
    const isDelivery = form.type === "delivery";
    const lines = [];

    if (lang === "ar") {
      lines.push("🆕 *طلب من موقع حمدي شلبي*");
      lines.push(`#${orderId}`);
      lines.push("");
      lines.push(`👤 ${form.name} — ${form.phone}`);
      lines.push(isDelivery ? "📦 *توصيل*" : "🏪 *استلام*");
      if (form.address) lines.push(`📍 ${form.address}`);
      lines.push("");
      lines.push("🍽 *الطلب:*");
      items.forEach((item) => {
        const lineTotal = (item.price || 0) * item.qty;
        lines.push(`• ${item.nameAr} ×${item.qty} — ${formatPrice(lineTotal)}`);
      });
      lines.push("");
      lines.push(`💰 *الإجمالي:* ${formatPrice(getTotalAmount())}`);
      if (form.notes) {
        lines.push("");
        lines.push(`📝 ${form.notes}`);
      }
    } else {
      lines.push("🆕 *Order from Hamdy Shalaby website*");
      lines.push(`#${orderId}`);
      lines.push("");
      lines.push(`👤 ${form.name} — ${form.phone}`);
      lines.push(isDelivery ? "📦 *Delivery*" : "🏪 *Pickup*");
      if (form.address) lines.push(`📍 ${form.address}`);
      lines.push("");
      lines.push("🍽 *Items:*");
      items.forEach((item) => {
        const lineTotal = (item.price || 0) * item.qty;
        lines.push(`• ${item.nameEn} ×${item.qty} — ${formatPrice(lineTotal)}`);
      });
      lines.push("");
      lines.push(`💰 *Total:* ${formatPrice(getTotalAmount())}`);
      if (form.notes) {
        lines.push("");
        lines.push(`📝 ${form.notes}`);
      }
    }

    return lines.join("\n");
  }

  function getWhatsAppNumber() {
    const fromConfig = window.HamdySiteConfig?.whatsapp;
    if (fromConfig) return fromConfig.replace(/\D/g, "");
    const link = document.querySelector("[data-whatsapp-href]");
    const href = link?.getAttribute("href") || "";
    const m = href.match(/wa\.me\/(\d+)/);
    return m ? m[1] : "966500000000";
  }

  function openProductDetail(slide) {
    const data = extractSlideData(slide, { skipPriceEl: true });
    if (!data || !els.productDetail) return;

    const lang = getLang();
    const inOrder = items.find((i) => i.id === data.id);

    els.productDetail.hidden = false;
    els.productDetail.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("is-product-open");

    if (els.productImg) {
      els.productImg.src = data.imageSrc;
      els.productImg.alt = lang === "ar" ? data.nameAr : data.nameEn;
    }
    if (els.productTitle) {
      els.productTitle.textContent = lang === "ar" ? data.detailNameAr : data.detailNameEn;
    }
    if (els.productDesc) els.productDesc.textContent = lang === "ar" ? data.descAr : data.descEn;
    if (els.productPrice) {
      els.productPrice.textContent = formatPrice(data.price);
      els.productPrice.hidden = !data.price;
    }
    if (els.productCategory) {
      const labels = {
        offers: { en: "Limited Offer", ar: "عرض محدود" },
        meals: { en: "Grills & Mains", ar: "مشويات" },
        sandwiches: { en: "Sandwiches", ar: "ساندويتش" },
        drinks: { en: "Drinks", ar: "مشروبات" },
        desserts: { en: "Desserts", ar: "حلويات" },
        signature: { en: "Signature", ar: "توقيع" },
      };
      const cat = labels[data.category] || { en: "Menu", ar: "القائمة" };
      els.productCategory.textContent = lang === "ar" ? cat.ar : cat.en;
    }
    if (els.productAddBtn) els.productAddBtn._slideData = data;
    if (els.productQty) {
      els.productQty.textContent = String(inOrder?.qty || 0);
      els.productQty.hidden = !inOrder;
    }

    requestAnimationFrame(() => {
      els.productDetail.querySelector(".product-detail-close")?.focus({ preventScroll: true });
    });
  }

  function closeProductDetail() {
    if (!els.productDetail) return;
    els.productDetail.hidden = true;
    els.productDetail.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("is-product-open");
  }

  function setView(next) {
    view = next;
    const open = view !== "collapsed";
    els.root?.classList.toggle("is-expanded", view === "expanded" || view === "checkout");
    els.root?.classList.toggle("is-checkout", view === "checkout");
    document.body.classList.toggle("is-order-open", open);
    document.documentElement.classList.toggle("is-order-open", open);

    els.listView?.classList.toggle("is-hidden", view === "checkout");
    els.checkoutView?.classList.toggle("is-hidden", view !== "checkout");

    if (els.toggle) els.toggle.setAttribute("aria-expanded", String(open));
    if (els.dockTab) els.dockTab.setAttribute("aria-expanded", String(open));
    if (els.backdrop) {
      els.backdrop.setAttribute("aria-hidden", String(!open));
    }

    render();
  }

  function renderSummaryList(container, compact) {
    if (!container) return;
    container.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "your-order-empty";
      empty.setAttribute("data-en", "Your order is empty — browse the menu and tap + to add.");
      empty.setAttribute("data-ar", "طلبك فارغ — تصفّح القائمة واضغط + للإضافة.");
      empty.textContent = t(empty.getAttribute("data-en"), empty.getAttribute("data-ar"));
      container.append(empty);
      if (container === els.list) {
        els.orderTotalWrap?.classList.add("is-hidden");
      }
      if (container === els.checkoutSummary) {
        els.checkoutTotalWrap?.classList.add("is-hidden");
      }
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "your-order-line" + (compact ? " your-order-line--compact" : "");

      if (item.imageSrc && !compact) {
        const thumb = document.createElement("img");
        thumb.className = "your-order-line__thumb";
        thumb.src = item.imageSrc;
        thumb.alt = "";
        thumb.loading = "lazy";
        row.appendChild(thumb);
      }

      const body = document.createElement("div");
      body.className = "your-order-line__body";

      const name = document.createElement("span");
      name.className = "your-order-line__name";
      name.textContent = getLang() === "ar" ? item.nameAr : item.nameEn;

      const priceRow = document.createElement("div");
      priceRow.className = "your-order-line__price-row";

      const unitPrice = document.createElement("span");
      unitPrice.className = "your-order-line__unit";

      const lineTotal = document.createElement("span");
      lineTotal.className = "your-order-line__total";

      if (compact) {
        priceRow.classList.add("your-order-line__price-row--compact");
        unitPrice.hidden = true;
        lineTotal.textContent = `×${item.qty} · ${formatPrice((item.price || 0) * item.qty)}`;
      } else if (item.qty > 1) {
        unitPrice.textContent = `${formatPrice(item.price || 0)} × ${item.qty}`;
        lineTotal.textContent = formatPrice((item.price || 0) * item.qty);
      } else {
        unitPrice.hidden = true;
        lineTotal.textContent = formatPrice(item.price || 0);
      }

      priceRow.append(unitPrice, lineTotal);

      const controls = document.createElement("div");
      controls.className = "your-order-line__controls";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "your-order-qty-btn";
      minus.textContent = "−";
      minus.setAttribute("aria-label", t("Decrease", "تقليل"));
      minus.addEventListener("click", () => setQty(item.id, item.qty - 1));

      const qtyEl = document.createElement("span");
      qtyEl.className = "your-order-qty";
      qtyEl.textContent = String(item.qty);

      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "your-order-qty-btn";
      plus.textContent = "+";
      plus.setAttribute("aria-label", t("Increase", "زيادة"));
      plus.addEventListener("click", () => setQty(item.id, item.qty + 1));

      controls.append(minus, qtyEl, plus);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "your-order-remove";
      remove.setAttribute("data-en", "Remove");
      remove.setAttribute("data-ar", "حذف");
      remove.textContent = t("Remove", "حذف");
      remove.addEventListener("click", () => removeItem(item.id));

      body.append(name, priceRow, controls);
      row.append(body);
      if (!compact) row.append(remove);
      container.append(row);
    });

    if (items.length && container === els.list) {
      if (els.orderTotal) els.orderTotal.textContent = formatPrice(getTotalAmount());
      els.orderTotalWrap?.classList.remove("is-hidden");
    }
    if (items.length && container === els.checkoutSummary) {
      if (els.checkoutTotal) els.checkoutTotal.textContent = formatPrice(getTotalAmount());
      els.checkoutTotalWrap?.classList.remove("is-hidden");
    }
  }

  function applyI18nTo(root) {
    if (!root) return;
    root.querySelectorAll("[data-en][data-ar]").forEach((el) => {
      const text = el.getAttribute(getLang() === "en" ? "data-en" : "data-ar");
      if (text != null) el.textContent = text;
    });
  }

  function render(opts = {}) {
    if (!els.root) return;

    const count = getTotalCount();
    if (els.badge) {
      els.badge.textContent = String(count);
      els.badge.hidden = count === 0;
    }
    if (els.badgeDock) {
      els.badgeDock.textContent = String(count);
      els.badgeDock.hidden = count === 0;
    }

    if (!opts.skipLists) {
      renderSummaryList(els.list, false);
      renderSummaryList(els.checkoutSummary, true);
    }

    if (els.checkoutBtn) els.checkoutBtn.disabled = count === 0;
    if (els.placeBtn) els.placeBtn.disabled = count === 0;

    if (view === "checkout") {
      els.formView?.classList.toggle("is-hidden", checkoutStep !== "form");
      els.successView?.classList.toggle("is-hidden", checkoutStep !== "success");
    }

    if (checkoutStep === "success" && els.successOrderId) {
      els.successOrderId.textContent = lastOrderId || "";
    }

    if (els.floatTotal) {
      const total = getTotalAmount();
      els.floatTotal.textContent = count > 0 ? formatPrice(total) : "";
      els.floatTotal.hidden = count === 0;
    }

    if (!opts.skipLists) {
      applyI18nTo(els.root);
    }
    applyI18nTo(els.productDetail);
  }


  function hideDemoConfirmation() {
    if (!els.demoConfirm) return;
    els.demoConfirm.classList.remove("is-visible");
    document.documentElement.classList.remove("is-demo-confirm-open");
    setTimeout(() => {
      els.demoConfirm.hidden = true;
    }, 450);
    checkoutStep = "form";
    setView("collapsed");
  }

  function showDemoConfirmation(summary) {
    if (!els.demoConfirm || !summary) return;

    const lang = getLang();
    if (els.demoConfirmId) els.demoConfirmId.textContent = summary.orderId;
    if (els.demoConfirmTotal) {
      els.demoConfirmTotal.textContent = t(
        `${summary.count} item${summary.count === 1 ? "" : "s"} · ${formatPrice(summary.total)}`,
        `${summary.count} ${summary.count === 1 ? "عنصر" : "عناصر"} · ${formatPrice(summary.total)}`
      );
    }
    if (els.demoConfirmEta) {
      const isDelivery = summary.form?.type === "delivery";
      els.demoConfirmEta.textContent = isDelivery
        ? t("Estimated delivery: 35–45 min", "التوصيل المتوقع: 35–45 دقيقة")
        : t("Ready for pickup in ~25 min", "جاهز للاستلام خلال ~25 دقيقة");
    }

    applyI18nTo(els.demoConfirm);

    els.demoConfirm.hidden = false;
    document.documentElement.classList.add("is-demo-confirm-open");
    requestAnimationFrame(() => {
      els.demoConfirm.classList.add("is-visible");
      els.demoConfirmClose?.focus({ preventScroll: true });
    });
  }

  function handleCheckoutSubmit(e) {
    e.preventDefault();
    if (!items.length) return;

    const honeypot = els.form?.querySelector('[name="website"]');
    if (honeypot?.value) return;

    const fd = new FormData(els.form);
    const form = {
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      type: fd.get("type") === "delivery" ? "delivery" : "pickup",
      address: String(fd.get("address") || "").trim(),
      notes: String(fd.get("notes") || "").trim(),
    };

    if (!form.name || !form.phone) {
      alert(t("Please enter your name and phone.", "يرجى إدخال الاسم ورقم الجوال."));
      return;
    }
    if (!validatePhone(form.phone)) {
      alert(t("Please enter a valid Egyptian mobile number.", "يرجى إدخال رقم جوال مصري صحيح."));
      return;
    }
    if (!form.address) {
      alert(t("Please enter your address.", "يرجى إدخال العنوان."));
      return;
    }

    lastOrderId = generateOrderId();
    lastOrderSummary = {
      orderId: lastOrderId,
      total: getTotalAmount(),
      count: getTotalCount(),
      form,
    };

    if (DEMO_CHECKOUT) {
      checkoutStep = "success";
      clear();
      render();
      showDemoConfirmation(lastOrderSummary);
      return;
    }

    const message = buildWhatsAppMessage(lastOrderId, form);
    const waUrl = `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;

    if (ORDER_API_URL) {
      fetch(ORDER_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: lastOrderId,
          status: "pending",
          lang: getLang(),
          customer: form,
          items,
          submittedAt: new Date().toISOString(),
        }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .catch(() => window.open(waUrl, "_blank", "noopener,noreferrer"));
    } else {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }

    checkoutStep = "success";
    clear();
    render();
  }

  function bindEvents() {
    els.toggle?.addEventListener("click", () => {
      setView(view === "collapsed" ? "expanded" : "collapsed");
    });

    els.dockTab?.addEventListener("click", () => {
      setView(view === "collapsed" ? "expanded" : "collapsed");
    });

    els.close?.addEventListener("click", () => setView("collapsed"));

    els.backdrop?.addEventListener("click", () => setView("collapsed"));

    els.checkoutBtn?.addEventListener("click", () => {
      if (!items.length) return;
      checkoutStep = "form";
      setView("checkout");
      syncAddressField(els.form?.querySelector('[name="type"]:checked')?.value === "delivery");
    });

    els.backBtn?.addEventListener("click", () => {
      checkoutStep = "form";
      setView("expanded");
    });

    els.form?.addEventListener("submit", handleCheckoutSubmit);

    els.continueBtn?.addEventListener("click", () => {
      checkoutStep = "form";
      setView("collapsed");
    });

    els.form?.querySelectorAll('[name="type"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const isDelivery = els.form.querySelector('[name="type"]:checked')?.value === "delivery";
        syncAddressField(isDelivery);
      });
    });

    document.querySelectorAll("[data-product-detail-close]").forEach((el) => {
      el.addEventListener("click", closeProductDetail);
    });

    els.productAddBtn?.addEventListener("click", () => {
      const data = els.productAddBtn._slideData;
      if (data) addItem(data, 1);
      const inOrder = items.find((i) => i.id === data?.id);
      if (els.productQty) {
        els.productQty.textContent = String(inOrder?.qty || 0);
        els.productQty.hidden = !inOrder;
      }
    });

    els.demoConfirmClose?.addEventListener("click", hideDemoConfirmation);
    els.demoConfirmBackdrop?.addEventListener("click", hideDemoConfirmation);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (els.demoConfirm && !els.demoConfirm.hidden) hideDemoConfirmation();
        else if (!els.productDetail?.hidden) closeProductDetail();
        else if (view !== "collapsed") setView("collapsed");
      }
    });

    document.addEventListener("hamdy-lang-change", () => {
      refreshAllSlidePrices();
      syncAddressField(els.form?.querySelector('[name="type"]:checked')?.value === "delivery");
      render();
      const data = els.productAddBtn?._slideData;
      if (!els.productDetail?.hidden && data) {
        const lang = getLang();
        if (els.productTitle) {
          els.productTitle.textContent = lang === "ar" ? data.detailNameAr : data.detailNameEn;
        }
        if (els.productDesc) els.productDesc.textContent = lang === "ar" ? data.descAr : data.descEn;
        if (els.productPrice) els.productPrice.textContent = formatPrice(data.price);
      }
    });
  }

  function cacheElements() {
    els.root = document.getElementById("your-order");
    els.backdrop = document.getElementById("your-order-backdrop");
    els.toggle = document.getElementById("your-order-toggle");
    els.dockTab = document.getElementById("your-order-dock-tab");
    els.close = document.getElementById("your-order-close");
    els.badge = document.getElementById("your-order-badge");
    els.badgeDock = document.getElementById("your-order-dock-badge");
    els.list = document.getElementById("your-order-list");
    els.listView = document.getElementById("your-order-list-view");
    els.checkoutView = document.getElementById("your-order-checkout-view");
    els.checkoutSummary = document.getElementById("your-order-checkout-summary");
    els.checkoutBtn = document.getElementById("your-order-checkout-btn");
    els.placeBtn = document.getElementById("your-order-place-btn");
    els.form = document.getElementById("your-order-form");
    els.formView = document.getElementById("your-order-form-view");
    els.successView = document.getElementById("your-order-success-view");
    els.successOrderId = document.getElementById("your-order-success-id");
    els.continueBtn = document.getElementById("your-order-continue-btn");
    els.backBtn = document.getElementById("your-order-back-btn");
    els.addressWrap = document.getElementById("your-order-address-wrap");
    els.productDetail = document.getElementById("product-detail");
    els.productImg = document.getElementById("product-detail-img");
    els.productTitle = document.getElementById("product-detail-title");
    els.productDesc = document.getElementById("product-detail-desc");
    els.productCategory = document.getElementById("product-detail-category");
    els.productAddBtn = document.getElementById("product-detail-add");
    els.productQty = document.getElementById("product-detail-qty");
    els.productPrice = document.getElementById("product-detail-price");
    els.orderTotal = document.getElementById("your-order-total");
    els.orderTotalWrap = document.getElementById("your-order-total-wrap");
    els.checkoutTotal = document.getElementById("your-order-checkout-total");
    els.checkoutTotalWrap = document.getElementById("your-order-checkout-total-wrap");
    els.floatTotal = document.getElementById("your-order-float-total");
    els.toast = document.getElementById("order-toast");
    els.toastItem = document.getElementById("order-toast-item");
    els.toastMeta = document.getElementById("order-toast-meta");
  }

  function init() {
    cacheElements();
    if (!els.root) return;
    load();
    bindEvents();
    syncAddressField(false);
    if (DEMO_CHECKOUT && els.placeBtn) {
      els.placeBtn.setAttribute("data-en", "Confirm order");
      els.placeBtn.setAttribute("data-ar", "تأكيد الطلب");
      els.placeBtn.textContent = t("Confirm order", "تأكيد الطلب");
    }
    render();
  }

  window.HamdyOrder = {
    addItem,
    openProductDetail,
    closeProductDetail,
    extractSlideData,
    ensureSlidePrice,
    refreshAllSlidePrices,
    getTotalCount,
    formatPrice,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
