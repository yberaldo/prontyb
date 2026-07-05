export function formatDate(value?: string | null): string {
  if (!value) return 'Nao informado';

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Nao informado';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatValue(value: unknown): string {
  if (value === null || typeof value === 'undefined' || value === '') return 'Nao informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value);
}

export function formatBoolean(value: unknown): string {
  return value === true || value === 1 || value === '1' ? 'Sim' : 'Nao';
}

export function formatBytes(value?: number | null): string {
  if (!value) return 'Nao informado';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
