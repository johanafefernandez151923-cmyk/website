const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new DatabaseSync(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((row) => row.name);
const customerColumns = db.prepare("PRAGMA table_info(customers)").all().map((column) => column.name);
fs.writeFileSync(path.join(__dirname, 'customers-check.json'), JSON.stringify({ tables, customerColumns }, null, 2));
db.close();
