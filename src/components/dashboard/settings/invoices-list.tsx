'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, Loader2, Receipt } from 'lucide-react';

interface Invoice {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
  created: string;
  periodStart: string;
  periodEnd: string;
}

export function InvoicesList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/invoices?limit=25');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--app-text-dim)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[13px] text-[var(--app-danger)]">{error}</p>
        <button
          onClick={fetchInvoices}
          className="mt-3 text-[13px] text-[var(--app-accent)] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="h-10 w-10 mx-auto mb-3 text-[var(--app-text-dim)]" />
        <p className="text-[13px] text-[var(--app-text-muted)]">No invoices yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invoices.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-[var(--app-border)] rounded-[6px] hover:bg-[var(--app-panel-2)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-[6px] bg-[var(--app-accent-soft)] flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-[var(--app-accent)]" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-[var(--app-text)]">
                {inv.number ? `Invoice #${inv.number}` : 'Invoice'}
              </div>
              <div className="text-[11px] text-[var(--app-text-muted)]">
                {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:ml-auto">
            <span className="text-[13px] font-semibold text-[var(--app-text)]">
              {formatCurrency(inv.amount, inv.currency)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-[6px] bg-[var(--app-success-soft)] text-[var(--app-success)]">
              {inv.status}
            </span>
            <div className="flex items-center gap-1">
              {inv.hostedUrl && (
                <a
                  href={inv.hostedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                  title="View invoice"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {inv.pdfUrl && (
                <a
                  href={inv.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                  title="Download PDF"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
