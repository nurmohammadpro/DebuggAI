/**
 * Footer Component - DeBuggAI Design System v1.0
 */

import Link from 'next/link';
import { Logo } from '@/components/logo';

export function Footer() {
  return (
    <footer className="border-t border-[var(--app-border)] bg-[var(--app-panel)] py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-3">
              <Logo className="h-8 w-auto" />
            </Link>
            <p className="text-xs text-[var(--app-text-dim)] leading-relaxed max-w-xs">
              AI-powered debugging and web building platform for developers. Ship faster, stress less.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-xs text-[var(--app-text-muted)] mb-3 tracking-wider">PRODUCT</h4>
            <ul className="space-y-2 text-sm text-[var(--app-text-muted)]">
              <li>
                <Link href="/features" className="footer-link">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="footer-link">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard/web-builder" className="footer-link">
                  Web Builder
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-xs text-[var(--app-text-muted)] mb-3 tracking-wider">COMPANY</h4>
            <ul className="space-y-2 text-sm text-[var(--app-text-muted)]">
              <li>
                <Link href="/about" className="footer-link">
                  About
                </Link>
              </li>
              <li>
                <Link href="/careers" className="footer-link">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="footer-link">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-xs text-[var(--app-text-muted)] mb-3 tracking-wider">LEGAL</h4>
            <ul className="space-y-2 text-sm text-[var(--app-text-muted)]">
              <li>
                <Link href="/privacy" className="footer-link">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="footer-link">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--app-border)] pt-5 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-[var(--app-text-dim)] font-mono">© 2026 DeBuggAI. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
