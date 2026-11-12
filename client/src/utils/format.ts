import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatMessageTime(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Вчера, ${format(d, 'HH:mm')}`;
  return format(d, 'dd.MM.yyyy, HH:mm');
}

export function formatDateDivider(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return 'Сегодня';
  if (isYesterday(d)) return 'Вчера';
  return format(d, 'd MMMM yyyy', { locale: ru });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ru });
}
