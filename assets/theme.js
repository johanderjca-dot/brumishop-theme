/* ==========================================================================
   BrumiShop — theme.js
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;

  /* ---------- encabezado: transparente -> sólido al bajar ---------- */
  function initHeader() {
    var header = doc.querySelector('[data-header]');
    if (!header) return;

    var threshold = 40;
    var ticking = false;

    function update() {
      header.classList.toggle('is-stuck', window.scrollY > threshold);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    // Si el header es transparente pero la primera sección NO es el video,
    // hay que empujar el contenido para que no quede debajo del header.
    if (doc.body.classList.contains('header-transparent')) {
      var main = doc.getElementById('MainContent');
      var first = main && main.firstElementChild;
      var spacer = doc.querySelector('.header-spacer');
      if (spacer && (!first || !first.querySelector('.vhero'))) {
        spacer.style.height = 'var(--header-h)';
      }
    }
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
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  // el editor de temas recarga secciones sin recargar la página
  doc.addEventListener('shopify:section:load', boot);
  doc.addEventListener('shopify:section:select', boot);
})();
