const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new DatabaseSync(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map((row) => row.name);
fs.writeFileSync(path.join(__dirname, 'tables.txt'), JSON.stringify(tables, null, 2));
db.close();
