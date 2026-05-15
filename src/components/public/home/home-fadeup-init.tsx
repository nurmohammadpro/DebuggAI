'use client';

import { useEffect } from 'react';

/**
 * Progressive enhancement for the public homepage:
 * - Adds `html.js` only when JS is running.
 * - Reveals `.fade-up` elements when they enter the viewport.
 *
 * Keeping this separate allows the homepage itself to be server-rendered,
 * preventing users from getting stuck on the global `loading.tsx` shell.
 */
export function HomeFadeUpInit() {
  useEffect(() => {
    document.documentElement.classList.add('js');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('js');
    };
  }, []);

  return null;
}

