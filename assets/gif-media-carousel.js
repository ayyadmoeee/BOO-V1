/**
 * GIF Media Carousel
 * Handles carousel navigation, autoplay, active slide detection, and quick add to cart
 * Supports multiple instances on the same page
 * Active slide is determined by which slide's center is closest to the track's center
 */

(function () {
  'use strict';

  class GifMediaCarousel {
    constructor(section) {
      this.section = section;
      this.track = section.querySelector('[data-track]');
      this.prevBtn = section.querySelector('.gmc-arrow--prev');
      this.nextBtn = section.querySelector('.gmc-arrow--next');
      this.dots = section.querySelectorAll('[data-dot-index]');
      this.slides = section.querySelectorAll('.gmc-slide');
      this.autoplayEnabled = section.dataset.autoplay === 'true';
      this.autoplayDelay = parseInt(section.dataset.autoplayDelay) || 5000;
      this.autoplayTimer = null;
      this.isPaused = false;
      this.currentIndex = 0;
      this.scrollRaf = null;
      // Force enable loop for swipe functionality (same as hex prism carousel)
      this.loopEnabled = true;
      this.isScrolling = false;
      this.touchStartX = 0;
      this.touchStartY = 0;

      if (!this.track || this.slides.length === 0) return;

      this.init();
    }

    init() {
      // Setup navigation buttons
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', () => this.scrollToPrev());
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => this.scrollToNext());
      }

      // Setup dots
      this.dots.forEach((dot, index) => {
        dot.addEventListener('click', () => this.scrollToIndex(index));
      });

      // Setup scroll listener for updating active slide and dots/arrows
      this.track.addEventListener('scroll', () => this.handleScroll(), { passive: true });

      // Setup touch/drag support for better swiping
      this.setupTouchSupport();

      // Setup autoplay
      if (this.autoplayEnabled) {
        this.startAutoplay();

        // Pause on hover/focus
        this.section.addEventListener('mouseenter', () => this.pauseAutoplay());
        this.section.addEventListener('mouseleave', () => this.resumeAutoplay());
        this.section.addEventListener('focusin', () => this.pauseAutoplay());
        this.section.addEventListener('focusout', () => this.resumeAutoplay());
      }

      // Setup quick add buttons (both product bar and overlay)
      this.setupQuickAdd();

      // Setup overlay buttons
      this.setupOverlayButtons();

      // Initial state update
      this.updateActiveSlide();
      this.updateActiveState();
    }

    /**
     * Setup touch/drag support for better mobile swiping
     * Uses the same pointer event logic as hex prism carousel
     * Allows native scrolling while detecting swipes for navigation
     */
    setupTouchSupport() {
      let isDragging = false;
      let startX = 0;
      let startScrollLeft = 0;
      let currentX = 0;
      let dragOffset = 0;

      const handlePointerDown = (e) => {
        if (this.slides.length <= 1) return;

        isDragging = true;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        startScrollLeft = this.track.scrollLeft;
        currentX = startX;
        dragOffset = 0;
        this.track.style.cursor = 'grabbing';
        // Don't prevent default - allow native scrolling
      };

      const handlePointerMove = (e) => {
        if (!isDragging) return;

        const x = e.touches ? e.touches[0].clientX : e.clientX;
        dragOffset = x - startX;
        currentX = x;

        // Don't prevent default - allow native scrolling
        // Only track the drag offset for swipe detection
      };

      const handlePointerUp = (e) => {
        if (!isDragging) {
          dragOffset = 0;
          return;
        }

        // Calculate threshold: 10% of slide width or 40px default (same as hex prism)
        const slideWidth = this.getSlideWidth();
        const threshold = slideWidth ? slideWidth * 0.1 : 40;
        const wasDrag = Math.abs(dragOffset) > threshold;

        isDragging = false;
        this.track.style.cursor = 'grab';

        // If it was a significant drag/swipe, navigate to next/prev (same as hex prism)
        if (wasDrag) {
          e.preventDefault();
          e.stopPropagation();
          if (dragOffset > 0) {
            // Swiped right - go to previous
            this.scrollToPrev();
          } else {
            // Swiped left - go to next
            this.scrollToNext();
          }
          dragOffset = 0;
          return;
        }

        // Otherwise, let native scroll handle it and update active slide
        dragOffset = 0;
        setTimeout(() => {
          this.updateActiveSlide();
        }, 100);
      };

      // Use pointer events (same as hex prism carousel)
      // Use passive listeners to allow native scrolling
      this.track.addEventListener('pointerdown', handlePointerDown, { passive: true });
      this.track.addEventListener('pointermove', handlePointerMove, { passive: true });
      this.track.addEventListener('pointerup', handlePointerUp, { passive: false });
      this.track.addEventListener('pointercancel', handlePointerUp, { passive: true });

      // Also handle touch events for better mobile support
      this.track.addEventListener('touchstart', handlePointerDown, { passive: true });
      this.track.addEventListener('touchmove', handlePointerMove, { passive: true });
      this.track.addEventListener('touchend', handlePointerUp, { passive: false });
      this.track.addEventListener('touchcancel', handlePointerUp, { passive: true });

      // Set initial cursor
      this.track.style.cursor = 'grab';
    }

    getSlideWidth() {
      if (this.slides.length === 0) return 0;
      const firstSlide = this.slides[0];
      const gap = parseInt(getComputedStyle(this.track).gap) || 18;
      return firstSlide.offsetWidth + gap;
    }

    /**
     * Find the slide whose center is closest to the track's center
     * This determines which slide should be marked as active
     */
    findActiveSlideIndex() {
      if (this.slides.length === 0) return 0;

      const trackRect = this.track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;

      let closestIndex = 0;
      let closestDistance = Infinity;

      this.slides.forEach((slide, index) => {
        const slideRect = slide.getBoundingClientRect();
        const slideCenter = slideRect.left + slideRect.width / 2;
        const distance = Math.abs(trackCenter - slideCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    }

    /**
     * Update which slide has the .is-active class based on center position
     */
    updateActiveSlide() {
      const activeIndex = this.findActiveSlideIndex();

      this.slides.forEach((slide, index) => {
        if (index === activeIndex) {
          slide.classList.add('is-active');
        } else {
          slide.classList.remove('is-active');
        }
      });

      this.currentIndex = activeIndex;
    }

    /**
     * Throttled scroll handler using requestAnimationFrame
     */
    handleScroll() {
      if (this.scrollRaf) {
        cancelAnimationFrame(this.scrollRaf);
      }

      this.scrollRaf = requestAnimationFrame(() => {
        this.updateActiveSlide();
        this.updateActiveState();
      });
    }

    scrollToIndex(index, smooth = true) {
      if (this.slides.length === 0) return;

      // Handle infinite loop
      if (this.loopEnabled) {
        // Allow wrapping around
        if (index < 0) {
          index = this.slides.length - 1;
        } else if (index >= this.slides.length) {
          index = 0;
        }
      } else {
        // No loop - clamp to bounds
        if (index < 0 || index >= this.slides.length) return;
      }

      const slideWidth = this.getSlideWidth();
      const scrollPosition = slideWidth * index;

      if (smooth) {
        this.track.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      } else {
        this.track.scrollLeft = scrollPosition;
      }

      // Update immediately for better UX
      this.currentIndex = index;
      this.updateActiveSlide();
      this.updateActiveState();

      // Reset autoplay timer
      if (this.autoplayEnabled && !this.isPaused) {
        this.resetAutoplay();
      }
    }

    scrollToPrev() {
      if (this.loopEnabled) {
        const newIndex = this.currentIndex - 1 < 0 ? this.slides.length - 1 : this.currentIndex - 1;
        this.scrollToIndex(newIndex);
      } else {
        const newIndex = Math.max(0, this.currentIndex - 1);
        this.scrollToIndex(newIndex);
      }
    }

    scrollToNext() {
      if (this.loopEnabled) {
        const newIndex = (this.currentIndex + 1) % this.slides.length;
        this.scrollToIndex(newIndex);
      } else {
        const newIndex = Math.min(this.slides.length - 1, this.currentIndex + 1);
        this.scrollToIndex(newIndex);
      }
    }

    updateActiveState() {
      // Update dots
      this.dots.forEach((dot, index) => {
        if (index === this.currentIndex) {
          dot.classList.add('gmc-dot--active');
        } else {
          dot.classList.remove('gmc-dot--active');
        }
      });

      // Update arrow states (disabled only if loop is off and at boundaries)
      if (this.prevBtn) {
        if (this.loopEnabled) {
          this.prevBtn.disabled = false;
        } else {
          this.prevBtn.disabled = this.currentIndex === 0;
        }
      }
      if (this.nextBtn) {
        if (this.loopEnabled) {
          this.nextBtn.disabled = false;
        } else {
          this.nextBtn.disabled = this.currentIndex >= this.slides.length - 1;
        }
      }
    }

    startAutoplay() {
      if (this.isPaused) return;

      this.autoplayTimer = setInterval(() => {
        // Always use scrollToNext which handles loop automatically
        this.scrollToNext();
      }, this.autoplayDelay);
    }

    pauseAutoplay() {
      this.isPaused = true;
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
        this.autoplayTimer = null;
      }
    }

    resumeAutoplay() {
      this.isPaused = false;
      this.startAutoplay();
    }

    resetAutoplay() {
      this.pauseAutoplay();
      this.resumeAutoplay();
    }

    setupOverlayButtons() {
      // Handle overlay "next" buttons
      const overlayNextButtons = this.section.querySelectorAll('.gmc-overlay-button--next');
      overlayNextButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.scrollToNext();
        });
      });

      // Overlay quick add buttons are handled in setupQuickAdd
      // Overlay link buttons are just regular links, no JS needed
    }

    setupQuickAdd() {
      // Product bar quick add buttons
      const quickAddButtons = this.section.querySelectorAll('.gmc-quick-add-btn');

      // Overlay quick add buttons
      const overlayQuickAddButtons = this.section.querySelectorAll('.gmc-overlay-button--quick-add');

      const allQuickAddButtons = [...quickAddButtons, ...overlayQuickAddButtons];

      allQuickAddButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleQuickAdd(button);
        });
      });
    }

    async handleQuickAdd(button) {
      const variantId = button.dataset.variantId;
      const productId = button.dataset.productId;

      if (!variantId) {
        console.error('Variant ID not found');
        return;
      }

      // Disable button and show loading state
      button.disabled = true;
      button.classList.add('loading');

      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: 1
          })
        });

        const data = await response.json();

        if (response.ok && !data.status) {
          // Success - update cart and show success state
          button.classList.remove('loading');
          button.classList.add('success');

          // Dispatch cart update event (Dawn theme compatible)
          if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
            // Fetch updated cart data
            const cartResponse = await fetch('/cart.js');
            const cartData = await cartResponse.json();

            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'gif-media-carousel',
              productVariantId: variantId,
              cartData: cartData
            });
          } else {
            // Fallback: dispatch custom event
            document.dispatchEvent(new CustomEvent('cart:refresh'));
          }

          // Reset button after 2 seconds
          setTimeout(() => {
            button.classList.remove('success');
            button.disabled = false;
          }, 2000);

          // Try to open cart drawer if available
          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer && typeof cartDrawer.open === 'function') {
            cartDrawer.open();
          }
        } else {
          // Error handling
          throw new Error(data.description || 'Failed to add to cart');
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        button.classList.remove('loading');
        button.disabled = false;

        // Show error message (you can customize this)
        alert(error.message || 'Unable to add product to cart. Please try again.');
      }
    }

    destroy() {
      if (this.autoplayTimer) {
        clearInterval(this.autoplayTimer);
      }
      if (this.scrollRaf) {
        cancelAnimationFrame(this.scrollRaf);
      }
    }
  }

  // Initialize all carousel instances on the page
  function initCarousels() {
    const sections = document.querySelectorAll('[id^="GifMediaCarousel-"]');
    const carousels = [];

    sections.forEach(section => {
      const carousel = new GifMediaCarousel(section);
      if (carousel.track) {
        carousels.push(carousel);
      }
    });

    return carousels;
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousels);
  } else {
    initCarousels();
  }

  // Re-initialize when sections are loaded dynamically (Theme Editor)
  if (typeof document.addEventListener !== 'undefined') {
    document.addEventListener('shopify:section:load', (event) => {
      const sectionElement = event.detail || event.target;
      const section = sectionElement.querySelector ?
        sectionElement.querySelector('[id^="GifMediaCarousel-"]') :
        (sectionElement.id && sectionElement.id.startsWith('GifMediaCarousel-') ? sectionElement : null);
      if (section) {
        new GifMediaCarousel(section);
      }
    });

    document.addEventListener('shopify:section:unload', (event) => {
      // Cleanup if needed - section will be removed from DOM
      const sectionElement = event.detail || event.target;
      const section = sectionElement.querySelector ?
        sectionElement.querySelector('[id^="GifMediaCarousel-"]') :
        (sectionElement.id && sectionElement.id.startsWith('GifMediaCarousel-') ? sectionElement : null);
      if (section) {
        // Carousel will be cleaned up when section is removed
      }
    });
  }
})();
