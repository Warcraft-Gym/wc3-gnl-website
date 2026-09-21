/** A minimal SYLK (`.slk`) reader: just enough of the format to read
 * Blizzard's `unitbalance.slk`/`unitdata.slk` tables (row/column value
 * grids keyed by a rawcode column). Not a general SYLK writer/formula
 * evaluator — only `C` (cell content) records are read; every other record
 * type (`ID`, `B`, `F`, ...) is ignored.
 *
 * Cell record shape: `C;X<col>;Y<row>;K<value>` — `X`/`Y` may appear in
 * either order on the line, and a `Y` is optional: when a record omits it,
 * the row is the last `Y` seen on any earlier record (SYLK files normally
 * write `Y` once per row, then only `X` for the rest of that row's cells).
 * `K<value>` is a quoted string (`K"text"`, quotes stripped) or a bare
 * token (`K123`, `KFALSE`, ...), kept as the raw string either way — callers
 * decide how to interpret it (see `creep-table.mjs`, which reads numbers
 * with `Number(...)`).
 */

/** Parses SYLK `text` into `{ rows }`, where `rows` is a
 * `Map<rowIndex, Map<colIndex, value>>` (both 1-based, matching the file's
 * own `X`/`Y`). Row 1 is conventionally the column-header row. */
export function parseSlk(text) {
  const rows = new Map();
  let currentY = null;

  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("C;")) continue;

    let x = null;
    let y = null;
    let rawValue = null;
    for (const field of line.slice(2).split(";")) {
      if (field.startsWith("X")) x = Number(field.slice(1));
      else if (field.startsWith("Y")) y = Number(field.slice(1));
      else if (field.startsWith("K")) rawValue = field.slice(1);
    }
    if (y !== null) currentY = y;
    if (x === null || currentY === null || rawValue === null) continue;

    if (!rows.has(currentY)) rows.set(currentY, new Map());
    rows.get(currentY).set(x, unquote(rawValue));
  }

  return { rows };
}

function unquote(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  return raw;
}

/** Reads a single cell's value, or `undefined` if the row/column is empty. */
export function cell(table, row, col) {
  return table.rows.get(row)?.get(col);
}

/** Maps column name (from header row 1) to its column index. */
export function columnIndex(table) {
  const header = table.rows.get(1);
  const map = new Map();
  if (!header) return map;
  for (const [col, name] of header) map.set(name, col);
  return map;
}

/** Indexes every data row (row 1 excluded) by the value in `keyColumn`,
 * returning `Map<keyValue, Record<columnName, value>>`. Rows missing the
 * key column are skipped. */
export function indexByColumn(table, keyColumn) {
  const columns = columnIndex(table);
  const keyCol = columns.get(keyColumn);
  const result = new Map();
  if (keyCol === undefined) return result;

  for (const [rowIndex, cells] of table.rows) {
    if (rowIndex === 1) continue;
    const key = cells.get(keyCol);
    if (key === undefined) continue;

    const record = {};
    for (const [name, col] of columns) {
      if (cells.has(col)) record[name] = cells.get(col);
    }
    result.set(key, record);
  }
  return result;
}
