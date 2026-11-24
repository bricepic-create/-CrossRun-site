const demoButton = document.getElementById('demo-action');
const demoTitle = document.getElementById('demo-title');
const demoText = document.getElementById('demo-text');
const chat = document.getElementById('demo-chat');
const buttonLabel = demoButton.querySelector('span');
const demoSteps = [
  { title: demoTitle.textContent, text: demoText.textContent, action: buttonLabel.textContent },
  { title: 'Wave envoyé !', text: 'En attente de la réponse de Lina…', action: 'Simuler l’accord de Lina' },
  { title: 'Wave accepté !', text: 'Lina a accepté ton Wave.', action: 'Rejouer la démo' }
];
let demoStep = 0;
demoButton.hidden = false;
demoButton.addEventListener('click', () => {
  demoStep = (demoStep + 1) % demoSteps.length;
  const state = demoSteps[demoStep];
  demoTitle.textContent = state.title;
  demoText.textContent = state.text;
  buttonLabel.textContent = state.action;
  demoButton.querySelector('svg').style.display = demoStep === 0 ? '' : 'none';
  chat.hidden = demoStep !== 2;
  document.getElementById('wave').classList.toggle('in-chat', demoStep === 2);
});

const lightbox = document.getElementById('lightbox');
if (typeof lightbox.showModal === 'function') {
  const largeImage = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  for (const link of document.querySelectorAll('a.zoom')) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      largeImage.src = link.href;
      largeImage.alt = link.querySelector('img').alt;
      caption.textContent = link.dataset.caption;
      lightbox.showModal();
    });
  }
  lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => {
    if (event.target !== lightbox) return;
    const bounds = lightbox.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close();
  });
}

/* Enhance only when supported; the map is fully visible without JavaScript. */
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const artDemo = document.querySelector('.art-demo');
  if (artDemo) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-entering');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.3 });
    observer.observe(artDemo);
  }
}
