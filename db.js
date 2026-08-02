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
      image TEXT
    );
  `);

  connection.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_no INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      address TEXT NOT NULL,
      email TEXT,
      phone_number TEXT
    );
  `);

  const productColumns = connection.prepare('PRAGMA table_info(products)').all().map((column) => column.name);
  if (productColumns.includes('emoji') || productColumns.includes('color')) {
    connection.exec(`
      CREATE TABLE products_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        desc TEXT NOT NULL,
        image TEXT
      );
      INSERT INTO products_new (id, name, price, quantity, desc, image)
      SELECT id, name, price, quantity, desc, image FROM products;
      DROP TABLE products;
      ALTER TABLE products_new RENAME TO products;
    `);
  }

  const orderColumns = connection.prepare('PRAGMA table_info(orders)').all();
  const columnNames = orderColumns.map((column) => column.name);
  const hasProductId = columnNames.includes('product_id');

  if (!hasProductId) {
    const hasPayload = columnNames.includes('payload');
    if (hasPayload) {
      connection.exec(`
        DROP TABLE IF EXISTS orders_new;
        CREATE TABLE orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          total_price REAL NOT NULL,
          customer_name TEXT,
          address TEXT,
          phone_number TEXT,
          order_date TEXT
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
          total_price REAL NOT NULL,
          customer_name TEXT,
          address TEXT,
          phone_number TEXT,
          order_date TEXT
        );
      `);
    }
  }

  const updatedOrderColumns = connection.prepare('PRAGMA table_info(orders)').all();
  const updatedColumnNames = updatedOrderColumns.map((column) => column.name);
  const needsExpandedColumns = ['customer_name', 'address', 'phone_number', 'order_date'].some((column) => !updatedColumnNames.includes(column));
  if (needsExpandedColumns) {
    connection.exec(`
      ALTER TABLE orders ADD COLUMN customer_name TEXT;
      ALTER TABLE orders ADD COLUMN address TEXT;
      ALTER TABLE orders ADD COLUMN phone_number TEXT;
      ALTER TABLE orders ADD COLUMN order_date TEXT;
    `);
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
      INSERT INTO products (name, price, quantity, desc, image)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const product of products || []) {
      insert.run(
        product.name,
        Number(product.price),
        Number(product.quantity || 0),
        product.desc || '',
        product.image || null
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
    const customerName = order?.customer?.name || order?.customer_name || order?.name || '';
    const address = order?.customer?.address || order?.address || '';
    const phoneNumber = order?.customer?.phone || order?.phone_number || order?.phone || '';
    const orderDate = order?.createdAt || order?.order_date || new Date().toISOString();

    for (const item of items) {
      const productId = Number(item?.product_id ?? item?.productId ?? item?.id ?? order?.product_id ?? order?.productId ?? order?.id ?? 0);
      const quantity = Number(item?.quantity ?? order?.quantity ?? 1);
      const unitPrice = Number(item?.price ?? order?.price ?? 0);
      const totalPrice = Number(item?.total_price ?? item?.totalPrice ?? order?.total_price ?? order?.totalPrice ?? unitPrice * quantity);

      const result = connection.prepare(
        'INSERT INTO orders (product_id, quantity, total_price, customer_name, address, phone_number, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(productId, quantity, totalPrice, customerName, address, phoneNumber, orderDate);
      insertedIds.push(result.lastInsertRowid);
    }

    if (customerName || address || phoneNumber) {
      const customerInsert = connection.prepare(
        'INSERT INTO customers (customer_name, address, email, phone_number) VALUES (?, ?, ?, ?)'
      );
      customerInsert.run(customerName, address, order?.customer?.email || '', phoneNumber);
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
