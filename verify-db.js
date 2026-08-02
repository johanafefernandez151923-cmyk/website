const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { getProducts } = require('./db');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new DatabaseSync(dbPath);
const columns = db.prepare('PRAGMA table_info(products)').all().map((column) => column.name);
console.log(JSON.stringify(columns));
console.log('products=' + getProducts().length);
db.close();
