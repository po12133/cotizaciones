/*
 * Encabezado, pie y comportamiento común de las páginas públicas.
 * Cada página declara <body data-page="..."> y opcionalmente data-hero="1" si inicia con hero oscuro.
 */
(function (root) {
  const WAB = root.WAB;
  const { icon } = WAB;
  const C = WAB.CONFIG;

  const LINKS = [
    { id: 'inicio', href: 'index.html', label: 'Inicio' },
    { id: 'modulos', href: 'modulos.html', label: 'Módulos' },
    { id: 'prototipos', href: 'prototipos/index.html', label: 'Prototipos' },
    { id: 'planes', href: 'planes.html', label: 'Planes' },
    { id: 'cotizador', href: 'cotizador.html', label: 'Cotizador' }
  ];

  function brandHTML(href = 'index.html') {
    return `<a class="brand" href="${href}" aria-label="${C.empresa.nombre} — inicio">
      <span class="brand-mark">${icon('message')}</span>
      <span class="brand-text">${C.empresa.producto}<small>por ${C.empresa.nombre}</small></span>
    </a>`;
  }

  function mountHeader() {
    const page = document.body.dataset.page;
    const header = document.createElement('header');
    header.className = 'site-header' + (document.body.dataset.hero ? ' on-hero' : '');
    header.innerHTML = `<div class="container">
      ${brandHTML()}
      <nav class="site-nav" aria-label="Principal">
        ${LINKS.map((l) => `<a href="${l.href}"${l.id === page ? ' class="active" aria-current="page"' : ''}>${l.label}</a>`).join('')}
      </nav>
      <div class="header-actions">
        <button class="btn btn-ghost btn-icon" data-theme-toggle aria-label="Cambiar tema">${icon(WAB.ui.currentTheme() === 'dark' ? 'sun' : 'moon')}</button>
        <a class="btn btn-primary btn-sm header-cta" href="cotizador.html">${icon('file', 'sm')}Crear cotización</a>
        <button class="btn btn-ghost btn-icon nav-toggle" aria-label="Abrir menú" aria-expanded="false">${icon('menu')}</button>
      </div>
    </div>`;
    document.body.prepend(header);

    const toggle = header.querySelector('.nav-toggle');
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = icon(open ? 'x' : 'menu');
    });
    header.querySelector('[data-theme-toggle]').addEventListener('click', (e) => {
      const t = WAB.ui.toggleTheme();
      e.currentTarget.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
    });
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function mountFooter() {
    const f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML = `<div class="container">
      <div class="footer-grid">
        <div>
          ${brandHTML()}
          <p class="small mt-2" style="max-width:38ch">Plataforma de automatización comercial sobre WhatsApp Business: atención, citas, ventas y CRM en un solo panel.</p>
        </div>
        <div><h4>Producto</h4><ul>
          <li><a href="modulos.html">Módulos</a></li>
          <li><a href="planes.html">Planes</a></li>
          <li><a href="cotizador.html">Cotizador</a></li>
        </ul></div>
        <div><h4>Demostración</h4><ul>
          <li><a href="prototipos/index.html">Todos los prototipos</a></li>
          <li><a href="prototipos/whatsapp.html">Simulador de WhatsApp</a></li>
          <li><a href="prototipos/dashboard.html">Panel administrativo</a></li>
        </ul></div>
        <div><h4>Contacto</h4><ul>
          <li><a href="mailto:${C.empresa.correo}">${C.empresa.correo}</a></li>
          <li><a href="https://wa.me/${C.empresa.whatsapp}" target="_blank" rel="noopener">${C.empresa.telefono}</a></li>
          <li><a href="https://${C.empresa.sitio}" target="_blank" rel="noopener">${C.empresa.sitio}</a></li>
        </ul></div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${C.empresa.nombre}. Importes referenciales en bolivianos (Bs).</span>
        <span>${C.notaPrototipos.split('.')[0]}.</span>
      </div>
    </div>`;
    document.body.appendChild(f);
  }

  /** Aparición discreta al hacer scroll (listener de scroll para funcionar también en headless). */
  function initReveal() {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!els.length) return;
    const check = () => {
      const h = window.innerHeight;
      els.forEach((el) => {
        if (!el.classList.contains('in') && el.getBoundingClientRect().top < h - 40) el.classList.add('in');
      });
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
    setTimeout(() => els.forEach((el) => el.classList.add('in')), 2500);
  }

  function init() {
    mountHeader();
    mountFooter();
    WAB.hydrateIcons();
    initReveal();
  }

  WAB.nav = { init, brandHTML, LINKS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
