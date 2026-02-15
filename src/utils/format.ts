export const formatRelativeTime = (isoString: string): string => {
  const target = new Date(isoString).getTime();
  const diffMs = Date.now() - target;
  const diffMin = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

export const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-CA')}`;
};

export const toTitleCase = (value: string): string => {
  return value
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};
