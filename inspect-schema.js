const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new DatabaseSync(dbPath);
const tables = ['products', 'orders', 'customers'];
const schema = {};
for (const table of tables) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
  schema[table] = columns;
}
fs.writeFileSync(path.join(__dirname, 'schema-report.json'), JSON.stringify(schema, null, 2));
db.close();
