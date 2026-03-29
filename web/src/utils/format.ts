/**
 * Converts cents (int64) to Yuan string with 2 decimal places.
 * 100 cents = 1 Yuan
 */
export const formatCentToYuan = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

/**
 * Converts Yuan string/number to cents (int64).
 */
export const formatYuanToCent = (yuan: string | number): number => {
  const val = typeof yuan === 'string' ? parseFloat(yuan) : yuan;
  if (isNaN(val)) return 0;
  return Math.round(val * 100);
};

/**
 * Formats a date string to a more readable local format.
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
