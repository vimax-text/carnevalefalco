(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#form-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const year = document.querySelector('#year');

  if (year) year.textContent = String(new Date().getFullYear());
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const closeMenu = () => {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri il menu');
    nav.classList.remove('open');
    document.body.classList.remove('menu-open');
  };
  toggle?.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Apri il menu' : 'Chiudi il menu');
    nav?.classList.toggle('open', !isOpen);
    document.body.classList.toggle('menu-open', !isOpen);
    if (!isOpen) nav?.querySelector('a')?.focus();
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const fields = {
    name: document.querySelector('#name'),
    surname: document.querySelector('#surname'),
    className: document.querySelector('#class-name'),
  };
  const errors = {
    name: document.querySelector('#name-error'),
    surname: document.querySelector('#surname-error'),
    className: document.querySelector('#class-error'),
  };
  const config = window.GCF_SUPABASE_CONFIG || {};
  const backend = config.url && config.anonKey && window.supabase?.createClient
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

  const showMessage = (element, message, kind = 'error') => {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status${message ? ` ${kind}` : ''}`;
  };
  const setError = (key, message) => {
    fields[key]?.setAttribute('aria-invalid', String(Boolean(message)));
    if (errors[key]) errors[key].textContent = message;
  };
  const describeError = (error) => {
    const message = error?.message || '';
    if (/failed to fetch|network/i.test(message)) return 'Connessione al servizio non riuscita. Controlla la connessione e riprova.';
    return message || 'Si è verificato un errore. Riprova tra poco.';
  };

  if (!backend) {
    showMessage(status, 'Iscrizioni online non configurate: l’organizzatore deve impostare il servizio Supabase.');
  }

  if (form && status) {
    form.addEventListener('input', (event) => {
      const key = event.target.name;
      if (key in errors) {
        setError(key, '');
        showMessage(status, '');
      }
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showMessage(status, '');
      const name = fields.name.value.trim();
      const surname = fields.surname.value.trim();
      const className = fields.className.value.trim();
      let firstInvalid = null;
      const validate = (key, value, label) => {
        const message = value ? '' : `Inserisci ${label}.`;
        setError(key, message);
        if (message && !firstInvalid) firstInvalid = fields[key];
      };
      validate('name', name, 'il nome');
      validate('surname', surname, 'il cognome');
      validate('className', className, 'la classe');
      if (firstInvalid) {
        showMessage(status, 'Controlla i campi evidenziati e riprova.');
        firstInvalid.focus();
        return;
      }
      if (!backend) {
        showMessage(status, 'Prima di raccogliere iscrizioni, l’organizzatore deve configurare il servizio online.');
        return;
      }

      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const { error } = await backend.from('registrations').insert({
          name,
          surname,
          class_name: className,
        });
        if (error) throw error;
        form.reset();
        Object.keys(errors).forEach((key) => setError(key, ''));
        showMessage(status, 'Iscrizione inviata! Grazie per esserti registrato.', 'success');
      } catch (error) {
        showMessage(status, describeError(error));
      } finally {
        button.disabled = false;
      }
    });
  }

  const adminAccessEnabled = new URLSearchParams(window.location.search).get('admin') === '1';
  const adminSection = document.querySelector('#gestione');
  if (adminSection) {
    adminSection.hidden = !adminAccessEnabled;
    if (adminAccessEnabled) requestAnimationFrame(() => adminSection.scrollIntoView({ block: 'start' }));
  }
})();
