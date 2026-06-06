import { Metadata } from 'next';

const SITE_NAME = 'DeBuggAI';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://debugg.ai';
const SITE_DESCRIPTION = 'AI-powered debugging, code generation, and visual web building for developers.';

interface SEOOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
  canonical?: string;
}

export function buildMetadata(opts: SEOOptions = {}): Metadata {
  const title = opts.title
    ? `${opts.title} — ${SITE_NAME}`
    : `${SITE_NAME} — AI Developer Platform`;

  const description = opts.description || SITE_DESCRIPTION;

  return {
    title,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: opts.canonical || '/',
    },
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images: opts.ogImage ? [{ url: opts.ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: opts.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function defaultMetadata(): Metadata {
  return buildMetadata();
}
