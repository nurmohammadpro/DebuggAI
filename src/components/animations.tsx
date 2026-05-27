'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export const fadeItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 18 } },
};

export function InViewStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeItem({ children }: { children: React.ReactNode }) {
  return <motion.div variants={fadeItemVariants}>{children}</motion.div>;
}

export function SectionHeader({
  tag,
  title,
  subtitle,
}: {
  tag: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-3">
        {tag}
      </div>
      <h1 className="text-[28px] md:text-[32px] font-semibold tracking-[-0.8px] mb-2 max-w-[640px]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-[var(--app-text-muted)] max-w-[480px]">{subtitle}</p>
      )}
    </motion.div>
  );
}
