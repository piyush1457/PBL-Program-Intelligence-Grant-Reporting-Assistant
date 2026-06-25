export function cn(...inputs: (string | undefined | null | boolean | { [key: string]: boolean })[]) {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }
  return classes.join(' ');
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function getPrevMonth(month: string): string | null {
  const parts = month.split('-');
  if (parts.length !== 2) return null;
  const year = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(m)) return null;

  let prevM = m - 1;
  let prevY = year;
  if (prevM === 0) {
    prevM = 12;
    prevY = year - 1;
  }

  const prevMonthStr = prevM < 10 ? `0${prevM}` : `${prevM}`;
  return `${prevY}-${prevMonthStr}`;
}

export function formatMonthName(monthStr: string): string {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const year = parts[0];
  const monthInt = parseInt(parts[1], 10);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  if (monthInt >= 1 && monthInt <= 12) {
    return `${monthNames[monthInt - 1]} ${year}`;
  }
  return monthStr;
}

