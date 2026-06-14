document.addEventListener('DOMContentLoaded', function () {

  /* ── Hero Slider ── */
  var slides = document.querySelectorAll('.brumi-slide');
  var dots   = document.querySelectorAll('.brumi-dot');
  var hero   = document.getElementById('brumi-hero');
  var current = 0;
  var timer;

  function goToSlide(n) {
    slides[current].classList.add('hidden');
    dots[current].classList.remove('bg-[#1a1a18]', 'w-5');
    dots[current].classList.add('bg-[#c8c8c0]', 'w-2');

    current = (n + slides.length) % slides.length;

    slides[current].classList.remove('hidden');
    dots[current].classList.remove('bg-[#c8c8c0]', 'w-2');
    dots[current].classList.add('bg-[#1a1a18]', 'w-5');

    var bg = slides[current].style.background || slides[current].dataset.bg;
    if (hero && bg) hero.style.background = bg;
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      clearInterval(timer);
      goToSlide(i);
      startTimer();
    });
  });

  function startTimer() {
    if (slides.length > 1) {
      timer = setInterval(function () { goToSlide(current + 1); }, 5000);
    }
  }
  startTimer();


  /* ── GSAP Scroll Animations ── */
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    /* Product grids */
    document.querySelectorAll('.product-grid').forEach(function (grid) {
      var cards = grid.querySelectorAll('.product-card');
      if (!cards.length) return;
      gsap.fromTo(cards,
        { opacity: 0, y: 28 },
        {
          opacity: 1, y: 0,
          stagger: 0.06,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: grid, start: 'top 82%' }
        }
      );
    });

    /* Feature panels */
    var panels = document.querySelectorAll('.feature-panel');
    if (panels.length) {
      gsap.fromTo(panels,
        { opacity: 0, y: 36 },
        {
          opacity: 1, y: 0,
          stagger: 0.12,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: panels[0].parentElement, start: 'top 80%' }
        }
      );
    }

    /* Category cards */
    var catCards = document.querySelectorAll('.category-cards-grid .group');
    if (catCards.length) {
      gsap.fromTo(catCards,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          stagger: 0.08,
          duration: 0.55,
          ease: 'power2.out',
          scrollTrigger: { trigger: catCards[0].parentElement, start: 'top 85%' }
        }
      );
    }
  }


  /* ── Add to Cart (AJAX) ── */
  document.querySelectorAll('[data-add-to-cart]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      if (!btn) return;
      var original = btn.textContent;
      btn.textContent = 'Agregado ✓';
      btn.style.background = '#5a7a40';
      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.querySelector('[name=id]').value, quantity: 1 })
      }).then(function () {
        fetch('/cart.js')
          .then(function (r) { return r.json(); })
          .then(function (cart) {
            var counters = document.querySelectorAll('.cart-count');
            counters.forEach(function (c) { c.textContent = cart.item_count; });
          });
        setTimeout(function () {
          btn.textContent = original;
          btn.style.background = '';
        }, 2000);
      });
    });
  });

});
