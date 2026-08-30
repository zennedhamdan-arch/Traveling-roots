(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = document.querySelectorAll('[data-depth]');
  if (!reduced && layers.length) {
    let ticking = false;
    const parallax = () => { const y = window.scrollY; layers.forEach(el => { el.style.transform = `translate3d(0,${Math.min(y * Number(el.dataset.depth), 75)}px,0) rotate(-3deg)`; }); ticking = false; };
    window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(parallax); ticking = true; } }, {passive:true});
  }
  document.querySelectorAll('.tabs button').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
  }));
})();
