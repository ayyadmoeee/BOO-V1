/**
 * Hers Labs Hero Section JavaScript
 * Handles seamless infinite marquee animation
 */

class HersLabsHero extends HTMLElement {
  constructor() {
    super();
    this.animationFrameId = null;
    this.currentTranslateX = 0;
    this.setWidth = 0;
    this.loopLength = 0;
    this.speedPxPerSec = 30;
    this.lastTimestamp = null;
    this.resizeTimeout = null;
    this.imagesLoaded = false;
    this.track = null;
    this.section = null;
    this.isInitialized = false;
    this.watchdogTimer = null;
    this.lastFrameAt = 0;
    this.lastWatchdogRestartAt = 0;
    this.handleResize = null;
    this.handleWindowLoad = null;
    this.handleVisibilityChange = null;
  }

  // FIX: Use connectedCallback instead of constructor init - ensures DOM is ready
  connectedCallback() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Find section - it should be a child of this custom element
    this.section = this.querySelector('.hers-labs-hero') || 
                   document.querySelector(`[data-section-id="${this.getAttribute('data-section-id')}"]`);
    
    if (!this.section) {
      console.warn('⚠️ Hers Labs Hero section not found');
      return;
    }

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.applySpeedSettings();
    this.lastKnownWidth = window.innerWidth;

    // Wait for images to load, then initialize marquee
    this.waitForImagesToLoad().then(() => {
      this.imagesLoaded = true;
      this.initSeamlessMarquee();
    }).catch((err) => {
      console.warn('⚠️ Image loading error, initializing anyway:', err);
      this.imagesLoaded = true;
      // Try to initialize even if images fail
      setTimeout(() => this.initSeamlessMarquee(), 100);
    });

    // Initialize button interactions
    this.initButtonInteractions();

