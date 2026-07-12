<<<<<<< HEAD
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
=======
export function formatDate(dateStr: string, locale: string = 'ar'): string {
>>>>>>> 63ab088 (إصلاحات شاملة: 62 مشكلة - أمان، أداء، تجربة مستخدم، وجاهزية الإنتاج)
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

<<<<<<< HEAD
export function formatDateFull(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
=======
export function formatDateFull(dateStr: string, locale: string = 'ar'): string {
>>>>>>> 63ab088 (إصلاحات شاملة: 62 مشكلة - أمان، أداء، تجربة مستخدم، وجاهزية الإنتاج)
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

<<<<<<< HEAD
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
=======
export function formatDateShort(dateStr: string, locale: string = 'ar'): string {
>>>>>>> 63ab088 (إصلاحات شاملة: 62 مشكلة - أمان، أداء، تجربة مستخدم، وجاهزية الإنتاج)
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale);
}
