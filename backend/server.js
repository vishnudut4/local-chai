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
const customerCheck = await pool.query(
"SELECT * FROM customers WHERE vendor_id=$1 AND customer_mobile=$2",
[vendor_id, customer_mobile]
);

if(customerCheck.rows.length === 0){

await pool.query(
"INSERT INTO customers (vendor_id, customer_name, customer_mobile) VALUES ($1,$2,$3)",
[vendor_id, customer_name, customer_mobile]
);

}
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
app.get('/api/vendor/:id/ledger', async (req,res)=>{

try{

const vendorId = req.params.id;

const result = await pool.query(
`
SELECT *
FROM ledger
WHERE vendor_id=$1
ORDER BY id DESC
`,
[vendorId]
);

res.json(result.rows);

}catch(err){

res.status(500).json({
error:err.message
});

}

});
app.get('/api/vendor/:id/customer-balances', async (req,res)=>{

try{

const vendorId = req.params.id;

const result = await pool.query(
`
SELECT
customer_name,
customer_mobile,
COALESCE(SUM(amount),0) as due
FROM ledger
WHERE vendor_id=$1
GROUP BY customer_name, customer_mobile
ORDER BY customer_name
`,
[vendorId]
);

res.json(result.rows);

}catch(err){

res.status(500).json({
error:err.message
});

}

});

app.put('/api/order/:id/delivered', async (req,res)=>{

try{

const orderId = req.params.id;

const orderResult = await pool.query(
"UPDATE orders SET status='Delivered' WHERE id=$1 RETURNING *",
[orderId]
);

const order = orderResult.rows[0];

const amount = order.cups * 10;

await pool.query(
"INSERT INTO ledger ( vendor_id, customer_name, customer_mobile, amount, type ) VALUES ($1,$2,$3,$4,$5)",
[
order.vendor_id,
order.customer_name,
order.customer_mobile,
amount,
'Due'
]
);

res.json(order);

}catch(err){

res.status(500).json({
error:err.message
});

}

});
// Vendor Registration
app.post('/api/vendor/register', async (req, res) => {

  try {

    const {
      name,
      mobile,
      city,
      password
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO vendors
      (
        name,
        mobile,
        city,
        password,
        subscription_expiry
      )
      VALUES
      (
        $1,$2,$3,$4,
        CURRENT_DATE + INTERVAL '30 days'
      )
      RETURNING *
      `,
      [
        name,
        mobile,
        city,
        password
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});
// Total Vendors
app.get('/api/admin/vendors/count', async (req,res)=>{

  try{

    const result = await pool.query(
      'SELECT COUNT(*) FROM vendors'
    );

    res.json(result.rows[0]);

  }catch(err){

    res.status(500).json({
      error:err.message
    });

  }

});

// Total Orders
app.get('/api/admin/orders/count', async (req,res)=>{

  try{

    const result = await pool.query(
      'SELECT COUNT(*) FROM orders'
    );

    res.json(result.rows[0]);

  }catch(err){

    res.status(500).json({
      error:err.message
    });

  }

});

// Pending Orders
app.get('/api/admin/orders/pending', async (req,res)=>{

  try{

    const result = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status='Pending'"
    );

    res.json(result.rows[0]);

  }catch(err){

    res.status(500).json({
      error:err.message
    });

  }

});

// Delivered Orders
app.get('/api/admin/orders/delivered', async (req,res)=>{

  try{

    const result = await pool.query(
      "SELECT COUNT(*) FROM orders WHERE status='Delivered'"
    );

    res.json(result.rows[0]);

  }catch(err){

    res.status(500).json({
      error:err.message
    });

  }

});
app.post('/api/payment', async (req,res)=>{

try{

const {
vendor_id,
customer_name,
amount
} = req.body;

const result = await pool.query(
`
INSERT INTO payments
(
vendor_id,
customer_name,
amount
)
VALUES
($1,$2,$3)
RETURNING *
`,
[
vendor_id,
customer_name,
amount
]
);

res.json(result.rows[0]);

}catch(err){

res.status(500).json({
error:err.message
});

}

});
app.get('/api/vendor/:id/customer-balance', async (req,res)=>{

try{

const vendorId = req.params.id;

const dueResult = await pool.query(
"SELECT customer_name, COALESCE(SUM(amount),0) as due FROM ledger WHERE vendor_id=$1 GROUP BY customer_name",
[vendorId]
);

const paymentResult = await pool.query(
"SELECT customer_name, COALESCE(SUM(amount),0) as paid FROM payments WHERE vendor_id=$1 GROUP BY customer_name",
[vendorId]
);

res.json({
due: dueResult.rows,
paid: paymentResult.rows
});

}catch(err){

res.status(500).json({ error: err.message });

}

});

app.get('/api/vendor/:id/dashboard', async (req,res)=>{

try{

const vendorId = req.params.id;

const salesResult = await pool.query(
"SELECT COALESCE(SUM(amount),0) as sales FROM ledger WHERE vendor_id=$1",
[vendorId]
);

const customerResult = await pool.query(
"SELECT COUNT(DISTINCT customer_name) as customers FROM ledger WHERE vendor_id=$1",
[vendorId]
);

res.json({
sales: salesResult.rows[0].sales,
customers: customerResult.rows[0].customers
});

}catch(err){

res.status(500).json({ error: err.message });

}

});

app.get('/api/vendor/:id/customer-balances', async (req,res)=>{

try{

const vendorId = req.params.id;

const result = await pool.query(
"SELECT customer_name, customer_mobile, COALESCE(SUM(amount),0) as due FROM ledger WHERE vendor_id=$1 GROUP BY customer_name, customer_mobile ORDER BY customer_name",
[vendorId]
);

res.json(result.rows);

}catch(err){

res.status(500).json({ error: err.message });

}

});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
