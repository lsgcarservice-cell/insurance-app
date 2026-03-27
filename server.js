const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new Database('db.sqlite');

// ===== INIT TABLES =====
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT
)`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  phone TEXT,
  car TEXT,
  created_at TEXT
)`).run();

// ===== SEED ADMIN =====
const admin = db.prepare("SELECT * FROM users WHERE username=?").get("admin");
if (!admin) {
  db.prepare("INSERT INTO users (username,password,role) VALUES (?,?,?)")
    .run("admin", "admin1234", "admin");
  console.log("✅ admin/admin1234 created");
}

// ===== ROUTES =====
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/users', require('./routes/users')(db));
app.use('/api/customers', require('./routes/customers')(db));

// ===== START =====
app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 Server started")
);
db.prepare(`
CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  car_value REAL,
  type TEXT,
  premium REAL,
  vat REAL,
  total REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`).run();