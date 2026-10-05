/* ==========================================================================
   Academic AI Toolkit — site script
   ==========================================================================

   ██████████████████████████████████████████████████████████████████████
   CENTRAL CONFIGURATION — EDIT ONLY THIS BLOCK
   ██████████████████████████████████████████████████████████████████████

   GUMROAD_CHECKOUT_URL
     The official Gumroad product page URL for the Academic AI Toolkit.
     Every purchase button on every page (elements with the attribute
     data-purchase) reads this one value.

   SUPPORT_EMAIL
     Fills every element with data-support-email (link + visible text).

   GOOGLE_SHEETS_URL
     Intentionally left EMPTY. Anything placed in a front-end file is public,
     and this link opens the full prompt library. No public page uses it.
     See OWNER-NOTES.md before filling this in.
   ========================================================================== */
const SITE_CONFIG = Object.freeze({
  GUMROAD_CHECKOUT_URL: "https://academicaitoolkit.gumroad.com/l/academic-ai-toolkit",
  SUPPORT_EMAIL: "support@academicaitoolkit.com",
  GOOGLE_SHEETS_URL: ""
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

  /* --- Support email & copy ----------------------------------------------- */
  document.querySelectorAll("[data-support-email]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + SITE_CONFIG.SUPPORT_EMAIL);
    if (!el.hasAttribute("data-keep-text")) el.textContent = SITE_CONFIG.SUPPORT_EMAIL;
  });

  document.querySelectorAll("[data-copy-email]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var email = SITE_CONFIG.SUPPORT_EMAIL || "support@academicaitoolkit.com";
      var onCopied = function () {
        var tip = btn.querySelector(".support-copy-tooltip");
        if (tip) tip.textContent = "Copied!";
        btn.classList.add("is-copied");
        setTimeout(function () {
          if (tip) tip.textContent = "Copy";
          btn.classList.remove("is-copied");
        }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(onCopied).catch(function () {
          var ta = document.createElement("textarea");
          ta.value = email;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); onCopied(); } catch (err) {}
          document.body.removeChild(ta);
        });
      } else {
        var ta = document.createElement("textarea");
        ta.value = email;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); onCopied(); } catch (err) {}
        document.body.removeChild(ta);
      }
    });
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
