export function lazyLoadImages(root = document) {
  const imgs = root.querySelectorAll('img[loading="lazy"]:not([data-lazy-bound])');
  if (!("IntersectionObserver" in window)) { imgs.forEach((img) => img.classList.add("loaded")); return; }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.dataset.src) img.src = img.dataset.src;
      img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
      obs.unobserve(img);
    });
  }, { rootMargin: "200px" });
  imgs.forEach((img) => { img.dataset.lazyBound = "true"; io.observe(img); });
}
