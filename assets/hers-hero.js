/**
 * Hers Hero Section JavaScript
 * Handles animations, scroll triggers, and interactions
 */

class HersHero extends HTMLElement {
  constructor() {
    super();
    this.cards = this.querySelectorAll('.hers-hero__card');
    this.headlineItems = this.querySelectorAll('.hers-hero__headline-item');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rotationInterval = null;
    this.currentHeadlineIndex = 0;
    this.init();
  }

  init() {
    if (this.reducedMotion) {
      // Skip animations if user prefers reduced motion
      this.cards.forEach(card => {
        card.style.opacity = '1';
        card.style.transform = 'none';
      });
      // Show first headline only
      if (this.headlineItems.length > 0) {
        this.headlineItems[0].classList.add('hers-hero__headline-item--active');
      }
      return;
    }

    // Initialize headline rotation
    this.initHeadlineRotation();
    
    // Initialize scroll animations
    this.initScrollAnimations();
    
    // Initialize parallax effect
    this.initParallax();
    
    // Initialize card interactions
    this.initCardInteractions();
  }

  initHeadlineRotation() {
    if (this.headlineItems.length < 2) {
      // If only one headline, just make it active
      if (this.headlineItems.length === 1) {
        this.headlineItems[0].classList.add('hers-hero__headline-item--active');
      }
      return;
    }

    // Ensure first headline is active on load
    this.headlineItems[0].classList.add('hers-hero__headline-item--active');

    const section = this.closest('.hers-hero');
    const intervalSetting = section?.dataset?.rotationInterval || '5';
    const intervalSeconds = parseInt(intervalSetting, 10) * 1000;

    const rotateHeadlines = () => {
      // Remove active class from current headline
      const currentItem = this.headlineItems[this.currentHeadlineIndex];
      currentItem.classList.remove('hers-hero__headline-item--active');
      
      // Move to next headline
      this.currentHeadlineIndex = (this.currentHeadlineIndex + 1) % this.headlineItems.length;
      
      // Add active class to new headline after a brief delay for smooth transition
      setTimeout(() => {
        const nextItem = this.headlineItems[this.currentHeadlineIndex];
        nextItem.classList.add('hers-hero__headline-item--active');
      }, 100);
    };

    // Start rotation after initial delay
    this.rotationInterval = setInterval(rotateHeadlines, intervalSeconds);
  }

  disconnectedCallback() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
  }

  initScrollAnimations() {
    // Use Intersection Observer for scroll-triggered animations
    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('hers-hero__card--visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    this.cards.forEach(card => {
      observer.observe(card);
    });
  }

  initParallax() {
    if (this.reducedMotion) return;

    let ticking = false;
    const hero = this.closest('.hers-hero');
    
    const updateParallax = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const heroTop = hero.offsetTop;
      const heroHeight = hero.offsetHeight;
      const windowHeight = window.innerHeight;
      
      // Only apply parallax when hero is in viewport
      if (scrollTop + windowHeight > heroTop && scrollTop < heroTop + heroHeight) {
        const parallaxOffset = (scrollTop - heroTop) * 0.1;
        hero.style.transform = `translateY(${parallaxOffset}px)`;
      }
      
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  initCardInteractions() {
    this.cards.forEach(card => {
      // Enhanced hover effects
      card.addEventListener('mouseenter', () => {
        if (!this.reducedMotion) {
          card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      });

      // Keyboard navigation support
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      // Touch support for mobile
      let touchStartY = 0;
      card.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      card.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diff = touchStartY - touchEndY;
        
        // If swipe up, trigger click
        if (Math.abs(diff) > 50 && diff > 0) {
          card.click();
        }
      }, { passive: true });
    });
  }
}

// Register custom element
if (!customElements.get('hers-hero')) {
  customElements.define('hers-hero', HersHero);
}

// Initialize on DOM ready
function initializeHersHero() {
  const heroElements = document.querySelectorAll('.hers-hero');
  heroElements.forEach(hero => {
    // Check if already initialized
    if (hero.dataset.initialized === 'true') return;
    
    // Create wrapper and initialize
    const wrapper = document.createElement('hers-hero');
    hero.parentNode.insertBefore(wrapper, hero);
    wrapper.appendChild(hero);
    hero.dataset.initialized = 'true';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHersHero);
} else {
  initializeHersHero();
}

// Re-initialize on section load (for theme editor)
document.addEventListener('shopify:section:load', initializeHersHero);

