const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Crear tabla
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        opcode TEXT UNIQUE NOT NULL,
        username TEXT,
        product TEXT,
        status TEXT DEFAULT 'pending',
        licensekey TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Base de datos lista');
  } catch (e) {
    console.error(e);
  }
}
initDB();

// Crear pago desde el programa
app.post('/api/payment', async (req, res) => {
  const { opcode, username, product } = req.body;
  if (!opcode || !username) return res.status(400).json({success: false});

  try {
    await pool.query(
      'INSERT INTO payments (opcode, username, product) VALUES ($1, $2, $3)',
      [opcode, username, product || 'General']
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: 'Código ya usado' });
  }
});

// Consultar licencia
app.get('/api/check/:opcode', async (req, res) => {
  const result = await pool.query('SELECT * FROM payments WHERE opcode = $1', [req.params.opcode]);
  res.json(result.rows[0] || { error: "No encontrado" });
});

// Pagos pendientes para el admin
app.get('/api/pending', async (req, res) => {
  const result = await pool.query("SELECT * FROM payments WHERE status = 'pending'");
  res.json(result.rows);
});

// Aprobar pago
app.post('/api/approve', async (req, res) => {
  const { opcode, licensekey } = req.body;
  await pool.query(
    "UPDATE payments SET status = 'approved', licensekey = $1 WHERE opcode = $2",
    [licensekey, opcode]
  );
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 OrgasmoNet Backend corriendo en puerto ${PORT}`);
});
