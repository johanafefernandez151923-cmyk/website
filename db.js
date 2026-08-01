const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');

function ensureSchema(connection) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      desc TEXT NOT NULL,
      image TEXT,
      emoji TEXT,
      color TEXT NOT NULL
    );
  `);

  const orderColumns = connection.prepare('PRAGMA table_info(orders)').all();
  const hasProductId = orderColumns.some((column) => column.name === 'product_id');

  if (!hasProductId) {
    const hasPayload = orderColumns.some((column) => column.name === 'payload');
    if (hasPayload) {
      connection.exec(`
        DROP TABLE IF EXISTS orders_new;
        CREATE TABLE orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          total_price REAL NOT NULL
        );
        INSERT INTO orders_new (product_id, quantity, total_price)
        SELECT
          COALESCE(CAST(json_extract(payload, '$.product_id') AS INTEGER), CAST(json_extract(payload, '$.productId') AS INTEGER), CAST(json_extract(payload, '$.id') AS INTEGER), 0),
          COALESCE(CAST(json_extract(payload, '$.quantity') AS INTEGER), 1),
          COALESCE(CAST(json_extract(payload, '$.total_price') AS REAL), CAST(json_extract(payload, '$.totalPrice') AS REAL), CAST(json_extract(payload, '$.totals.total') AS REAL), 0)
        FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_new RENAME TO orders;
      `);
    } else {
      connection.exec(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          total_price REAL NOT NULL
        );
      `);
    }
  }
}

function withConnection(callback) {
  const connection = new DatabaseSync(dbPath);
  try {
    ensureSchema(connection);
    return callback(connection);
  } finally {
    connection.close();
  }
}

function getProducts() {
  return withConnection((connection) => connection.prepare('SELECT * FROM products ORDER BY id DESC').all());
}

function upsertProducts(products) {
  return withConnection((connection) => {
    connection.exec('DELETE FROM products');
    const insert = connection.prepare(`
      INSERT INTO products (name, price, quantity, desc, image, emoji, color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const product of products || []) {
      insert.run(
        product.name,
        Number(product.price),
        Number(product.quantity || 0),
        product.desc || '',
        product.image || null,
        product.emoji || null,
        product.color || 'linear-gradient(135deg, #8ecae6, #219ebc)'
      );
    }

    return getProducts();
  });
}

function getOrders() {
  return withConnection((connection) => connection.prepare('SELECT * FROM orders ORDER BY id DESC').all());
}

function addOrder(order) {
  const items = Array.isArray(order?.items) ? order.items : [order];

  return withConnection((connection) => {
    const insertedIds = [];
    for (const item of items) {
      const productId = Number(item?.product_id ?? item?.productId ?? item?.id ?? order?.product_id ?? order?.productId ?? order?.id ?? 0);
      const quantity = Number(item?.quantity ?? order?.quantity ?? 1);
      const unitPrice = Number(item?.price ?? order?.price ?? 0);
      const totalPrice = Number(item?.total_price ?? item?.totalPrice ?? order?.total_price ?? order?.totalPrice ?? unitPrice * quantity);

      const result = connection.prepare('INSERT INTO orders (product_id, quantity, total_price) VALUES (?, ?, ?)').run(productId, quantity, totalPrice);
      insertedIds.push(result.lastInsertRowid);
    }

    return { ids: insertedIds };
  });
}

function resetOrders() {
  return withConnection((connection) => {
    connection.exec('DELETE FROM orders');
    return true;
  });
}

module.exports = {
  getProducts,
  upsertProducts,
  getOrders,
  addOrder,
  resetOrders,
  dbPath,
};
