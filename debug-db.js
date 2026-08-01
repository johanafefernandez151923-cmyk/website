const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data.sqlite');
console.log('dbPath=' + dbPath);
console.log('existsBefore=' + fs.existsSync(dbPath));
const db = new DatabaseSync(dbPath);
console.log('tables=' + JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()));
db.exec('CREATE TABLE IF NOT EXISTS debug_test (id INTEGER PRIMARY KEY, value TEXT)');
db.prepare('INSERT INTO debug_test(value) VALUES (?)').run('hello');
console.log('rows=' + JSON.stringify(db.prepare('SELECT * FROM debug_test').all()));
console.log('existsAfter=' + fs.existsSync(dbPath));
console.log('size=' + fs.statSync(dbPath).size);
