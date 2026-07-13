export function formatDate(dateStr: string | null | undefined, locale: string = 'ar'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateFull(dateStr: string | null | undefined, locale: string = 'ar'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(dateStr: string | null | undefined, locale: string = 'ar'): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale);
}
