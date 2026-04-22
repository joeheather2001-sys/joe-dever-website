// Simple client-side router and form handling
document.addEventListener('DOMContentLoaded', () => {
  // Smooth nav for internal links
  document.querySelectorAll('a[href^="index.html"],a[href^="services.html"],a[href^="contact.html"],a[href^="about.html"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const url = a.href;
      fetch(url).then(r => r.text()).then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        document.querySelector('main').outerHTML = doc.querySelector('main').outerHTML;
        history.pushState(null, '', url);
      }).catch(() => (document.location = url));
    });
  });
  window.addEventListener('popstate', () => location.reload());

  // Form enhanced submit
  const form = document.querySelector('form[data-netlify]');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        const formData = new FormData(form);
        const params = new URLSearchParams(formData);
        await fetch(form.action || '/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params });
        alert('Thanks — we’ll be in touch shortly!');
        form.reset();
      } catch (err) {
        alert('Something went wrong — please try again.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    });
  }
});
