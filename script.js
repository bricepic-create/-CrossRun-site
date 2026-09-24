const STORE_LINKS = {
  apple: '',
  google: '',
};

document.querySelectorAll('[data-store]').forEach((button) => {
  const key = button.dataset.store;
  const url = STORE_LINKS[key];
  if (!url) return;
  button.href = url;
  button.classList.remove('is-disabled');
  button.removeAttribute('aria-disabled');
  const small = button.querySelector('small');
  if (small) small.textContent = key === 'apple' ? 'Télécharger sur' : 'Disponible sur';
});

document.querySelectorAll('a[aria-disabled="true"]').forEach((button) => {
  button.addEventListener('click', (event) => event.preventDefault());
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
