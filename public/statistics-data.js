// Shared totals keep the noticeboard and the detailed statistics consistent.
export function summarize(items, categories) {
  if (!Array.isArray(items) || !Array.isArray(categories)) throw new Error('Invalid data');
  const unique = new Set();
  const categoryCounts = new Map(categories.map(row => [row.name, 0]));
  const locationCounts = new Map();
  let open = 0, resolved = 0, samples = 0, found = 0;
  for (const row of items) {
    if (unique.has(String(row.id))) throw new Error('Duplicate item');
    unique.add(String(row.id));
    if (row.status === 'available') open++;
    else if (row.status === 'returned') resolved++;
    else throw new Error('Unknown status');
    if (row.reportType !== 'lost' && row.reportType !== 'found') throw new Error('Unknown report type');
    if (typeof row.category !== 'string' || typeof row.location !== 'string') throw new Error('Invalid labels');
    if (row.sample) samples++;
    categoryCounts.set(row.category, (categoryCounts.get(row.category) || 0) + 1);
    if (row.reportType === 'found') found++;
    locationCounts.set(row.location, (locationCounts.get(row.location) || 0) + 1);
  }
  const grouped = counts => Array.from(counts, ([label, count]) => ({label, count}))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'en'));
  return {total: items.length, open, resolved, samples, found,
    categories: grouped(categoryCounts), locations: grouped(locationCounts)};
}
