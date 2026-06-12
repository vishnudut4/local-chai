const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
  res.send('Chaiwala API Running');
});
app.get('/api/vendors', async (req, res) => {

  const result = await pool.query(
    'SELECT * FROM vendors'
  );

  res.json(result.rows);

});
app.listen(process.env.PORT || 3000, () => {
  console.log('Server Started');
});
