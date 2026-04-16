/**
 * Contact Page - DeBuggAI
 */

'use client';

import { PublicLayout } from '@/components/public-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ContactPage() {
  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-caption font-medium tracking-widest uppercase mb-3" style={{ color: 'var(--ds-green)' }}>
            Contact
          </p>
          <h1 className="text-display mb-4" style={{ color: 'var(--ds-text)' }}>
            Get in touch
          </h1>
          <p className="text-body max-w-2xl mx-auto" style={{ color: 'var(--ds-text2)' }}>
            Have questions or feedback? We'd love to hear from you.
          </p>
        </div>

        {/* Contact Form */}
        <section className="mb-16">
          <div className="card">
            <form className="space-y-4 p-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="How can we help?" />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  rows={5}
                  className="inp"
                  placeholder="Tell us more..."
                />
              </div>
              <Button type="submit" className="btn-primary">
                Send Message
              </Button>
            </form>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-h1 mb-6" style={{ color: 'var(--ds-text)' }}>Other Ways to Reach Us</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card-sm">
              <h3 className="card-title">Email</h3>
              <p className="card-sub">
                <a href="mailto:hello@debuggai.com" className="footer-link">
                  hello@debuggai.com
                </a>
              </p>
            </div>
            <div className="card-sm">
              <h3 className="card-title">Support</h3>
              <p className="card-sub">
                <a href="mailto:support@debuggai.com" className="footer-link">
                  support@debuggai.com
                </a>
              </p>
            </div>
            <div className="card-sm">
              <h3 className="card-title">Twitter</h3>
              <p className="card-sub">
                <a href="https://twitter.com/debuggai" className="footer-link" target="_blank" rel="noopener noreferrer">
                  @debuggai
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}
