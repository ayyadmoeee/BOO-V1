/**
 * Hers Header JavaScript
 * Handles sticky header behavior
 */

class HersHeaderWrapper extends HTMLElement {
  constructor() {
    super();
    this.header = this.querySelector('.hers-header');
    this.init();
  }

  init() {
    // Header is already sticky via CSS, but we can add scroll effects if needed
    let lastScroll = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
          
          // Add shadow on scroll
          if (currentScroll > 10) {
            this.classList.add('hers-header-wrapper--scrolled');
          } else {
            this.classList.remove('hers-header-wrapper--scrolled');
          }
          
          lastScroll = currentScroll;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }
}

if (!customElements.get('hers-header-wrapper')) {
  customElements.define('hers-header-wrapper', HersHeaderWrapper);
}