    // Recalculate marquee period after viewport/layout changes.
    // Only reinit when WIDTH changes meaningfully — iOS Safari fires resize on every
    // scroll because the URL bar collapses/expands (height-only change), which was
    // resetting currentTranslateX to 0 on every scroll and making the marquee appear
    // to "play through once then restart."
    this.handleResize = () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        const newWidth = window.innerWidth;
        if (Math.abs(newWidth - this.lastKnownWidth) > 50) {
          this.lastKnownWidth = newWidth;
          if (this.imagesLoaded) this.initSeamlessMarquee();
        }
      }, 250);
    };
    window.addEventListener('resize', this.handleResize);

    // window.load handler removed — waitForImagesToLoad() already handles init.
    // A redundant second call to initSeamlessMarquee() removes and re-adds the
    // cloned sets, causing the visible "duplicate flash" on mobile.
    this.handleWindowLoad = null;

    this.startWatchdog();

    this.handleVisibilityChange = () => {
      if (!this.imagesLoaded || !this.track) return;
      if (document.hidden) return;
      // Just restart the RAF loop if it stopped — don't do a full reinit which
      // would remove clones and reset position.
      if (!this.animationFrameId) {
        this.lastTimestamp = null;
        this.startAnimationLoop();
      }
    };
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Wait for all images in the track to load before measuring widths
   */
  waitForImagesToLoad() {
    this.track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    
    if (!this.track) {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 20;
        const poll = () => {
          this.track = this.section?.querySelector('[data-marquee-track]') || 
                        this.section?.querySelector('.hers-labs-hero__images-track');
          if (this.track || attempts >= maxAttempts) {
            resolve();
            return;
          }
          attempts += 1;
          setTimeout(poll, 100);
        };
        poll();
      });
    }

    const images = this.track.querySelectorAll('img');
    if (images.length === 0) {
      console.warn('⚠️ No images found in track');
      return Promise.resolve();
    }

    const imagePromises = Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return img.decode().catch(() => {
        return new Promise((resolve) => {
          const onLoad = () => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onLoad);
            resolve();
          };
          img.addEventListener('load', onLoad);
          img.addEventListener('error', onLoad);
          setTimeout(resolve, 3000);
        });
      });
    });

    return Promise.all(imagePromises);
  }

  /**
   * Initialize seamless marquee animation using requestAnimationFrame
   */
  initSeamlessMarquee() {
    this.track = this.section?.querySelector('[data-marquee-track]') || 
                  this.section?.querySelector('.hers-labs-hero__images-track');
    
    if (!this.track) {
      console.error('❌ Track not found in initSeamlessMarquee');
      return;
    }

    // Stop any existing animation
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove CSS animation
    this.track.style.animation = 'none';
    this.track.style.willChange = 'transform';

    // Remove runtime-added clones from prior inits (keep original authored sets 1..4).
    const existingSets = this.track.querySelectorAll('.hers-labs-hero__images-set[data-marquee-set]');
    existingSets.forEach((set) => {
      const setIndex = parseInt(set.getAttribute('data-marquee-set') || '', 10);
      if (Number.isFinite(setIndex) && setIndex > 4) set.remove();
    });

    // Get all sets
    const sets = this.track.querySelectorAll('.hers-labs-hero__images-set');
    if (sets.length === 0) {
      console.error('❌ No image sets found');
      return;
    }

    // Ensure sets are properly displayed
    sets.forEach(set => {
      set.style.display = 'flex';
      set.style.flexShrink = '0';
      set.style.flexGrow = '0';
      set.style.width = 'max-content';
      set.style.minWidth = 'max-content';
    });

    // Force a reflow
    void this.track.offsetHeight;

    // Reset transform before measuring period geometry.
    this.track.style.transform = 'translate3d(0, 0, 0)';

    // Measure the width of the first set
    const firstSet = sets[0];
    const firstSetWidth = firstSet.getBoundingClientRect().width;
    
    if (firstSetWidth === 0) {
      const fallbackWidth = firstSet.scrollWidth || Math.round(this.track.scrollWidth / Math.max(1, sets.length));
      if (fallbackWidth > 0) {
        this.loopLength = fallbackWidth;
      } else {
        console.warn('⚠️ First set has zero width, retrying...');
        setTimeout(() => this.initSeamlessMarquee(), 120);
        return;
      }
    } else {
      this.loopLength = firstSetWidth;
    }
    // Prefer measured distance between consecutive set starts
    // (captures inter-set spacing and avoids seam drift on mobile).
    if (sets.length > 1) {
      const firstLeft = sets[0].getBoundingClientRect().left;
      const secondLeft = sets[1].getBoundingClientRect().left;
      const measuredPeriod = Math.abs(secondLeft - firstLeft);
      if (measuredPeriod > 0) this.loopLength = measuredPeriod;
    }

    // Sanity-check: loopLength must not be larger than the combined width of 2 sets.
    // If it is, the measurement was wrong — retry on the next paint.
    const maxSanePeriod = this.track.scrollWidth / Math.max(1, sets.length - 1);
    if (this.loopLength > maxSanePeriod * 1.5 && maxSanePeriod > 0) {
      console.warn('⚠️ loopLength suspiciously large, retrying after paint...');
      requestAnimationFrame(() => this.initSeamlessMarquee());
      return;
    }

    this.setWidth = this.loopLength;

    // Ensure we have at least 2 sets
    if (sets.length < 2) {
      const firstSetClone = firstSet.cloneNode(true);
      firstSetClone.setAttribute('data-marquee-set', '2');
      this.track.appendChild(firstSetClone);
    }

    // Ensure we have enough sets to cover viewport
    // On mobile use a wider coverage multiplier (3×) for reliable seamless looping
    const viewportWidth = window.innerWidth;
    const isMobileLayout = window.matchMedia('(max-width: 767px)').matches;
    const coverMultiplier = isMobileLayout ? 3 : 2;
    const minSetsNeeded = Math.ceil((viewportWidth * coverMultiplier) / this.loopLength) + 2;
    
    let currentSets = this.track.querySelectorAll('.hers-labs-hero__images-set');
    while (currentSets.length < minSetsNeeded && currentSets.length < 10) {
      const lastSet = this.track.lastElementChild;
      const newSet = lastSet.cloneNode(true);
      newSet.setAttribute('data-marquee-set', String(currentSets.length + 1));
      this.track.appendChild(newSet);
      currentSets = this.track.querySelectorAll('.hers-labs-hero__images-set');
    }

    console.log('✅ Loop length measured:', this.loopLength, 'px');

    // Update speed + direction
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.applySpeedSettings();

    // Reset animation position
    this.currentTranslateX = 0;
    this.lastTimestamp = null;
    this.track.style.transform = `translate3d(${this.currentTranslateX}px, 0, 0)`;
    this.lastFrameAt = Date.now();

    console.log('✅ Starting animation loop, speed:', this.speedPxPerSec, 'px/s');
    this.startAnimationLoop();
  }

  /**
   * Start the animation loop - this MUST be called explicitly
   */
  startAnimationLoop() {
    // Stop any existing loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Validate prerequisites
    if (!this.track) {
      console.error('❌ Cannot start loop: track is null');
      return;
    }
    if (this.loopLength === 0) {
      console.error('❌ Cannot start loop: loopLength is 0');
      return;
    }

    console.log('✅ Starting requestAnimationFrame loop');

    // CRITICAL: The loop function - this runs every frame
    const loop = (timestamp) => {
      this.lastFrameAt = Date.now();
      if (this.lastTimestamp == null) this.lastTimestamp = timestamp;
      const rawDelta = timestamp - this.lastTimestamp;
      // Cap delta to 100ms so a long background pause doesn't cause a huge jump
      const delta = Math.min(rawDelta, 100);
      this.lastTimestamp = timestamp;

      const deltaPx = (this.speedPxPerSec * delta) / 1000;
      this.currentTranslateX -= deltaPx;
      if (this.currentTranslateX <= -this.loopLength) {
        this.currentTranslateX += this.loopLength;
      }

      // Apply transform - CRITICAL: This must happen every frame
      if (this.track && this.loopLength > 0) {
        this.track.style.transform = `translate3d(${this.currentTranslateX}px, 0, 0)`;
      }

      // Continue loop - NO conditions that stop it
      this.animationFrameId = requestAnimationFrame(loop);
    };

    // CRITICAL: Start the loop immediately
    this.animationFrameId = requestAnimationFrame(loop);
    console.log('✅ requestAnimationFrame called, ID:', this.animationFrameId);
  }

  startWatchdog() {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.lastFrameAt = Date.now();
    this.lastWatchdogRestartAt = 0;
    this.watchdogTimer = setInterval(() => {
      if (!this.imagesLoaded || !this.track) return;
      if (this.speedPxPerSec <= 0) return;
      if (document.hidden) return;

      const now = Date.now();
      const isMobile = window.matchMedia('(max-width: 749px)').matches;
      const stallThresholdMs = isMobile ? 7000 : 2500;
      const restartCooldownMs = isMobile ? 4000 : 2000;
      const stalled = now - this.lastFrameAt > stallThresholdMs;
      if (!stalled) return;

      if (this.lastWatchdogRestartAt && now - this.lastWatchdogRestartAt < restartCooldownMs) return;

      this.lastWatchdogRestartAt = now;
      this.lastTimestamp = null;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      // Always just restart the loop — never call initSeamlessMarquee() here.
      // initSeamlessMarquee removes and re-adds cloned sets causing a visible
      // flash. The loop length was correctly measured on init; just restart RAF.
      this.startAnimationLoop();
    }, 2000);
  }

  /**
   * Clean up on disconnect
   */
  disconnectedCallback() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    if (this.handleWindowLoad) {
      window.removeEventListener('load', this.handleWindowLoad);
    }
    if (this.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.isInitialized = false;
  }

  initButtonInteractions() {
    const buttons = this.section?.querySelectorAll('.hers-labs-hero__button');
    if (!buttons) return;

    buttons.forEach(button => {
      button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          button.click();
        }
      });
    });
  }

  applySpeedSettings() {
    const speedAttr = parseFloat(this.section?.dataset?.marqueeSpeed || '30');
    const safeSpeed = Number.isFinite(speedAttr) ? speedAttr : 30;
    const minSpeed = 5;
    this.speedPxPerSec = Math.max(minSpeed, safeSpeed);
  }
}

// Register custom element
if (!customElements.get('hers-labs-hero')) {
  customElements.define('hers-labs-hero', HersLabsHero);
}

// Initialize on DOM ready
function initializeHersLabsHero() {
  const sections = document.querySelectorAll('.hers-labs-hero');
  sections.forEach(section => {
    if (section.dataset.initialized === 'true') return;
    
    const wrapper = document.createElement('hers-labs-hero');
    wrapper.setAttribute('data-section-id', section.dataset.sectionId || '');
    section.parentNode.insertBefore(wrapper, section);
    wrapper.appendChild(section);
    section.dataset.initialized = 'true';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeHersLabsHero);
} else {
  initializeHersLabsHero();
}

// Re-initialize on section load (for theme editor)
document.addEventListener('shopify:section:load', initializeHersLabsHero);
