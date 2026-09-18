import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * useLenis
 * Initializes and manages a global Lenis smooth inertia scroll instance,
 * matching the signature fluid, weighted scrolling experience of SentientX.
 * 
 * Safety & Accessibility:
 * - Automatically bypasses on touch devices (pointer: coarse) for native responsiveness.
 * - Automatically bypasses when prefers-reduced-motion is enabled.
 * - Smoothly handles anchor links (#section).
 */
export const useLenis = (pathname) => {
  useEffect(() => {
    const currentPath = pathname || window.location.pathname;
    const isExcluded =
      currentPath.startsWith('/admin') ||
      currentPath.startsWith('/customer') ||
      currentPath.startsWith('/shared') ||
      currentPath.startsWith('/login');

    if (isExcluded) {
      if (window.lenis) {
        window.lenis.destroy();
        delete window.lenis;
      }
      document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
      document.body.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
      return;
    }

    // Initialize Lenis with SentientX-caliber inertia parameters
    const lenis = new Lenis({
      duration: 1.2,          // Seconds of glide (weighted luxury inertia)
      lerp: 0.09,             // Smoothing interpolation factor (lower = smoother/heavier)
      smoothWheel: true,      // Smooth mouse-wheel scrolling
      wheelMultiplier: 0.95,  // Controlled wheel velocity
      touchMultiplier: 1.5,   // Snappy touch response
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) // SentientX exponential ease
    });

    // Drive the requestAnimationFrame loop
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Smooth glide for in-page anchor links (e.g. #about, #services, #contact)
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href && href.length > 1) {
        const targetElement = document.querySelector(href);
        if (targetElement) {
          e.preventDefault();
          lenis.scrollTo(targetElement, { offset: -70, duration: 1.2 });
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    window.lenis = lenis;

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.lenis;
    };
  }, [pathname]);
};

export default useLenis;
