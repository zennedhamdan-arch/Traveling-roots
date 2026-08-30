(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = document.querySelectorAll('[data-depth]');
  if (!reduce && layers.length) {
    let ticking = false;
    const move = () => {
      const y = window.scrollY;
      layers.forEach(layer => {
        const depth = Number(layer.dataset.depth);
        layer.style.transform = `translate3d(0, ${Math.min(y * depth, 90)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(move); ticking = true; }
    }, { passive: true });
  }
})();
