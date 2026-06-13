const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
connectionString: process.env.DATABASE_URL,
ssl: {
rejectUnauthorized: false
}
});

// Home Route
app.get('/', (req, res) => {
res.send('Chaiwala API Running');
});

// Get All Vendors
app.get('/api/vendors', async (req, res) => {
try {
const result = await pool.query("SELECT id, name, mobile, city, subscription_expiry FROM vendors");

res.json(result.rows);

} catch (err) {
res.status(500).json({
error: err.message
});
}
});

// Create Order
app.post('/api/order', async (req, res) => {
try {

const {
  vendor_id,
  customer_name,
  customer_mobile,
  cups
} = req.body;

const result = await pool.query(
  `
  INSERT INTO orders
  (
    vendor_id,
    customer_name,
    customer_mobile,
    cups
  )
  VALUES
  ($1,$2,$3,$4)
  RETURNING *
  `,
  [
    vendor_id,
    customer_name,
    customer_mobile,
    cups
  ]
);

res.json(result.rows[0]);

} catch (err) {
res.status(500).json({
error: err.message
});
}
});

// Get All Orders
app.get('/api/orders', async (req, res) => {
try {

const result = await pool.query(
  'SELECT * FROM orders ORDER BY id DESC'
);

res.json(result.rows);

} catch (err) {
res.status(500).json({
error: err.message
});
}
});

// Vendor Specific Orders
app.get('/api/vendor/:id/orders', async (req, res) => {
try {

const vendorId = req.params.id;

const result = await pool.query(
  `
  SELECT *
  FROM orders
  WHERE vendor_id = $1
  ORDER BY id DESC
  `,
  [vendorId]
);

res.json(result.rows);

} catch (err) {
res.status(500).json({
error: err.message
});
}
});

// Vendor Login
app.post('/api/vendor/login', async (req, res) => {
try {

const { mobile, password } = req.body;

const result = await pool.query(
  `
  SELECT *
  FROM vendors
  WHERE mobile = $1
  AND password = $2
  `,
  [mobile, password]
);

if (result.rows.length === 0) {
  return res.status(401).json({
    success: false,
    message: 'Invalid Login'
  });
}

res.json({
  success: true,
  vendor: result.rows[0]
});

} catch (err) {
res.status(500).json({
error: err.message
});
}
});
app.get('/api/test-order', async (req, res) => {

  try {

    const result = await pool.query(
      `
      INSERT INTO orders
      (
        vendor_id,
        customer_name,
        customer_mobile,
        cups
      )
      VALUES
      (
        1,
        'ABC Medical',
        '9876543210',
        5
      )
      RETURNING *
      `
    );

    res.json(result.rows[0]);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
