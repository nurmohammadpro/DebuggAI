'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ = [
  {
    q: 'What is Zero-Knowledge Mode?',
    a: "Your code and error logs are never stored on our servers. All analysis happens in-memory and is immediately discarded after the response. Available on Pro and higher plans.",
  },
  {
    q: 'How do credits work?',
    a: 'Each debug analysis costs 1 credit. Web Builder runs start at 20 credits and scale by project size. Credits reset monthly with your subscription.',
  },
  {
    q: 'Can I use DeBuggAI for proprietary code?',
    a: 'Yes. Enable Zero-Knowledge Mode on Pro or Enterprise plans. Your code is never persisted, logged, or used for training. We also offer on-premise deployment for Enterprise.',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your current billing period. You keep your remaining credits until they expire.',
  },
  {
    q: 'What stacks does the Web Builder support?',
    a: 'MERN, Laravel (PHP), Django (Python), Flask (Python), Ruby on Rails, and Go. Each template generates a complete project structure with best practices baked in.',
  },
];

export function HomeFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="fade-up max-w-2xl mx-auto">
      {FAQ.map((item, index) => (
        <div key={index} className="mb-1.5">
          <button
            className="flex items-center gap-2.5 w-full text-[13px] font-medium text-[var(--app-text)] rounded-[6px] bg-[var(--app-panel)] p-4 text-left"
            onClick={() => setOpenFaq(openFaq === index ? null : index)}
          >
            <span className="w-[18px] h-[18px] rounded-[6px] flex items-center justify-center text-[10px] text-[var(--app-accent)] bg-[var(--app-accent-soft)] flex-shrink-0 border border-[var(--app-border)]">
              {index + 1}
            </span>
            {item.q}
            <ChevronDown
              className="ml-auto transition-transform duration-200 h-3.5 w-3.5 text-[var(--app-text-dim)]"
              style={{
                transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: openFaq === index ? '200px' : '0px' }}
          >
            <p className="text-[13px] text-[var(--app-text-muted)] leading-relaxed px-4 pb-4">
              {item.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
