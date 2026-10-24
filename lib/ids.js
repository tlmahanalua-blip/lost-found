// Keep report URLs stable: a deleted report's ID must never be reused.
export async function allocateItemId(tx) {
  const result=await tx.execute(`INSERT INTO id_counters(name,last_value)
    SELECT 'items',COALESCE(MAX(item_id),0)+1 FROM items WHERE 1
    ON CONFLICT(name) DO UPDATE SET last_value=MAX(id_counters.last_value,(SELECT COALESCE(MAX(item_id),0) FROM items))+1
    RETURNING last_value`);
  return Number(result.rows[0].last_value);
}
