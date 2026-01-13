/**
 * Artisan Bakery Landing Page - Interactive Features
 * 
 * Implements smooth scrolling navigation, lazy loading for images,
 * mobile menu toggle, and performance optimizations using vanilla JavaScript.
 * 
 * @generated-from: task-id:TASK-006
 * @modifies: index.html
 * @dependencies: []
 */

(function() {
  'use strict';

  // ============================================
  // Configuration & Constants
  // ============================================

  const CONFIG = Object.freeze({
    SMOOTH_SCROLL_DURATION: 800,
    LAZY_LOAD_ROOT_MARGIN: '50px',
    LAZY_LOAD_THRESHOLD: 0.01,
    MOBILE_BREAKPOINT: 768,
    DEBOUNCE_DELAY: 150,
    ANIMATION_FRAME_BUDGET: 16, // ~60fps
  });

  const SELECTORS = Object.freeze({
    NAV_LINKS: '.nav__link',
    LAZY_IMAGES: 'img[loading="lazy"]',
    MOBILE_MENU_TOGGLE: '.mobile-menu-toggle',
    NAV: '.nav',
    HEADER: '.header',
    SKIP_LINK: '.skip-link',
  });

  const CLASSES = Object.freeze({
    NAV_OPEN: 'nav--open',
    MENU_OPEN: 'mobile-menu--open',
    IMAGE_LOADED: 'image--loaded',
    IMAGE_LOADING: 'image--loading',
    IMAGE_ERROR: 'image--error',
  });

  const ARIA = Object.freeze({
    EXPANDED: 'aria-expanded',
    HIDDEN: 'aria-hidden',
    CURRENT: 'aria-current',
  });

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Debounce function to limit execution rate
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Check if browser supports required features
   * @returns {Object} Feature support flags
   */
  function checkBrowserSupport() {
    return {
      intersectionObserver: 'IntersectionObserver' in window,
      smoothScroll: 'scrollBehavior' in document.documentElement.style,
      requestAnimationFrame: 'requestAnimationFrame' in window,
    };
  }

  /**
   * Log error with context
   * @param {string} context - Error context
   * @param {Error} error - Error object
   */
  function logError(context, error) {
    console.error(`[Artisan Bakery] ${context}:`, error);
  }

  /**
   * Get element offset top relative to document
   * @param {HTMLElement} element - Target element
   * @returns {number} Offset top in pixels
   */
  function getOffsetTop(element) {
    let offsetTop = 0;
    let currentElement = element;
    
    while (currentElement) {
      offsetTop += currentElement.offsetTop;
      currentElement = currentElement.offsetParent;
    }
    
    return offsetTop;
  }

  // ============================================
  // Smooth Scrolling Navigation
  // ============================================

  class SmoothScroller {
    constructor() {
      this.support = checkBrowserSupport();
      this.isScrolling = false;
      this.init();
    }

    init() {
      try {
        const navLinks = document.querySelectorAll(SELECTORS.NAV_LINKS);
        
        navLinks.forEach(link => {
          link.addEventListener('click', this.handleClick.bind(this));
        });

        // Handle skip link
        const skipLink = document.querySelector(SELECTORS.SKIP_LINK);
        if (skipLink) {
          skipLink.addEventListener('click', this.handleClick.bind(this));
        }

        // Update active link on scroll
        window.addEventListener('scroll', debounce(this.updateActiveLink.bind(this), CONFIG.DEBOUNCE_DELAY));
        
        // Set initial active link
        this.updateActiveLink();
      } catch (error) {
        logError('SmoothScroller initialization', error);
      }
    }

    handleClick(event) {
      const link = event.currentTarget;
      const href = link.getAttribute('href');

      // Only handle internal anchor links
      if (!href || !href.startsWith('#')) {
        return;
      }

      event.preventDefault();

      const targetId = href.substring(1);
      const targetElement = document.getElementById(targetId);

      if (!targetElement) {
        logError('SmoothScroller', new Error(`Target element not found: ${targetId}`));
        return;
      }

      this.scrollToElement(targetElement);
      
      // Update focus for accessibility
      targetElement.setAttribute('tabindex', '-1');
      targetElement.focus();
      
      // Update URL without triggering scroll
      if (history.pushState) {
        history.pushState(null, null, href);
      }
    }

    scrollToElement(element) {
      if (this.isScrolling) {
        return;
      }

      this.isScrolling = true;

      const header = document.querySelector(SELECTORS.HEADER);
      const headerHeight = header ? header.offsetHeight : 0;
      const targetPosition = getOffsetTop(element) - headerHeight;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = CONFIG.SMOOTH_SCROLL_DURATION;
      let startTime = null;

      // Use native smooth scroll if supported
      if (this.support.smoothScroll) {
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        setTimeout(() => {
          this.isScrolling = false;
        }, duration);
        return;
      }

      // Fallback: manual smooth scroll animation
      const easeInOutCubic = (t) => {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      };

      const animation = (currentTime) => {
        if (startTime === null) {
          startTime = currentTime;
        }

        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        window.scrollTo(0, startPosition + distance * ease);

        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        } else {
          this.isScrolling = false;
        }
      };

      requestAnimationFrame(animation);
    }

    updateActiveLink() {
      try {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll(SELECTORS.NAV_LINKS);
        const header = document.querySelector(SELECTORS.HEADER);
        const headerHeight = header ? header.offsetHeight : 0;
        const scrollPosition = window.pageYOffset + headerHeight + 100;

        let currentSection = '';

        sections.forEach(section => {
          const sectionTop = getOffsetTop(section);
          const sectionHeight = section.offsetHeight;

          if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
          }
        });

        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          
          if (href === `#${currentSection}`) {
            link.setAttribute(ARIA.CURRENT, 'page');
          } else {
            link.removeAttribute(ARIA.CURRENT);
          }
        });
      } catch (error) {
        logError('SmoothScroller updateActiveLink', error);
      }
    }
  }

  // ============================================
  // Lazy Loading Images
  // ============================================

  class LazyImageLoader {
    constructor() {
      this.support = checkBrowserSupport();
      this.observer = null;
      this.images = [];
      this.init();
    }

    init() {
      try {
        this.images = Array.from(document.querySelectorAll(SELECTORS.LAZY_IMAGES));

        if (this.images.length === 0) {
          return;
        }

        if (this.support.intersectionObserver) {
          this.initIntersectionObserver();
        } else {
          // Fallback: load all images immediately
          this.loadAllImages();
        }
      } catch (error) {
        logError('LazyImageLoader initialization', error);
        this.loadAllImages();
      }
    }

    initIntersectionObserver() {
      const options = {
        root: null,
        rootMargin: CONFIG.LAZY_LOAD_ROOT_MARGIN,
        threshold: CONFIG.LAZY_LOAD_THRESHOLD,
      };

      this.observer = new IntersectionObserver(this.handleIntersection.bind(this), options);

      this.images.forEach(image => {
        image.classList.add(CLASSES.IMAGE_LOADING);
        this.observer.observe(image);
      });
    }

    handleIntersection(entries, _observer) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const image = entry.target;
          this.loadImage(image);
          this.observer.unobserve(image);
        }
      });
    }

    loadImage(image) {
      const src = image.getAttribute('src');
      
      if (!src) {
        image.classList.remove(CLASSES.IMAGE_LOADING);
        image.classList.add(CLASSES.IMAGE_ERROR);
        return;
      }

      // Create new image to preload
      const tempImage = new Image();
      
      tempImage.onload = () => {
        image.src = src;
        image.classList.remove(CLASSES.IMAGE_LOADING);
        image.classList.add(CLASSES.IMAGE_LOADED);
      };

      tempImage.onerror = () => {
        image.classList.remove(CLASSES.IMAGE_LOADING);
        image.classList.add(CLASSES.IMAGE_ERROR);
        logError('LazyImageLoader', new Error(`Failed to load image: ${src}`));
      };

      tempImage.src = src;
    }

    loadAllImages() {
      this.images.forEach(image => {
        this.loadImage(image);
      });
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }

  // ============================================
  // Mobile Menu Toggle
  // ============================================

  class MobileMenu {
    constructor() {
      this.isOpen = false;
      this.menuToggle = null;
      this.nav = null;
      this.init();
    }

    init() {
      try {
        this.nav = document.querySelector(SELECTORS.NAV);
        
        if (!this.nav) {
          return;
        }

        // Create mobile menu toggle button if it doesn't exist
        this.createToggleButton();
        
        // Handle window resize
        window.addEventListener('resize', debounce(this.handleResize.bind(this), CONFIG.DEBOUNCE_DELAY));
        
        // Close menu when clicking nav links
        const navLinks = this.nav.querySelectorAll(SELECTORS.NAV_LINKS);
        navLinks.forEach(link => {
          link.addEventListener('click', () => {
            if (this.isOpen) {
              this.closeMenu();
            }
          });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && this.isOpen) {
            this.closeMenu();
            this.menuToggle.focus();
          }
        });

        // Initial check
        this.handleResize();
      } catch (error) {
        logError('MobileMenu initialization', error);
      }
    }

    createToggleButton() {
      // Check if button already exists
      this.menuToggle = document.querySelector(SELECTORS.MOBILE_MENU_TOGGLE);
      
      if (this.menuToggle) {
        this.menuToggle.addEventListener('click', this.toggleMenu.bind(this));
        return;
      }

      // Create new toggle button
      this.menuToggle = document.createElement('button');
      this.menuToggle.className = 'mobile-menu-toggle';
      this.menuToggle.setAttribute('type', 'button');
      this.menuToggle.setAttribute(ARIA.EXPANDED, 'false');
      this.menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
      
      // Add hamburger icon
      this.menuToggle.innerHTML = `
        <span class="mobile-menu-toggle__icon">
          <span class="mobile-menu-toggle__line"></span>
          <span class="mobile-menu-toggle__line"></span>
          <span class="mobile-menu-toggle__line"></span>
        </span>
      `;

      // Insert button before nav
      this.nav.parentNode.insertBefore(this.menuToggle, this.nav);
      
      // Add event listener
      this.menuToggle.addEventListener('click', this.toggleMenu.bind(this));
    }

    toggleMenu() {
      if (this.isOpen) {
        this.closeMenu();
      } else {
        this.openMenu();
      }
    }

    openMenu() {
      this.isOpen = true;
      this.nav.classList.add(CLASSES.NAV_OPEN);
      this.menuToggle.classList.add(CLASSES.MENU_OPEN);
      this.menuToggle.setAttribute(ARIA.EXPANDED, 'true');
      this.nav.setAttribute(ARIA.HIDDEN, 'false');
      
      // Trap focus in menu
      const firstLink = this.nav.querySelector(SELECTORS.NAV_LINKS);
      if (firstLink) {
        firstLink.focus();
      }
    }

    closeMenu() {
      this.isOpen = false;
      this.nav.classList.remove(CLASSES.NAV_OPEN);
      this.menuToggle.classList.remove(CLASSES.MENU_OPEN);
      this.menuToggle.setAttribute(ARIA.EXPANDED, 'false');
      this.nav.setAttribute(ARIA.HIDDEN, 'true');
    }

    handleResize() {
      const isMobile = window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
      
      if (this.menuToggle) {
        this.menuToggle.style.display = isMobile ? 'block' : 'none';
      }

      if (!isMobile && this.isOpen) {
        this.closeMenu();
      }

      // Update ARIA attributes based on viewport
      if (!isMobile) {
        this.nav.removeAttribute(ARIA.HIDDEN);
      } else if (!this.isOpen) {
        this.nav.setAttribute(ARIA.HIDDEN, 'true');
      }
    }
  }

  // ============================================
  // Performance Optimizations
  // ============================================

  class PerformanceOptimizer {
    constructor() {
      this.init();
    }

    init() {
      try {
        // Preconnect to external domains
        this.preconnectExternalDomains();
        
        // Add loading indicators
        this.addLoadingIndicators();
        
        // Monitor performance
        this.monitorPerformance();
      } catch (error) {
        logError('PerformanceOptimizer initialization', error);
      }
    }

    preconnectExternalDomains() {
      const domains = ['https://images.unsplash.com'];
      
      domains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    }

    addLoadingIndicators() {
      const images = document.querySelectorAll('img[loading="lazy"]');
      
      images.forEach(image => {
        const wrapper = image.parentElement;
        if (wrapper && wrapper.classList.contains('product-card__image-wrapper')) {
          wrapper.style.backgroundColor = 'var(--color-gray-200)';
        }
      });
    }

    monitorPerformance() {
      if (!window.performance || !window.performance.timing) {
        return;
      }

      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = window.performance.timing;
          const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
          const connectTime = perfData.responseEnd - perfData.requestStart;
          const renderTime = perfData.domComplete - perfData.domLoading;

          console.log('[Artisan Bakery] Performance Metrics:', {
            pageLoadTime: `${pageLoadTime}ms`,
            connectTime: `${connectTime}ms`,
            renderTime: `${renderTime}ms`,
          });
        }, 0);
      });
    }
  }

  // ============================================
  // Application Initialization
  // ============================================

  class App {
    constructor() {
      this.smoothScroller = null;
      this.lazyImageLoader = null;
      this.mobileMenu = null;
      this.performanceOptimizer = null;
      this.init();
    }

    init() {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', this.initializeFeatures.bind(this));
      } else {
        this.initializeFeatures();
      }
    }

    initializeFeatures() {
      try {
        // Initialize all features
        this.smoothScroller = new SmoothScroller();
        this.lazyImageLoader = new LazyImageLoader();
        this.mobileMenu = new MobileMenu();
        this.performanceOptimizer = new PerformanceOptimizer();

        console.log('[Artisan Bakery] Interactive features initialized successfully');
      } catch (error) {
        logError('App initialization', error);
      }
    }

    destroy() {
      if (this.lazyImageLoader) {
        this.lazyImageLoader.destroy();
      }
    }
  }

  // ============================================
  // Start Application
  // ============================================

  const app = new App();

  // Expose app instance for debugging (development only)
  if (typeof window !== 'undefined') {
    window.ArtisanBakeryApp = app;
  }

})();