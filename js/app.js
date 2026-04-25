document.addEventListener('DOMContentLoaded', () => {
  const progressBar = document.getElementById('progressBar');

  function updateProgress() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const progress = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const form = document.querySelector('form[data-netlify]');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const defaultLabel = submitBtn?.dataset.defaultLabel || submitBtn?.textContent || 'Submit';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      try {
        const body = new URLSearchParams(new FormData(form)).toString();
        await fetch(form.action || '/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        alert('Thanks — your message was sent. I will reply within 1 business day.');
        form.reset();
      } catch (err) {
        alert('Submission failed. Please try again, or email joe.digitalarchitect@gmail.com directly.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = defaultLabel;
        }
      }
    });
  }
});
