import { format, startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';

export type Period = 'day' | 'week' | 'month' | 'year';

export const PERIOD_LABELS: Record<Period, string> = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
};

export function formatMoney(amount: number, currency = 'FCFA'): string {
  const value = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(
    Math.round(amount)
  );
  return `${value} ${currency}`;
}

export function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy, HH:mm', { locale: fr });
}

export function periodStart(period: Period, now = new Date()): Date {
  switch (period) {
    case 'day':
      return startOfDay(now);
    case 'week':
      return startOfWeek(now, { weekStartsOn: 1 });
    case 'month':
      return startOfMonth(now);
    case 'year':
      return startOfYear(now);
  }
}
