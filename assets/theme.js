/* ==========================================================================
   BrumiShop — theme.js
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;

  /* ---------- encabezado: banner + nav, glass al bajar, se oculta al deslizar ---------- */
  function initHeader() {
    var wrap = doc.querySelector('[data-site-header]');
    if (!wrap) return;

    var spacer = doc.querySelector('.header-spacer');
    var hideAt = 24; // no ocultar hasta pasar la altura del propio bloque

    // en la portada con header transparente, "is-stuck" no debe activarse
    // apenas se mueve el scroll: hay que esperar a que el video del hero
    // realmente haya desaparecido detrás del header.
    var hero = doc.body.classList.contains('header-transparent') ? doc.querySelector('.vhero') : null;

    function setSpacer() {
      var h = wrap.offsetHeight;
      doc.documentElement.style.setProperty('--header-total-h', h + 'px');

      if (!spacer) return;
      var main = doc.getElementById('MainContent');
      var first = main && main.firstElementChild;
      var heroFirst = doc.body.classList.contains('header-transparent') && first && first.querySelector('.vhero');
      spacer.style.height = heroFirst ? '0px' : h + 'px';
    }

    var lastY = window.scrollY;
    var ticking = false;

    function update() {
      var y = window.scrollY;
      var stuck = hero ? (hero.getBoundingClientRect().bottom <= wrap.offsetHeight) : (y > 4);
      wrap.classList.toggle('is-stuck', stuck);
      if (y > lastY && y > hideAt) {
        wrap.classList.add('site-header--hidden');
      } else {
        wrap.classList.remove('site-header--hidden');
      }
      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', setSpacer);
    doc.addEventListener('shopify:section:load', setSpacer);

    setSpacer();
    update();
  }

  /* ---------- cajón de navegación móvil ---------- */
  function initDrawer() {
    var drawer = doc.querySelector('[data-drawer]');
    if (!drawer) return;

    function open() {
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
      doc.body.style.overflow = 'hidden';
    }
    function close() {
      drawer.classList.remove('is-open');
      doc.body.style.overflow = '';
      setTimeout(function () { drawer.hidden = true; }, 280);
    }

    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-drawer-open]')) { e.preventDefault(); open(); }
      else if (e.target.closest('[data-drawer-close]')) { e.preventDefault(); close(); }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) close();
    });
  }

  /* ---------- cerrar los menús desplegables al hacer clic fuera ---------- */
  function initDropdowns() {
    doc.addEventListener('click', function (e) {
      doc.querySelectorAll('.header__dropdown[open]').forEach(function (d) {
        if (!d.contains(e.target)) d.removeAttribute('open');
      });
    });
  }

  /* ---------- galería del producto ---------- */
  function initGallery() {
    var main = doc.getElementById('ProductMainImage');
    var thumbs = doc.querySelectorAll('[data-thumb]');
    if (!main || !thumbs.length) return;

    thumbs.forEach(function (btn, i) {
      if (i === 0) btn.classList.add('is-active');
      btn.addEventListener('click', function () {
        main.src = btn.getAttribute('data-thumb');
        main.removeAttribute('srcset');
        thumbs.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
      });
    });
  }

  /* ---------- barra fija de compra ---------- */
  function initStickyBuy() {
    var bar = doc.querySelector('[data-sticky-buy]');
    if (!bar) return;

    var anchor = doc.querySelector('.product__info');
    if (!anchor) return;

    bar.hidden = false;

    function update() {
      var r = anchor.getBoundingClientRect();
      var passed = r.bottom < window.innerHeight * 0.5;
      var notYet = r.top > window.innerHeight * 0.9;
      bar.classList.toggle('is-visible', passed || (!notYet && r.top < 0));
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    var cta = bar.querySelector('[data-sticky-cta]');
    if (!cta) return;

    cta.addEventListener('click', function () {
      // 1) si Releasit (u otra app) puso su botón, lo usamos
      var appBtn = doc.querySelector('.product__block--app button, .product__block--app a[href], [id*="releasit"] button, .rsit-button');
      if (appBtn) { appBtn.click(); return; }

      // 2) si no, enviamos el formulario nativo
      var form = doc.getElementById('ProductForm');
      if (form) { form.requestSubmit ? form.requestSubmit() : form.submit(); return; }

      // 3) último recurso: subir hasta la zona de compra
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---------- carrusel de categorías ---------- */
  function initCarousels() {
    doc.querySelectorAll('[data-tiles-carousel]').forEach(function (root) {
      var track = root.querySelector('[data-tiles-track]');
      var prev = root.querySelector('[data-tiles-prev]');
      var next = root.querySelector('[data-tiles-next]');
      if (!track) return;

      function step() {
        var first = track.querySelector('.tile');
        if (!first) return track.clientWidth * 0.8;
        var style = getComputedStyle(track);
        var gap = parseFloat(style.columnGap || style.gap || 0) || 0;
        return first.getBoundingClientRect().width + gap;
      }
      function update() {
        if (!prev || !next) return;
        prev.disabled = track.scrollLeft < 8;
        next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8;
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ---------- contador del carrito ---------- */
  function initCartCount() {
    doc.querySelectorAll('[data-cart-count]').forEach(function (el) {
      if (el.textContent.trim() === '0') el.setAttribute('data-empty', 'true');
    });
  }

  /* ---------- arranque ---------- */
  function boot() {
    initHeader();
    initDrawer();
    initDropdowns();
    initGallery();
    initStickyBuy();
    initCartCount();
    initCarousels();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  // el editor de temas recarga secciones sin recargar la página
  doc.addEventListener('shopify:section:load', boot);
  doc.addEventListener('shopify:section:select', boot);
})();
