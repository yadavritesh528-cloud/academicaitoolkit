/* ==========================================================================
   Academic AI Toolkit — site script
   ==========================================================================

   ██████████████████████████████████████████████████████████████████████
   CENTRAL CONFIGURATION — EDIT ONLY THIS BLOCK
   ██████████████████████████████████████████████████████████████████████

   GUMROAD_CHECKOUT_URL
     Replace "#GUMROAD_CHECKOUT_URL" with your real Gumroad product/checkout
     URL (e.g. "https://yourname.gumroad.com/l/your-product").
     Every purchase button on every page (elements with the attribute
     data-purchase) reads this one value.

   SUPPORT_EMAIL
     Fills every element with data-support-email (link + visible text).

   GOOGLE_SHEETS_URL
     Intentionally left EMPTY. Anything placed in a front-end file is public,
     and this link opens the full prompt library. No public page uses it.
     See OWNER-NOTES.md before filling this in.

   TAWKTO_PROPERTY_ID / TAWKTO_WIDGET_ID
     Leave both empty to keep live chat off. To turn it on, create your
     account at tawk.to, open Administration > Channels > Chat Widget, and
     copy the two IDs from the embed snippet it gives you
     (".../<PROPERTY_ID>/<WIDGET_ID>"). Paste them below — every "Live Chat"
     button on the site (footer, Need Help section) will then open your
     Tawk.to widget automatically. No other code needs to change.
   ========================================================================== */
const SITE_CONFIG = Object.freeze({
  GUMROAD_CHECKOUT_URL: "#GUMROAD_CHECKOUT_URL",
  SUPPORT_EMAIL: "support@academicaitoolkit.com",
  GOOGLE_SHEETS_URL: "",
  TAWKTO_PROPERTY_ID: "",
  TAWKTO_WIDGET_ID: "default"
});

/* ==========================================================================
   Everything below this line reads from SITE_CONFIG. No need to edit.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  /* --- Purchase CTAs -> one central URL ---------------------------------- */
  var checkoutUrl = SITE_CONFIG.GUMROAD_CHECKOUT_URL;
  var isPlaceholder = checkoutUrl.charAt(0) === "#";
  document.querySelectorAll("[data-purchase]").forEach(function (el) {
    el.setAttribute("href", checkoutUrl);
    if (!isPlaceholder) el.setAttribute("rel", "noopener");
  });
  if (isPlaceholder && window.console) {
    console.warn("[Academic AI Toolkit] GUMROAD_CHECKOUT_URL is still a placeholder. Set it in js/script.js.");
  }

  /* --- Support email ------------------------------------------------------ */
  document.querySelectorAll("[data-support-email]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + SITE_CONFIG.SUPPORT_EMAIL);
    if (!el.hasAttribute("data-keep-text")) el.textContent = SITE_CONFIG.SUPPORT_EMAIL;
  });

  /* --- Mobile navigation -------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* --- Live chat (Tawk.to) ------------------------------------------------
     Loads the Tawk.to widget only when TAWKTO_PROPERTY_ID is filled in.
     Every element with data-live-chat opens/focuses the chat window; until
     the widget is configured, those buttons quietly do nothing instead of
     throwing an error. ------------------------------------------------- */
  var chatButtons = document.querySelectorAll("[data-live-chat]");
  if (SITE_CONFIG.TAWKTO_PROPERTY_ID) {
    var s1 = document.createElement("script");
    s1.async = true;
    s1.src = "https://embed.tawk.to/" + SITE_CONFIG.TAWKTO_PROPERTY_ID + "/" + SITE_CONFIG.TAWKTO_WIDGET_ID;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    document.body.appendChild(s1);
  } else {
    chatButtons.forEach(function (el) { el.setAttribute("data-chat-pending", "true"); });
    if (chatButtons.length && window.console) {
      console.warn("[Academic AI Toolkit] Live chat buttons are live but TAWKTO_PROPERTY_ID is not set yet — set it in js/script.js.");
    }
  }
  chatButtons.forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.Tawk_API && typeof window.Tawk_API.toggle === "function") {
        window.Tawk_API.toggle();
      }
    });
  });

  /* --- Header: soft shadow once the page has scrolled -------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* --- FAQ category filters ----------------------------------------------
     Clicking a pill shows only <details> items whose data-faq-cat matches
     (or all items, for the "All Questions" pill). Purely presentational;
     no content is removed, just hidden. */
  var faqFilters = document.querySelectorAll(".faq-filter");
  var faqItems = document.querySelectorAll("#faq-list > details");
  var faqEmpty = document.querySelector(".faq-empty");
  if (faqFilters.length && faqItems.length) {
    faqFilters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        faqFilters.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        var cat = btn.getAttribute("data-faq-filter");
        var visibleCount = 0;
        faqItems.forEach(function (item) {
          var match = cat === "all" || item.getAttribute("data-faq-cat") === cat;
          item.hidden = !match;
          if (match) visibleCount++;
        });
        if (faqEmpty) faqEmpty.hidden = visibleCount > 0;
      });
    });
  }

  /* --- Subtle reveal on scroll ------------------------------------------- */
  var items = document.querySelectorAll("[data-reveal]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!items.length) return;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });
})();
