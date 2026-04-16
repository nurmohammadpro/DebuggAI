'use client';

import { Mail, Headphones, MessageCircle } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

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
            Have questions, enterprise inquiries, or feedback? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Contact Form */}
        <section className="mb-16">
          <div className="card">
            <form className="p-6 flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="name" className="text-caption block mb-2" style={{ color: 'var(--ds-text3)' }}>Name</label>
                  <input id="name" type="text" placeholder="Your name" className="inp" />
                </div>
                <div>
                  <label htmlFor="email" className="text-caption block mb-2" style={{ color: 'var(--ds-text3)' }}>Email</label>
                  <input id="email" type="email" placeholder="your@email.com" className="inp" />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="text-caption block mb-2" style={{ color: 'var(--ds-text3)' }}>Subject</label>
                <input id="subject" type="text" placeholder="How can we help?" className="inp" />
              </div>
              <div>
                <label htmlFor="message" className="text-caption block mb-2" style={{ color: 'var(--ds-text3)' }}>Message</label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Tell us more..."
                  className="inp"
                  style={{ height: 'auto', resize: 'vertical', paddingTop: '10px', paddingBottom: '10px' }}
                ></textarea>
              </div>
              <div>
                <button type="submit" className="btn btn-primary">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-h1 mb-6" style={{ color: 'var(--ds-text)' }}>Other Ways to Reach Us</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-sm card-interactive">
              <Mail className="h-5 w-5 mb-3" style={{ color: 'var(--ds-green)' }} />
              <h3 className="card-title">Email</h3>
              <p className="card-sub">
                <a href="mailto:hello@debuggai.com" className="footer-link">hello@debuggai.com</a>
              </p>
            </div>
            <div className="card-sm card-interactive">
              <Headphones className="h-5 w-5 mb-3" style={{ color: 'var(--ds-green)' }} />
              <h3 className="card-title">Support</h3>
              <p className="card-sub">
                <a href="mailto:support@debuggai.com" className="footer-link">support@debuggai.com</a>
              </p>
            </div>
            <div className="card-sm card-interactive">
              <MessageCircle className="h-5 w-5 mb-3" style={{ color: 'var(--ds-green)' }} />
              <h3 className="card-title">Twitter</h3>
              <p className="card-sub">
                <a href="https://twitter.com/debuggai" className="footer-link" target="_blank" rel="noopener noreferrer">@debuggai</a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  );
}