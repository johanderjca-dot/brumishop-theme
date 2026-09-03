/* ==========================================================================
   BrumiShop — theme.js
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;

  /* ---------- alt en la imagen de respaldo que video_tag genera dentro
     de <video> — el filtro de Liquid solo acepta "alt" en la etiqueta
     <video> (que no sirve de nada ahí), la <img> interna se queda sin
     texto alternativo ---------- */
  function initVideoFallbackAlt() {
    doc.querySelectorAll('video[alt]').forEach(function (video) {
      var img = video.querySelector('img:not([alt])');
      if (img) img.setAttribute('alt', video.getAttribute('alt'));
    });
  }

  /* ---------- video del hero: solo carga/reproduce el que se ve ----------
     cuando hay video de escritorio Y de móvil a la vez, ninguno trae
     autoplay/preload por defecto (ver video-hero.liquid) — si no,
     el navegador terminaba descargando los dos completos aunque uno
     estuviera oculto con CSS. Aquí se decide cuál activar según el
     ancho real de pantalla. */
  function initHeroVideo() {
    doc.querySelectorAll('.vhero__media').forEach(function (media) {
      var wraps = media.querySelectorAll('.vhero__video-wrap');
      if (wraps.length < 2) return;

      var mq = window.matchMedia('(max-width: 749px)');

      function sync() {
        wraps.forEach(function (wrap) {
          var video = wrap.querySelector('video');
          if (!video) return;
          var isMobileWrap = wrap.classList.contains('vhero__video-wrap--mobile');
          var shouldPlay = isMobileWrap ? mq.matches : !mq.matches;
          if (shouldPlay) {
            if (video.preload !== 'auto') {
              video.preload = 'auto';
              // en preload="none" nada se descarga hasta llamar load()
              // explícitamente — cambiar el atributo solo no alcanza,
              // sobre todo en Safari.
              video.load();
            }
            if (video.paused) video.play().catch(function () {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      }

      sync();
      mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    });
  }

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
      // recién cargada la página (scroll 0): video nítido, sin blur.
      // el vidrio esmerilado solo entra al empezar a deslizar.
      wrap.classList.toggle('at-top', y <= 0);
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

  /* ---------- panel de búsqueda en vivo (sin ir a otra página) ---------- */
  function initSearch() {
    var overlay = doc.querySelector('[data-search]');
    if (!overlay) return;

    var input = overlay.querySelector('[data-search-input]');
    var results = overlay.querySelector('[data-search-results]');
    var predictiveUrl = overlay.getAttribute('data-predictive-url');
    var lastQuery = '';
    var debounceTimer = null;
    var activeRequest = null;

    function open() {
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
      doc.body.style.overflow = 'hidden';
      setTimeout(function () { input.focus(); }, 50);
    }
    function close() {
      overlay.classList.remove('is-open');
      doc.body.style.overflow = '';
      setTimeout(function () { overlay.hidden = true; }, 280);
    }

    function money(cents) {
      if (typeof cents !== 'number') return '';
      return (cents / 100).toLocaleString(doc.documentElement.lang || 'es', {
        style: 'currency', currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'USD'
      });
    }

    function render(products, query) {
      if (!products.length) {
        results.innerHTML = '<p class="search-overlay__hint">No encontramos resultados para &ldquo;' + query + '&rdquo;.</p>';
        return;
      }
      var html = '<div class="search-overlay__list">';
      products.forEach(function (p) {
        var price = p.price != null ? p.price : (typeof p.price_min === 'number' ? money(p.price_min) : '');
        html += '<a class="search-overlay__item" href="' + p.url + '">' +
          (p.image ? '<img src="' + p.image + '" alt="" loading="lazy">' : '') +
          '<span class="search-overlay__item-info">' +
            '<span class="search-overlay__item-title">' + p.title + '</span>' +
            (price ? '<span class="search-overlay__item-price">' + price + '</span>' : '') +
          '</span>' +
        '</a>';
      });
      html += '</div>';
      html += '<a class="search-overlay__viewall" href="' + overlay.querySelector('form').action + '?q=' + encodeURIComponent(query) + '">Ver todos los resultados</a>';
      results.innerHTML = html;
    }

    function search(query) {
      if (!predictiveUrl) return;
      if (activeRequest) activeRequest.abort();
      var controller = ('AbortController' in window) ? new AbortController() : null;
      activeRequest = controller;

      fetch(predictiveUrl + '?q=' + encodeURIComponent(query) + '&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last',
        { signal: controller && controller.signal, headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          activeRequest = null;
          var products = (data.resources && data.resources.results && data.resources.results.products) || [];
          render(products, query);
        })
        .catch(function () { /* búsqueda cancelada o de red: no hacer nada */ });
    }

    input.addEventListener('input', function () {
      var query = input.value.trim();
      clearTimeout(debounceTimer);
      if (query === lastQuery) return;
      if (query.length < 2) {
        results.innerHTML = '';
        lastQuery = query;
        return;
      }
      debounceTimer = setTimeout(function () {
        lastQuery = query;
        search(query);
      }, 250);
    });

    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-search-open]')) { e.preventDefault(); open(); }
      else if (e.target.closest('[data-search-close]')) { e.preventDefault(); close(); }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) close();
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

    var thumbList = Array.prototype.slice.call(thumbs);
    var index = 0;

    function show(i) {
      index = ((i % thumbList.length) + thumbList.length) % thumbList.length;
      var btn = thumbList[index];
      main.src = btn.getAttribute('data-thumb');
      main.removeAttribute('srcset');
      thumbList.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
    }

    thumbList.forEach(function (btn, i) {
      if (i === 0) btn.classList.add('is-active');
      btn.addEventListener('click', function () { show(i); });
    });

    var prev = doc.querySelector('[data-gallery-prev]');
    var next = doc.querySelector('[data-gallery-next]');
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (next) next.addEventListener('click', function () { show(index + 1); });
  }

  /* ---------- producto: pills de variantes ---------- */
  function initVariantPills() {
    doc.querySelectorAll('.product__option-pills').forEach(function (group) {
      var inputs = group.querySelectorAll('input[type="radio"]');
      inputs.forEach(function (input) {
        input.addEventListener('change', function () {
          group.querySelectorAll('.product__pill').forEach(function (p) { p.classList.remove('is-active'); });
          input.closest('.product__pill').classList.add('is-active');
        });
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
      // sube hasta la caja de compra (donde vive el botón real de
      // Releasit/checkout), en vez de intentar simular un clic sobre
      // el botón de la app, que no siempre se puede detectar
      var target = doc.querySelector('.product__purchase-card') || anchor;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- carrusel de categorías (loop infinito) ---------- */
  function initCarousels() {
    doc.querySelectorAll('[data-tiles-carousel]').forEach(function (root) {
      var track = root.querySelector('[data-tiles-track]');
      var prev = root.querySelector('[data-tiles-prev]');
      var next = root.querySelector('[data-tiles-next]');
      var progress = root.querySelector('[data-tiles-progress]');
      if (!track || track.dataset.loopReady) return;

      var originals = Array.prototype.slice.call(track.children);
      var loopWidth = 0;

      // clona las tarjetas y las pone antes/después de las reales, así
      // siempre hay contenido hacia donde deslizar en ambas direcciones
      if (originals.length > 1) {
        function cloneSet() {
          return originals.map(function (el) {
            var clone = el.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            // el propio nodo clonado puede ser el foco (p. ej. <a class="tile">),
            // no solo sus descendientes — querySelectorAll no se incluye a sí mismo
            var focusable = clone.querySelectorAll('a, button, input, select, textarea');
            if (clone.matches('a, button, input, select, textarea')) {
              focusable = Array.prototype.slice.call(focusable).concat([clone]);
            }
            focusable.forEach(function (f) { f.setAttribute('tabindex', '-1'); });
            return clone;
          });
        }

        var firstOriginal = track.firstElementChild;
        cloneSet().forEach(function (el) { track.insertBefore(el, firstOriginal); });
        cloneSet().forEach(function (el) { track.appendChild(el); });
        track.dataset.loopReady = 'true';
      }

      // recalcula el ancho de "una vuelta" (cambia con el tamaño de
      // pantalla, porque el ancho de cada tarjeta también cambia)
      function remeasure() {
        if (!originals.length || originals.length < 2) return;
        var w = firstOriginal.offsetLeft - track.firstElementChild.offsetLeft;
        if (w > 10) {
          loopWidth = w;
          track.scrollLeft = loopWidth + (track.scrollLeft % loopWidth || 0);
        } else {
          loopWidth = 0;
        }
      }

      function step() {
        var first = track.querySelector('.tile');
        if (!first) return track.clientWidth * 0.8;
        var style = getComputedStyle(track);
        var gap = parseFloat(style.columnGap || style.gap || 0) || 0;
        return first.getBoundingClientRect().width + gap;
      }

      // si el scroll entró en la zona clonada, lo reubica sin animación
      // en el punto equivalente del tramo real — invisible para el usuario
      function loopCheck() {
        if (!loopWidth) return;
        if (track.scrollLeft < loopWidth * 0.5) {
          track.scrollLeft += loopWidth;
        } else if (track.scrollLeft > loopWidth * 1.5) {
          track.scrollLeft -= loopWidth;
        }
      }

      function update() {
        loopCheck();

        if (prev) prev.disabled = false;
        if (next) next.disabled = false;

        if (progress) {
          if (loopWidth) {
            var pos = track.scrollLeft - loopWidth;
            var scrollable = Math.max(loopWidth - track.clientWidth, 1);
            var visible = Math.min(1, track.clientWidth / loopWidth);
            var thumb = Math.max(visible * 100, 10);
            var traveled = Math.min(Math.max(pos / scrollable, 0), 1);
            progress.style.width = thumb + '%';
            progress.style.left = (traveled * (100 - thumb)) + '%';
          } else {
            var totalScrollable = track.scrollWidth - track.clientWidth;
            var visibleFrac = Math.min(1, track.clientWidth / track.scrollWidth);
            var thumbFrac = Math.max(visibleFrac * 100, 10);
            var traveledFrac = totalScrollable > 0 ? track.scrollLeft / totalScrollable : 0;
            progress.style.width = thumbFrac + '%';
            progress.style.left = (traveledFrac * (100 - thumbFrac)) + '%';
          }
        }
      }
      var ticking = false;
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', function () {
        if (!ticking) { window.requestAnimationFrame(function () { update(); ticking = false; }); ticking = true; }
      }, { passive: true });
      window.addEventListener('resize', function () { remeasure(); update(); });

      remeasure();
      update();
    });
  }

  /* ---------- contador del carrito ---------- */
  function initCartCount() {
    doc.querySelectorAll('[data-cart-count]').forEach(function (el) {
      if (el.textContent.trim() === '0') el.setAttribute('data-empty', 'true');
    });
  }

  /* ---------- vitrina de productos: producto + imagen/titular sincronizados ---------- */
  function initSpotlight() {
    doc.querySelectorAll('[data-spotlight]').forEach(function (root) {
      if (root.dataset.spotReady) return;
      root.dataset.spotReady = 'true';

      var left = root.querySelector('[data-spot-left]');
      var track = root.querySelector('[data-spot-slides]');
      var slides = Array.prototype.slice.call(root.querySelectorAll('[data-spot-slide]'));
      var rightSlides = Array.prototype.slice.call(root.querySelectorAll('[data-spot-right-slide]'));
      var dots = Array.prototype.slice.call(root.querySelectorAll('[data-spot-dot]'));
      var prevBtn = root.querySelector('[data-spot-prev]');
      var nextBtn = root.querySelector('[data-spot-next]');
      if (!slides.length) return;

      var index = 0;

      function apply() {
        slides.forEach(function (s, n) { s.classList.toggle('is-active', n === index); });
        rightSlides.forEach(function (s, n) { s.classList.toggle('is-active', n === index); });
        dots.forEach(function (d, n) { d.classList.toggle('is-active', n === index); });
        if (left) left.style.backgroundColor = slides[index].getAttribute('data-bg') || '';
      }

      function go(i) {
        index = ((i % slides.length) + slides.length) % slides.length;
        // Safari a veces no anima/repinta un cambio de clase disparado
        // sincrónicamente desde un evento touch — el texto se queda
        // mezclado con el de la diapositiva anterior por un buen rato.
        // Doble requestAnimationFrame es el arreglo estándar: deja que
        // el navegador pinte el estado actual una vez antes de aplicar
        // el cambio, así el cambio sí dispara la transición.
        requestAnimationFrame(function () {
          requestAnimationFrame(apply);
        });
      }

      dots.forEach(function (d, n) {
        d.addEventListener('click', function () { go(n); });
      });
      if (prevBtn) prevBtn.addEventListener('click', function () { go(index - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { go(index + 1); });

      if (track) {
        var startX = null;
        track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
        track.addEventListener('touchend', function (e) {
          if (startX === null) return;
          var dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
          startX = null;
        }, { passive: true });
      }

      go(0);
    });
  }

  /* ---------- carrusel de reseñas: la tarjeta más cercana al centro se enfoca ---------- */
  function initReviews() {
    doc.querySelectorAll('[data-reviews]').forEach(function (root) {
      var track = root.querySelector('[data-reviews-track]');
      var originals = Array.prototype.slice.call(root.querySelectorAll('[data-review]'));
      var prev = root.querySelector('[data-reviews-prev]');
      var next = root.querySelector('[data-reviews-next]');
      var dots = Array.prototype.slice.call(root.querySelectorAll('[data-reviews-dot]'));
      if (!track || !originals.length) return;

      var n = originals.length;
      var loopWidth = 0;

      // clona las reseñas y las pone antes/después de las reales, así
      // el carrusel siempre tiene contenido hacia donde deslizar en
      // ambas direcciones y el loop se siente infinito (misma técnica
      // que el carrusel de categorías)
      if (n > 1) {
        function cloneSet() {
          return originals.map(function (el) {
            var clone = el.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            // el propio nodo clonado puede ser el foco (p. ej. <a class="tile">),
            // no solo sus descendientes — querySelectorAll no se incluye a sí mismo
            var focusable = clone.querySelectorAll('a, button, input, select, textarea');
            if (clone.matches('a, button, input, select, textarea')) {
              focusable = Array.prototype.slice.call(focusable).concat([clone]);
            }
            focusable.forEach(function (f) { f.setAttribute('tabindex', '-1'); });
            return clone;
          });
        }
        var firstOriginal = track.firstElementChild;
        cloneSet().forEach(function (el) { track.insertBefore(el, firstOriginal); });
        cloneSet().forEach(function (el) { track.appendChild(el); });
      }

      function step() {
        var style = getComputedStyle(track);
        var gap = parseFloat(style.columnGap || style.gap || 0) || 0;
        return originals[0].getBoundingClientRect().width + gap;
      }

      function remeasure() {
        if (n < 2) return;
        var w = step() * n;
        if (w > 10) {
          loopWidth = w;
          track.scrollLeft = loopWidth + (track.scrollLeft % loopWidth || 0);
        } else {
          loopWidth = 0;
        }
      }

      // si el scroll entró en la zona clonada, lo reubica sin animación
      // en el punto equivalente del tramo real — invisible para el usuario
      function loopCheck() {
        if (!loopWidth) return;
        if (track.scrollLeft < loopWidth * 0.5) {
          track.scrollLeft += loopWidth;
        } else if (track.scrollLeft > loopWidth * 1.5) {
          track.scrollLeft -= loopWidth;
        }
      }

      function currentIndex() {
        if (!loopWidth) {
          var trackRect = track.getBoundingClientRect();
          var center = trackRect.left + trackRect.width / 2;
          var best = 0, bestDist = Infinity;
          originals.forEach(function (card, i) {
            var r = card.getBoundingClientRect();
            var dist = Math.abs((r.left + r.width / 2) - center);
            if (dist < bestDist) { bestDist = dist; best = i; }
          });
          return best;
        }
        var logicalPos = ((track.scrollLeft % loopWidth) + loopWidth) % loopWidth;
        return Math.round(logicalPos / step()) % n;
      }

      var ticking = false;
      function update() {
        loopCheck();
        var idx = currentIndex();
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
      }

      function goTo(i) {
        track.scrollBy({ left: (i - currentIndex()) * step(), behavior: 'smooth' });
      }

      dots.forEach(function (d, i) { d.addEventListener('click', function () { goTo(i); }); });
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });

      track.addEventListener('scroll', function () {
        if (!ticking) { window.requestAnimationFrame(function () { update(); ticking = false; }); ticking = true; }
      }, { passive: true });
      window.addEventListener('resize', function () { remeasure(); update(); });

      remeasure();
      update();
    });
  }

  /* ---------- colección: orden y filtros ---------- */
  function initCollectionToolbar() {
    var sortSelect = doc.querySelector('[data-sort-select]');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () { sortSelect.form.submit(); });
    }

    var toggle = doc.querySelector('[data-filters-toggle]');
    var panel = doc.querySelector('[data-filters-panel]');
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        panel.hidden = !panel.hidden;
        toggle.classList.toggle('is-active', !panel.hidden);
      });
    }
  }

  /* ---------- números que cuentan al entrar en pantalla ---------- */
  function initStatBarCount() {
    var bars = doc.querySelectorAll('[data-stat-bar]');
    if (!bars.length) return;

    function animateNumber(el) {
      var target = el.getAttribute('data-count-target') || '';
      var match = target.match(/^([\d.,]*\d)(.*)$/);
      if (!match) { el.textContent = target; return; }

      var numStr = match[1];
      var suffix = match[2];
      var hasCommas = numStr.indexOf(',') !== -1;
      var cleanNum = numStr.replace(/,/g, '');
      var decimals = cleanNum.indexOf('.') !== -1 ? cleanNum.split('.')[1].length : 0;
      var endValue = parseFloat(cleanNum);
      if (isNaN(endValue)) { el.textContent = target; return; }

      var duration = 1400;
      var start = null;

      function format(value) {
        var fixed = value.toFixed(decimals);
        if (hasCommas) {
          var parts = fixed.split('.');
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          fixed = parts.join('.');
        }
        return fixed + suffix;
      }

      function step(timestamp) {
        if (start === null) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = format(endValue * eased);
        if (progress < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var numbers = entry.target.querySelectorAll('[data-stat-number]');
        numbers.forEach(animateNumber);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    bars.forEach(function (bar) { observer.observe(bar); });
  }

  /* ---------- arranque ---------- */
  function boot() {
    initVideoFallbackAlt();
    initHeroVideo();
    initHeader();
    initDrawer();
    initSearch();
    initDropdowns();
    initGallery();
    initVariantPills();
    initStickyBuy();
    initCartCount();
    initCarousels();
    initSpotlight();
    initReviews();
    initCollectionToolbar();
    initStatBarCount();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  // el editor de temas recarga secciones sin recargar la página
  doc.addEventListener('shopify:section:load', boot);
  doc.addEventListener('shopify:section:select', boot);
})();
