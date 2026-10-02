(() => {
  "use strict";
  const C = window.FOODEEZ_CONFIG;
  const { IMG, CATEGORIES, ITEMS, BEST, PRICES } = window.FOODEEZ_MENU;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rs = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("fz_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("fz_" + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem("fz_" + k); } catch {} },
  };

  // ---------- Location (which QR / menu) ----------
  const params = new URLSearchParams(location.search);
  let loc = params.get("loc");
  if (!PRICES[loc]) loc = store.get("loc", C.defaultLocation);
  if (!PRICES[loc]) loc = Object.keys(PRICES)[0];
  store.set("loc", loc);
  const P = PRICES[loc];

  // ---------- State ----------
  let cart = store.get("cart_" + loc, []); // [{id, cat, item, plate, dough, price, qty}]
  let user = store.get("user", null);      // {name, phone, address}
  const saveCart = () => { store.set("cart_" + loc, cart); renderCartBar(); refreshItemButtons(); };

  const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const itemByKey = Object.fromEntries(ITEMS.map((i) => [i.key, i]));
  const priceOf = (cat, key) => P[cat] && P[cat][key];

  // ---------- Render menu ----------
  function renderMenu(filter = "") {
    const q = filter.trim().toLowerCase();
    const menu = $("#menu");
    let html = "";
    for (const cat of CATEGORIES) {
      const items = ITEMS.filter((it) => priceOf(cat.id, it.key) != null)
        .filter((it) => !q || (cat.name + " " + it.name).toLowerCase().includes(q));
      if (!items.length) continue;
      html += `<section class="cat" id="cat-${cat.id}" data-cat="${cat.id}">
        <div class="cat-head"><img src="${IMG[cat.id]}" alt="" loading="lazy" decoding="async"/><div><h2>${cat.name}</h2><p>${cat.desc}</p></div></div>
        ${items.map((it) => itemCard(cat, it)).join("")}
      </section>`;
    }
    menu.innerHTML = html || `<p class="empty">No momos match “${esc(filter)}” 🥟</p>`;
    refreshItemButtons();
    observeSections();
  }

  function itemCard(cat, it) {
    const best = (BEST[cat.id] || []).includes(it.key);
    return `<article class="item" data-cat="${cat.id}" data-key="${it.key}">
      <div class="item-info">
        <div class="tags"><span class="veg-mark" title="Veg"></span>
          ${best ? '<span class="badge best">★ Bestseller</span>' : ""}
          ${it.healthy ? '<span class="badge healthy">Healthy</span>' : ""}
          ${it.single ? '<span class="badge new">New</span>' : ""}
        </div>
        <h3>${it.name}</h3>
        <div class="item-desc">${it.single ? "Bite-sized & crunchy" : it.dough ? "Half / Full plate · Aata, Oats or Ragi" : "Half / Full plate"}</div>
      </div>
      <div class="item-side">
        <img src="${IMG[cat.id]}" alt="${cat.name} – ${it.name}" loading="lazy" decoding="async"/>
        <div class="btn-slot"></div>
      </div>
    </article>`;
  }

  function qtyFor(cat, key) { return cart.filter((l) => l.cat === cat && l.item === key).reduce((s, l) => s + l.qty, 0); }

  function refreshItemButtons() {
    $$(".item").forEach((el) => {
      const { cat, key } = el.dataset;
      const q = qtyFor(cat, key);
      const slot = $(".btn-slot", el);
      slot.innerHTML = q
        ? `<div class="stepper"><button data-act="dec" aria-label="Remove one">−</button><span>${q}</span><button data-act="inc" aria-label="Add one">+</button></div>`
        : `<button class="add-btn" data-act="add">ADD<span class="plus">+</span></button>`;
    });
  }

  $("#menu").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const { cat, key } = b.closest(".item").dataset;
    const it = itemByKey[key];
    if (b.dataset.act === "dec") {
      const idx = cart.map((l) => l.cat === cat && l.item === key).lastIndexOf(true);
      if (idx > -1) { cart[idx].qty--; if (!cart[idx].qty) cart.splice(idx, 1); saveCart(); }
      return;
    }
    openOptions(cat, key);
  });

  function addToCart(o, qty) {
    const id = [o.cat, o.item, o.plate, o.dough].join("|");
    const ex = cart.find((l) => l.id === id);
    if (ex) ex.qty += qty; else cart.push({ id, ...o, qty });
    saveCart();
    const bar = $("#cartBar"); bar.classList.remove("bump"); void bar.offsetWidth; bar.classList.add("bump");
    if (navigator.vibrate) navigator.vibrate(12);
    toast(`Added ${itemByKey[o.item].name} 🥟`);
  }

  const lineName = (l) => `${catById[l.cat].name} – ${itemByKey[l.item].name.replace("Aata / Oats / Ragi", l.dough || "Aata")}`;
  const lineMeta = (l) => (l.plate ? l.plate + " plate" : "");

  // ---------- Cart bar ----------
  const subtotal = () => cart.reduce((s, l) => s + l.price * l.qty, 0);
  const count = () => cart.reduce((s, l) => s + l.qty, 0);
  function renderCartBar() {
    const n = count();
    $("#cartBar").hidden = !n;
    $("#cartCount").textContent = `${n} item${n > 1 ? "s" : ""}`;
    $("#cartTotal").textContent = rs(subtotal());
  }
  $("#cartBar").onclick = () => openCart();

  // ---------- Sheet ----------
  let onSheetClose = null;
  let closeTimer = null;
  function openSheet(html, onClose) {
    const sh = $("#sheet"), scrim = $("#scrim");
    clearTimeout(closeTimer);
    $("#sheetBody").innerHTML = html;
    $("#sheetBody").onchange = null;
    const wasOpen = !sh.hidden && !sh.classList.contains("closing");
    sh.classList.remove("closing"); scrim.classList.remove("closing");
    sh.style.transform = ""; scrim.style.opacity = "";
    sh.hidden = false; scrim.hidden = false;
    if (!wasOpen) { sh.classList.remove("enter"); void sh.offsetWidth; sh.classList.add("enter"); }
    $("#sheetBody").scrollTop = 0;
    document.body.classList.add("locked");
    onSheetClose = onClose || null;
  }
  function closeSheet() {
    const sh = $("#sheet"), scrim = $("#scrim");
    if (sh.hidden || sh.classList.contains("closing")) return;
    sh.classList.add("closing"); scrim.classList.add("closing");
    sh.style.transform = ""; scrim.style.opacity = "";
    document.body.classList.remove("locked");
    closeTimer = setTimeout(() => {
      sh.hidden = true; scrim.hidden = true;
      sh.classList.remove("closing", "enter"); scrim.classList.remove("closing");
    }, 260);
    if (onSheetClose) { const f = onSheetClose; onSheetClose = null; f(); }
  }
  $("#scrim").onclick = closeSheet;
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#sheet").hidden) closeSheet(); });
  // swipe down to close
  (() => {
    const sh = $("#sheet"), body = $("#sheetBody"), scrim = $("#scrim");
    let y0 = null, t0 = 0, dy = 0, dragging = false, raf = 0;
    const paint = () => { raf = 0; sh.style.transform = `translate3d(0, ${dy}px, 0)`; scrim.style.opacity = String(Math.max(0, 1 - dy / 500)); };
    sh.addEventListener("touchstart", (e) => {
      if (e.touches.length > 1) return;
      const onHandle = e.target.closest(".sheet-grab");
      if (!onHandle && body.scrollTop > 0) { y0 = null; return; }
      y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0; dragging = false;
    }, { passive: true });
    sh.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      const d = e.touches[0].clientY - y0;
      if (!dragging) {
        if (d < 6) { if (d < -4) y0 = null; return; } // scrolling content up — let it scroll
        dragging = true; sh.classList.add("dragging");
      }
      e.preventDefault(); // stop the content/page from scrolling while dragging the sheet
      dy = Math.max(0, d);
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: false });
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      if (!dragging) return;
      dragging = false; sh.classList.remove("dragging");
      cancelAnimationFrame(raf); raf = 0;
      const speed = dy / Math.max(1, performance.now() - t0); // px per ms
      if (dy > 120 || speed > 0.6) closeSheet();
      else { sh.style.transform = ""; scrim.style.opacity = ""; }
    };
    sh.addEventListener("touchend", end);
    sh.addEventListener("touchcancel", end);
  })();

  // ---------- Options sheet (Half / Full, dough) ----------
  function openOptions(cat, key) {
    const it = itemByKey[key], p = priceOf(cat, key);
    let qty = 1;
    openSheet(`
      <img class="sheet-hero" src="${IMG[cat]}" alt=""/>
      <h2>${it.name}</h2>
      <p class="sub">${catById[cat].name} · 100% veg</p>
      ${it.single ? `<div class="group"><div class="group-title" style="margin:0">Price <span>${rs(p)}</span></div></div>` : `<div class="group">
        <div class="group-title">Choose plate <small>Required</small></div>
        <label class="opt"><span>Half plate</span><span class="opt-right">${rs(p[0])}<input type="radio" name="plate" value="Half" checked></span></label>
        <label class="opt"><span>Full plate</span><span class="opt-right">${rs(p[1])}<input type="radio" name="plate" value="Full"></span></label>
      </div>`}
      ${it.dough ? `<div class="group">
        <div class="group-title">Choose dough <small>Required</small></div>
        ${["Aata", "Oats", "Ragi"].map((d, i) => `<label class="opt"><span>${d}</span><span class="opt-right"><input type="radio" name="dough" value="${d}" ${i ? "" : "checked"}></span></label>`).join("")}
      </div>` : ""}
      <div class="sheet-footer">
        <div class="qty"><button data-q="-1" aria-label="Less">−</button><span id="optQty">1</span><button data-q="1" aria-label="More">+</button></div>
        <button class="btn" id="optAdd">Add item · <span id="optPrice">${rs(it.single ? p : p[0])}</span></button>
      </div>`);
    const body = $("#sheetBody");
    const unit = () => (it.single ? p : $("input[name=plate]:checked", body).value === "Full" ? p[1] : p[0]);
    const upd = () => { $("#optQty").textContent = qty; $("#optPrice").textContent = rs(unit() * qty); };
    body.onchange = upd;
    $$("[data-q]", body).forEach((b) => (b.onclick = () => { qty = Math.max(1, qty + +b.dataset.q); upd(); }));
    $("#optAdd").onclick = () => {
      const plate = it.single ? null : $("input[name=plate]:checked", body).value;
      const dough = it.dough ? $("input[name=dough]:checked", body).value : null;
      addToCart({ cat, item: key, plate, dough, price: unit() }, qty);
      closeSheet();
    };
  }

  // ---------- Cart sheet ----------
  function openCart() {
    if (!cart.length) { closeSheet(); return; }
    openSheet(`
      <h2>Your cart</h2>
      <p class="sub">${esc(P.label)} · ${esc(C.address)}</p>
      <div class="group" id="cartLines">
        ${cart.map((l, i) => `<div class="line">
          <img src="${IMG[l.cat]}" alt=""/>
          <div class="line-info"><b>${lineName(l)}</b><small>${lineMeta(l) || "Regular"} · ${rs(l.price)}</small></div>
          <div class="qty sm"><button data-i="${i}" data-d="-1" aria-label="Less">−</button><span>${l.qty}</span><button data-i="${i}" data-d="1" aria-label="More">+</button></div>
          <div class="line-price">${rs(l.price * l.qty)}</div>
        </div>`).join("")}
      </div>
      <button class="link" id="addMore">+ Add more items</button>
      <div class="group bill">
        <div class="row"><span>Item total</span><span>${rs(subtotal())}</span></div>
        <div class="row total"><span>To pay</span><span>${rs(subtotal())}</span></div>
      </div>
      <div class="sheet-footer"><button class="btn" id="toCheckout">Checkout · ${rs(subtotal())}</button></div>`);
    $$("[data-d]", $("#cartLines")).forEach((b) => (b.onclick = () => {
      const l = cart[+b.dataset.i]; l.qty += +b.dataset.d;
      if (l.qty <= 0) cart.splice(+b.dataset.i, 1);
      saveCart(); openCart();
    }));
    $("#addMore").onclick = closeSheet;
    $("#toCheckout").onclick = openCheckout;
  }

  // ---------- Checkout ----------
  const payMethods = () => [
    C.upiId && { id: "upi", ico: "⚡", t: "UPI — Pay now", s: "GPay, PhonePe, Paytm, any UPI app" },
    C.razorpayKey && { id: "online", ico: "💳", t: "Card / Netbanking / Wallet", s: "Secure payment by Razorpay" },
    C.allowCash && { id: "cash", ico: "💵", t: "Pay at counter", s: "Cash or UPI when you collect" },
  ].filter(Boolean);

  // ---------- Coupons / offers ----------
  const COUPONS = C.coupons || {};
  const OFFERS = [
    C.instagram && { key: "instagram", url: C.instagram, title: "Follow us on Instagram", cta: "Follow", ico: "ig" },
    C.googleReview && { key: "review", url: C.googleReview, title: "Review us on Google", cta: "Review", ico: "g" },
  ].filter(Boolean);
  const codeFor = (key) => Object.keys(COUPONS).find((c) => COUPONS[c].unlock === key);
  let applied = null; // coupon code currently applied
  const unlocked = () => store.get("unlocked", {});
  const pending = () => store.get("pending", {});    // offer tapped, task not yet confirmed
  const WAIT = { instagram: 8, review: 15, ...(C.offerWaitSec || {}) }; // min seconds away doing the task
  const TASK = { instagram: "Follow @foodeez_on_wheels on Instagram", review: "Post your review on Google" };
  function startTask(key) { const p = pending(); p[key] = Date.now(); store.set("pending", p); }
  // returns null when the task is accepted, otherwise a message
  function finishTask(key) {
    const t = pending()[key];
    if (!t) return `${TASK[key]} first, then tap Done`;
    const left = Math.ceil(WAIT[key] - (Date.now() - t) / 1000);
    if (left > 0) return `${TASK[key]} first, then come back and tap Done`;
    const u = unlocked(); u[key] = true; store.set("unlocked", u);
    const p = pending(); delete p[key]; store.set("pending", p);
    return null;
  }
  function couponCheck(code) {
    const c = COUPONS[code];
    if (!c) return "Invalid coupon code";
    if (c.unlock && !unlocked()[c.unlock]) return c.unlock === "instagram" ? "Follow us on Instagram first to unlock this code" : "Review us on Google first to unlock this code";
    if (c.minOrder && subtotal() < c.minOrder) return `Add items worth ${rs(c.minOrder - subtotal())} more to use this code`;
    return null;
  }
  function discountFor(code) {
    const c = code && COUPONS[code];
    if (!c || couponCheck(code)) return 0;
    let d = Math.round((subtotal() * c.pct) / 100);
    if (c.maxOff) d = Math.min(d, c.maxOff);
    return d;
  }
  const icoHtml = (k) => k === "ig"
    ? `<span class="offer-ico ig"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#fff"/></svg></span>`
    : `<span class="offer-ico g"><svg viewBox="0 0 48 48" width="22" height="22"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.5-9.5 6.5-16.2z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3V14H4.5C3 17 2 20.4 2 24s1 7 2.5 10l7.3-5.7z"/><path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.5 2 8.1 6.9 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/></svg></span>`;

  function openCheckout() {
    const u = user || store.get("guest", {});
    const methods = payMethods();
    const fee = C.deliveryFee || 0;
    openSheet(`
      <h2>Checkout</h2>
      ${user ? `<p class="sub">Ordering as <b>${esc(user.name)}</b></p>` : `<p class="sub">Checking out as guest · <button class="link" id="ckLogin" style="padding:0">Login to save details</button></p>`}
      <form id="ckForm" novalidate>
        <div class="field" id="fName"><label for="ckName">Your name</label><input id="ckName" autocomplete="name" value="${esc(u.name)}" placeholder="e.g. Rahul"/><div class="err">Please enter your name</div></div>
        <div class="field" id="fPhone"><label for="ckPhone">Mobile number</label><div class="phone-wrap"><span>+91</span><input id="ckPhone" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" value="${esc(u.phone)}" placeholder="10-digit number"/></div><div class="err">Enter a valid 10-digit mobile number</div></div>
        <label style="font-size:13px;font-weight:600;color:var(--ink-2);display:block;margin-bottom:6px">Order type</label>
        <div class="seg">
          <label><input type="radio" name="otype" value="Pickup" checked>🏃 Pickup<small>Collect at cart</small></label>
          <label><input type="radio" name="otype" value="Delivery">🛵 Delivery<small>Nearby only${fee ? " · +" + rs(fee) : ""}</small></label>
        </div>
        <div class="field" id="fAddr" hidden><label for="ckAddr">Delivery address</label><textarea id="ckAddr" autocomplete="street-address" placeholder="Tower / flat no., society, landmark">${esc(u.address)}</textarea><div class="err">Please enter your address</div></div>
        <div class="field"><label for="ckNote">Cooking note (optional)</label><input id="ckNote" placeholder="e.g. Extra spicy chutney, less oil"/></div>
        <label style="font-size:13px;font-weight:600;color:var(--ink-2);display:block;margin:4px 0 6px">Offers & coupons</label>
        <div class="group offers" id="offerBox"></div>
        <label style="font-size:13px;font-weight:600;color:var(--ink-2);display:block;margin:4px 0 6px">Payment</label>
        ${methods.map((m, i) => `<label class="pay-opt"><input type="radio" name="pay" value="${m.id}" ${i ? "" : "checked"}><span class="pay-ico">${m.ico}</span><div><b>${m.t}</b><small>${m.s}</small></div></label>`).join("")}
        <div class="group bill" style="margin-top:12px">
          <div class="row"><span>Item total (${count()} items)</span><span>${rs(subtotal())}</span></div>
          <div class="row disc" id="discRow" hidden><span id="discLabel">Coupon</span><span id="discAmt"></span></div>
          <div class="row" id="feeRow" hidden><span>Delivery fee</span><span>${rs(fee)}</span></div>
          <div class="row total"><span>To pay</span><span id="ckTotal">${rs(subtotal())}</span></div>
        </div>
        <div class="sheet-footer"><button class="btn" type="submit" id="ckGo">Place order · ${rs(subtotal())}</button></div>
      </form>`);

    const f = $("#ckForm");
    const isDelivery = () => $("input[name=otype]:checked", f).value === "Delivery";
    if (applied && couponCheck(applied)) applied = null;
    const total = () => subtotal() - discountFor(applied) + (isDelivery() ? fee : 0);
    const syncType = () => {
      $("#fAddr").hidden = !isDelivery();
      $("#feeRow").hidden = !(isDelivery() && fee);
      const d = discountFor(applied);
      $("#discRow").hidden = !d;
      if (d) { $("#discLabel").textContent = `Coupon ${applied} (${COUPONS[applied].pct}% off)`; $("#discAmt").textContent = "−" + rs(d); }
      $("#ckTotal").textContent = rs(total());
      const pm = $("input[name=pay]:checked", f)?.value;
      $("#ckGo").textContent = (pm === "cash" ? "Place order · " : "Pay · ") + rs(total());
    };
    const offerBox = $("#offerBox");
    const renderOffers = () => {
      const un = unlocked(), pe = pending();
      offerBox.innerHTML = `
        ${OFFERS.map((o) => { const code = codeFor(o.key), c = COUPONS[code] || {}; const on = applied === code;
          const verb = o.key === "instagram" ? "following" : "reviewing";
          const sub = on ? `Code ${code} applied 🎉`
            : un[o.key] ? `Unlocked! Use code <b>${code}</b>`
            : pe[o.key] ? `Done ${verb}? Tap <b>Done</b> for ${c.pct || 10}% off · <a href="${o.url}" target="_blank" rel="noopener" data-unlock="${o.key}">open again</a>`
            : `Step 1: tap ${o.cta} · Step 2: tap Done → ${c.pct || 10}% off`;
          const btn = on ? `<button type="button" class="offer-btn ghost" data-rm>Remove</button>`
            : un[o.key] ? `<button type="button" class="offer-btn" data-apply="${code}">Apply</button>`
            : pe[o.key] ? `<button type="button" class="offer-btn done" data-done="${o.key}">Done ✓</button>`
            : `<a class="offer-btn" href="${o.url}" target="_blank" rel="noopener" data-unlock="${o.key}">${o.cta}</a>`;
          return `<div class="offer${on ? " on" : ""}">${icoHtml(o.ico)}<div class="offer-txt"><b>${o.title}</b><small>${sub}</small></div>${btn}</div>`; }).join("")}
        <div class="coupon-row">
          <input id="cpInput" placeholder="Have a coupon code?" autocapitalize="characters" autocomplete="off" value="${applied && !OFFERS.some((o) => codeFor(o.key) === applied) ? applied : ""}"/>
          <button type="button" class="offer-btn" id="cpApply">Apply</button>
        </div>
        <div class="cp-msg" id="cpMsg"></div>`;
    };
    const applyCode = (raw) => {
      const code = String(raw || "").trim().toUpperCase();
      if (!code) return;
      const err = couponCheck(code);
      if (err) { renderOffers(); const m = $("#cpMsg"); m.textContent = err; m.className = "cp-msg bad"; return; }
      applied = code; renderOffers(); syncType();
      const m = $("#cpMsg"); m.textContent = `🎉 ${code} applied — you save ${rs(discountFor(code))}`; m.className = "cp-msg ok";
      if (navigator.vibrate) navigator.vibrate(20);
    };
    offerBox.addEventListener("click", (e) => {
      const un = e.target.closest("[data-unlock]");
      if (un) { // link opens Instagram / Google in a new tab; customer must come back and tap Done
        startTask(un.dataset.unlock);
        setTimeout(() => { renderOffers(); const m = $("#cpMsg"); m.textContent = `${TASK[un.dataset.unlock]}, then come back and tap Done ✓`; m.className = "cp-msg"; }, 300);
        return;
      }
      const dn = e.target.closest("[data-done]");
      if (dn) {
        const err = finishTask(dn.dataset.done);
        if (err) { const m = $("#cpMsg"); m.textContent = err; m.className = "cp-msg bad"; return; }
        toast(dn.dataset.done === "instagram" ? "Thanks for following! 💛" : "Thanks for the review! 💛");
        return applyCode(codeFor(dn.dataset.done));
      }
      const ap = e.target.closest("[data-apply]"); if (ap) return applyCode(ap.dataset.apply);
      if (e.target.closest("[data-rm]")) { applied = null; renderOffers(); syncType(); return; }
      if (e.target.closest("#cpApply")) applyCode($("#cpInput").value);
    });
    offerBox.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "cpInput") { e.preventDefault(); applyCode(e.target.value); } });
    renderOffers();
    // when the customer returns from Instagram / Google, refresh the offer cards
    const onBack = () => { if (document.visibilityState === "visible" && offerBox.isConnected) {
      const pe = pending(); if (!Object.keys(pe).length || applied) return;
      renderOffers(); const m = $("#cpMsg"); m.textContent = "Welcome back! Tap Done ✓ to get your 10% off"; m.className = "cp-msg ok"; } };
    document.addEventListener("visibilitychange", onBack);
    f.addEventListener("change", (e) => { if (e.target.id !== "cpInput") syncType(); }); syncType();
    $("#ckPhone").addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10)));
    if ($("#ckLogin")) $("#ckLogin").onclick = () => openLogin(openCheckout);

    f.onsubmit = (e) => {
      e.preventDefault();
      const name = $("#ckName").value.trim(), phone = $("#ckPhone").value.trim(), address = $("#ckAddr").value.trim();
      let ok = true;
      const mark = (id, bad) => { $(id).classList.toggle("bad", bad); if (bad) ok = false; };
      mark("#fName", !name); mark("#fPhone", !/^[6-9]\d{9}$/.test(phone)); mark("#fAddr", isDelivery() && !address);
      if (!ok) { $(".field.bad input, .field.bad textarea", f)?.focus(); return; }
      if (user) { user = { ...user, name, phone, address: address || user.address }; store.set("user", user); renderAccount(); }
      else store.set("guest", { name, phone, address });
      const order = {
        id: "FDZ-" + Date.now().toString(36).slice(-5).toUpperCase(),
        at: Date.now(), loc, name, phone, address,
        type: isDelivery() ? "Delivery" : "Pickup",
        note: $("#ckNote").value.trim(),
        pay: $("input[name=pay]:checked", f).value,
        lines: cart.map((l) => ({ ...l })),
        subtotal: subtotal(), fee: isDelivery() ? fee : 0, total: total(),
        coupon: discountFor(applied) ? applied : null, discount: discountFor(applied),
      };
      if (order.pay === "upi") openUpi(order);
      else if (order.pay === "online") payRazorpay(order);
      else { order.payStatus = "Pay at counter (cash/UPI)"; finish(order, true); }
    };
  }

  // ---------- UPI payment ----------
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function upiQuery(order) {
    const q = { pa: C.upiId, pn: C.upiName || C.brand };
    if (C.upiMerchantCode) q.mc = C.upiMerchantCode;
    Object.assign(q, { am: order.total.toFixed(2), cu: "INR", tn: `Foodeez ${order.id}` });
    return new URLSearchParams(q).toString();
  }

  function openUpi(order) {
    const q = upiQuery(order);
    const apps = [
      { n: "GPay", c: "#4285F4", t: "G", href: (isIOS ? "gpay://upi/pay?" : "tez://upi/pay?") + q },
      { n: "PhonePe", c: "#5F259F", t: "Pe", href: "phonepe://pay?" + q },
      { n: "Paytm", c: "#00BAF2", t: "P", href: "paytmmp://pay?" + q },
      { n: "Other UPI", c: "#1C1A17", t: "UPI", href: "upi://pay?" + q },
    ];
    openSheet(`
      <h2>Pay with UPI</h2>
      <p class="sub">Order ${order.id} · ${esc(P.label)}</p>
      <div class="pay-amount"><div class="amt">${rs(order.total)}</div><small>to ${esc(C.upiName)} · ${esc(C.upiId)}</small></div>
      ${isMobile ? `<div class="upi-apps">${apps.map((a) => `<a href="${a.href}"><i style="background:${a.c}">${a.t}</i>${a.n}</a>`).join("")}</div>
        <p class="hint">Tap your UPI app above — or scan the QR from another phone</p>` : `<p class="hint">Scan with any UPI app to pay</p>`}
      <div class="qr-box" id="qrBox"></div>
      <div class="field" style="margin-top:14px"><label for="utr">UPI reference / UTR no. (optional)</label><input id="utr" inputmode="numeric" placeholder="12-digit number from your UPI app"/></div>
      <div class="sheet-footer" style="flex-direction:column;align-items:stretch">
        <button class="btn wa" id="paidBtn">${waIcon()} I've paid — Send order</button>
        <button class="link" id="payLater">Pay at counter instead</button>
      </div>`, null);
    $("#qrBox").innerHTML = qrSvg("upi://pay?" + q);
    $("#paidBtn").onclick = () => {
      const utr = $("#utr").value.trim();
      order.payStatus = `UPI — customer says PAID${utr ? " (UTR " + utr + ")" : ""}. Please check your UPI app before cooking.`;
      finish(order, true);
    };
    $("#payLater").onclick = () => { order.pay = "cash"; order.payStatus = "Pay at counter (cash/UPI)"; finish(order, true); };
  }

  function qrSvg(text) {
    if (typeof qrcode !== "function") return `<p class="hint">QR unavailable offline</p>`;
    const qr = qrcode(0, "M"); qr.addData(text); qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  }

  // ---------- Razorpay (optional) ----------
  function payRazorpay(order) {
    const go = () => {
      const rzp = new window.Razorpay({
        key: C.razorpayKey,
        amount: Math.round(order.total * 100),
        currency: "INR",
        name: C.brand,
        description: `Order ${order.id}`,
        image: new URL("img/icon-192.png", location.href).href,
        prefill: { name: order.name, contact: "+91" + order.phone },
        notes: { order_id: order.id },
        theme: { color: "#1E9E4A" },
        handler: (res) => { order.payStatus = `Paid online ✅ (Razorpay ${res.razorpay_payment_id})`; finish(order, false); },
        modal: { ondismiss: () => toast("Payment cancelled") },
      });
      rzp.on("payment.failed", () => toast("Payment failed — please try again"));
      rzp.open();
    };
    if (window.Razorpay) return go();
    toast("Opening secure payment…");
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = go; s.onerror = () => toast("Couldn't load payment. Check internet.");
    document.head.appendChild(s);
  }

  // ---------- WhatsApp ----------
  function waText(o) {
    const L = [];
    L.push(`*🥟 New Order — ${o.id}*`);
    L.push(`📍 ${P.label}`);
    L.push("");
    o.lines.forEach((l, i) => {
      const meta = lineMeta(l);
      L.push(`${i + 1}. ${lineName(l)}${meta ? ` (${meta})` : ""} × ${l.qty} = ${rs(l.price * l.qty)}`);
    });
    L.push("");
    if (o.fee || o.discount) L.push(`Items: ${rs(o.subtotal)}`);
    if (o.discount) L.push(`🎁 Coupon ${o.coupon} (${COUPONS[o.coupon]?.label || "discount"}): −${rs(o.discount)}`);
    if (o.fee) L.push(`Delivery: ${rs(o.fee)}`);
    L.push(`*Total: ${rs(o.total)}*`);
    L.push(`💳 ${o.payStatus}`);
    L.push("");
    L.push(`👤 ${o.name}`);
    L.push(`📞 +91 ${o.phone}`);
    L.push(o.type === "Delivery" ? `🛵 Delivery to: ${o.address}` : "🏃 Pickup from cart");
    if (o.note) L.push(`📝 ${o.note}`);
    return L.join("\n");
  }
  const waUrl = (o) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(waText(o))}`;
  function waIcon() { return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.2 0-5.4 4.4-9.8 9.8-9.8 2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.2 0 12 0 5.4 0 .1 5.3.1 11.9c0 2.1.6 4.2 1.6 6L0 24l6.3-1.6c1.8 1 3.8 1.5 5.7 1.5 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.4z"/></svg>`; }

  function finish(order, openNow) {
    const url = waUrl(order);
    if (openNow) window.open(url, "_blank");
    const orders = store.get("orders", []); orders.unshift(order); store.set("orders", orders.slice(0, 20));
    cart = []; applied = null; saveCart();
    openSheet(`
      <div class="done">
        <div class="done-ico"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#1E9E4A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg></div>
        <h2>${openNow ? "Order ready to send!" : "Payment successful!"}</h2>
        <p class="sub">Tap <b>Send</b> in WhatsApp to confirm your order. We'll start cooking as soon as we get it. 🔥</p>
        <div class="order-id">${order.id} · ${rs(order.total)}</div>
      </div>
      <a class="btn wa full" href="${url}" target="_blank" rel="noopener">${waIcon()} ${openNow ? "Open WhatsApp again" : "Send order on WhatsApp"}</a>
      <p class="hint">WhatsApp didn't open? Call us at <a href="tel:+${C.whatsapp}">${esc(C.phoneDisplay)}</a></p>
      ${socialHtml("Loved it? Show us some love 💛")}
      <button class="btn ghost full" id="doneBtn">Back to menu</button>`);
    $("#doneBtn").onclick = closeSheet;
    maybeShowInstall(true);
  }

  function socialHtml(title) {
    if (!OFFERS.length) return "";
    return `<div class="social"><p>${title}</p><div class="social-row">${OFFERS.map((o) => `<a href="${o.url}" target="_blank" rel="noopener" data-social="${o.key}">${icoHtml(o.ico)}${o.cta}</a>`).join("")}</div></div>`;
  }

  // Follow / Review from footer or success screen also unlocks the coupon for checkout
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-social]"); if (!a) return;
    if (!unlocked()[a.dataset.social]) startTask(a.dataset.social);
    setTimeout(() => toast("After that, tap Done ✓ at checkout to get 10% off"), 400);
  });

  // ---------- Login / Account ----------
  function renderAccount() {
    $("#accountName").textContent = user ? user.name.split(" ")[0] : "Login";
    $("#heroHi").textContent = user ? `Hey ${user.name.split(" ")[0]} 👋` : "Hey there 👋";
  }
  $("#accountBtn").onclick = () => (user ? openAccount() : openLogin());

  function openLogin(after) {
    const g = store.get("guest", {});
    openSheet(`
      <h2>Login</h2>
      <p class="sub">Save your details for 1-tap checkout and see your past orders.</p>
      <form id="lgForm" novalidate>
        <div class="field" id="lName"><label for="lgName">Your name</label><input id="lgName" autocomplete="name" value="${esc(g.name)}" placeholder="e.g. Rahul Sharma"/><div class="err">Please enter your name</div></div>
        <div class="field" id="lPhone"><label for="lgPhone">Mobile number</label><div class="phone-wrap"><span>+91</span><input id="lgPhone" type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" value="${esc(g.phone)}" placeholder="10-digit number"/></div><div class="err">Enter a valid 10-digit mobile number</div></div>
        <button class="btn full" type="submit">Continue</button>
        <button class="link" type="button" id="lgSkip" style="display:block;margin:8px auto 0">Skip — continue as guest</button>
      </form>`);
    $("#lgPhone").addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10)));
    $("#lgSkip").onclick = () => (after ? after() : closeSheet());
    $("#lgForm").onsubmit = (e) => {
      e.preventDefault();
      const name = $("#lgName").value.trim(), phone = $("#lgPhone").value.trim();
      $("#lName").classList.toggle("bad", !name);
      $("#lPhone").classList.toggle("bad", !/^[6-9]\d{9}$/.test(phone));
      if (!name || !/^[6-9]\d{9}$/.test(phone)) return;
      user = { name, phone, address: g.address || "" };
      store.set("user", user); renderAccount();
      toast(`Welcome, ${name.split(" ")[0]}! 🎉`);
      after ? after() : closeSheet();
    };
  }

  function openAccount() {
    const orders = store.get("orders", []);
    openSheet(`
      <h2>Hi, ${esc(user.name)} 👋</h2>
      <p class="sub">+91 ${esc(user.phone)}</p>
      <div class="group-title" style="margin-top:4px">Your recent orders</div>
      ${orders.length ? orders.map((o, i) => `<div class="order-card">
        <div class="top"><b>${o.id}</b><span>${new Date(o.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></div>
        <p>${o.lines.map((l) => `${itemByKey[l.item].name} ×${l.qty}`).join(", ")}</p>
        <div style="display:flex;justify-content:space-between;align-items:center"><b>${rs(o.total)}</b><button class="btn-sm" data-re="${i}">Reorder</button></div>
      </div>`).join("") : `<p class="empty" style="padding:20px 0">No orders yet — go grab some momos! 🥟</p>`}
      <button class="btn ghost full" id="logout" style="margin-top:8px">Logout</button>`);
    $$("[data-re]").forEach((b) => (b.onclick = () => {
      const o = orders[+b.dataset.re];
      o.lines.forEach((l) => { const p = priceOf(l.cat, l.item); if (p == null) return;
        const price = Array.isArray(p) ? (l.plate === "Full" ? p[1] : p[0]) : p;
        addToCart({ cat: l.cat, item: l.item, plate: l.plate, dough: l.dough, price }, l.qty); });
      openCart();
    }));
    $("#logout").onclick = () => { user = null; store.del("user"); renderAccount(); closeSheet(); toast("Logged out"); };
  }

  // ---------- Chips & scrollspy ----------
  function renderChips() {
    $("#chips").innerHTML = CATEGORIES.map((c) => `<button class="chip" data-go="${c.id}"><img src="${IMG[c.id]}" alt=""/>${c.name.replace(" Momo", "")}</button>`).join("");
    $("#chips").onclick = (e) => {
      const b = e.target.closest("[data-go]"); if (!b) return;
      const sec = $("#cat-" + b.dataset.go);
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }
  let io, activeCat = null;
  function setActiveChip(id) {
    if (id === activeCat) return;
    activeCat = id;
    const strip = $("#chips");
    let chip = null;
    $$(".chip", strip).forEach((c) => { const on = c.dataset.go === id; c.classList.toggle("active", on); if (on) chip = c; });
    // slide only the chip strip sideways — never touch the page's vertical scroll
    if (chip) strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }
  function observeSections() {
    io?.disconnect();
    io = new IntersectionObserver((ents) => {
      const en = ents.filter((x) => x.isIntersecting).pop();
      if (en) setActiveChip(en.target.dataset.cat);
    }, { rootMargin: "-140px 0px -60% 0px" });
    $$(".cat").forEach((s) => io.observe(s));
  }

  // ---------- Search ----------
  let st;
  $("#searchInput").addEventListener("input", (e) => { clearTimeout(st); st = setTimeout(() => renderMenu(e.target.value), 120); });

  // ---------- Toast ----------
  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1800); }

  // ---------- Install to home screen ----------
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; maybeShowInstall(); });
  function maybeShowInstall(force) {
    if (standalone || store.get("installDismissed", 0) > Date.now() - 3 * 864e5) return;
    if (!deferredPrompt && !isIOS) return;
    if (!force && !deferredPrompt) return; // iOS: show after first order
    const bar = $("#installBar");
    if (isIOS && !deferredPrompt) { $("#installHow").textContent = "Tap Share ⬆︎ then “Add to Home Screen”"; $("#installBtn").hidden = true; }
    bar.hidden = false;
  }
  $("#installBtn").onclick = async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("#installBar").hidden = true; };
  $("#installClose").onclick = () => { $("#installBar").hidden = true; store.set("installDismissed", Date.now()); };
  if (isIOS && !standalone) setTimeout(() => maybeShowInstall(true), 15000);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // ---------- Init ----------
  $("#locLabel").textContent = `${P.label} · Sector 121`;
  $("#footAddr").textContent = C.address;
  $("#footSocial").innerHTML = socialHtml("Follow & review us — get 10% off your order");
  $("#footCall").href = "tel:+" + C.whatsapp; $("#footCall").textContent = "Call " + C.phoneDisplay;
  renderChips(); renderMenu(); renderCartBar(); renderAccount();
})();
