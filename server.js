require('dotenv').config();
const express    = require('express');
const Database   = require('better-sqlite3');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'insurance_secret_2024_change_me';

// ─── Middleware ────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Database ─────────────────────────────────────
const db = new Database(path.join(__dirname, 'insurance.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Init tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    UNIQUE NOT NULL,
    password  TEXT    NOT NULL,
    full_name TEXT    NOT NULL DEFAULT '',
    role      TEXT    NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS records (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company     TEXT NOT NULL,
    type        TEXT NOT NULL,
    plate       TEXT NOT NULL,
    start_date  TEXT,
    end_date    TEXT,
    premium     REAL  DEFAULT 0,
    pay_date    TEXT,
    note        TEXT  DEFAULT '',
    car_model   TEXT  DEFAULT '',
    owner       TEXT  DEFAULT '',
    dept_budget TEXT  DEFAULT '',
    dept_use    TEXT  DEFAULT '',
    branch      TEXT  DEFAULT '',
    tax_due     TEXT  DEFAULT '',
    created_by  INTEGER REFERENCES users(id),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    action     TEXT,
    detail     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default admin if no users
const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (userCount.cnt === 0) {
  const hash = bcrypt.hashSync('admin1234', 10);
  db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)`)
    .run('admin', hash, 'ผู้ดูแลระบบ', 'admin');
  db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)`)
    .run('user1', bcrypt.hashSync('user1234', 10), 'ผู้ใช้งาน', 'user');
  console.log('🌱 Seeded default users: admin/admin1234, user1/user1234');

  // Seed demo records
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
  const demoRecords = [
    ['วิริยะประกันภัย','ชั้น 1','กข 1234 กทม', fmt(addDays(today,-160)), fmt(addDays(today,205)), 18500, fmt(addDays(today,-160)),'กธ. 12345678','Toyota Camry 2022','บริษัท ABC จำกัด','ฝ่ายบริหาร','ฝ่ายบริหาร','สำนักงานใหญ่',fmt(addDays(today,20))],
    ['เมืองไทยประกันภัย','ชั้น 3+','ขค 5678 กทม', fmt(addDays(today,-145)), fmt(addDays(today,25)), 7200, fmt(addDays(today,-145)),'','Honda Jazz 2020','นายสมชาย ใจดี','ฝ่ายขาย','ฝ่ายขาย','สาขากรุงเทพ',''],
    ['คุ้มภัยประกันภัย','พ.ร.บ.','กข 1234 กทม', fmt(addDays(today,-160)), fmt(addDays(today,205)), 600, fmt(addDays(today,-160)),'','Toyota Camry 2022','บริษัท ABC จำกัด','ฝ่ายบริหาร','ฝ่ายบริหาร','สำนักงานใหญ่',''],
    ['ทิพยประกันภัย','ชั้น 2+','คง 9012 เชียงใหม่', fmt(addDays(today,-120)), fmt(addDays(today,-5)), 9800, fmt(addDays(today,-120)),'','Isuzu D-Max 2023','บริษัท ABC จำกัด','ฝ่ายปฏิบัติการ','ฝ่ายปฏิบัติการ','สาขาเชียงใหม่',''],
    ['วิริยะประกันภัย','ชั้น 1','งจ 3456 กทม', fmt(addDays(today,-30)), fmt(addDays(today,335)), 22000, fmt(addDays(today,-30)),'','Ford Ranger 2024','นางสาวสมหญิง ดีจริง','ฝ่ายบัญชี','ฝ่ายบัญชี','สำนักงานใหญ่',''],
    ['อลิอันซ์ประกันภัย','ชั้น 1','ฉช 1122 กทม', fmt(addDays(today,-60)), fmt(addDays(today,305)), 25000, fmt(addDays(today,-60)),'VIP Policy','BMW 320i 2023','นายใหญ่ มีเงิน','ฝ่ายผู้บริหาร','ฝ่ายผู้บริหาร','สำนักงานใหญ่',''],
    ['เมืองไทยประกันภัย','พ.ร.บ.','ขค 5678 กทม', fmt(addDays(today,-145)), fmt(addDays(today,25)), 600, fmt(addDays(today,-145)),'','Honda Jazz 2020','นายสมชาย ใจดี','ฝ่ายขาย','ฝ่ายขาย','สาขากรุงเทพ',''],
    ['ทิพยประกันภัย','ชั้น 3+','จฉ 7890 กทม', fmt(addDays(today,-90)), fmt(addDays(today,275)), 8500, fmt(addDays(today,-90)),'','Mazda 2 2021','บริษัท ABC จำกัด','ฝ่าย HR','ฝ่าย HR','สำนักงานใหญ่',''],
  ];
  const insertRec = db.prepare(`INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
  demoRecords.forEach(r => insertRec.run(...r));
  console.log('🌱 Seeded demo records');
}

// ─── Auth Middleware ───────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

function log(userId, action, detail) {
  try { db.prepare('INSERT INTO activity_log (user_id,action,detail) VALUES (?,?,?)').run(userId, action, detail); } catch {}
}

// ─── AUTH ROUTES ──────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'กรุณาระบุ username และ password' });
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Username หรือ Password ไม่ถูกต้อง' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, fullName: user.full_name }, JWT_SECRET, { expiresIn: '8h' });
  log(user.id, 'LOGIN', `${user.username} logged in`);
  res.json({ token, user: { id:user.id, username:user.username, role:user.role, fullName:user.full_name } });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json(req.user);
});

// ─── RECORDS ROUTES ───────────────────────────────
app.get('/api/records', auth, (req, res) => {
  const { search, type, status } = req.query;
  let q = 'SELECT * FROM records WHERE 1=1';
  const params = [];
  if (search) { q += ' AND (plate LIKE ? OR company LIKE ? OR car_model LIKE ? OR owner LIKE ?)'; const s=`%${search}%`; params.push(s,s,s,s); }
  if (type)   { q += ' AND type=?'; params.push(type); }
  q += ' ORDER BY created_at DESC';
  let rows = db.prepare(q).all(...params);
  if (status) {
    const today = new Date();
    rows = rows.filter(r => {
      if (!r.end_date) return status==='unknown';
      const d = Math.ceil((new Date(r.end_date)-today)/86400000);
      if (status==='expired')  return d < 0;
      if (status==='expiring') return d >= 0 && d <= 30;
      if (status==='active')   return d > 30;
      return true;
    });
  }
  res.json(rows);
});

app.get('/api/records/:id', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM records WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.post('/api/records', auth, (req, res) => {
  const r = req.body;
  if (!r.company||!r.type||!r.plate) return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็น' });
  const result = db.prepare(`
    INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null,req.user.id);
  log(req.user.id,'CREATE',`Added ${r.plate} (${r.company})`);
  res.json({ id: result.lastInsertRowid, ...r });
});

app.put('/api/records/:id', auth, (req, res) => {
  const r = req.body;
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM records WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(`
    UPDATE records SET company=?,type=?,plate=?,start_date=?,end_date=?,premium=?,pay_date=?,note=?,
    car_model=?,owner=?,dept_budget=?,dept_use=?,branch=?,tax_due=?,updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null,id);
  log(req.user.id,'UPDATE',`Updated record ${id} (${r.plate})`);
  res.json({ success: true });
});

app.delete('/api/records/:id', auth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT plate FROM records WHERE id=?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM records WHERE id=?').run(id);
  log(req.user.id,'DELETE',`Deleted record ${id} (${existing.plate})`);
  res.json({ success: true });
});

// Bulk import from xlsx parse result
app.post('/api/records/import', auth, (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length===0) return res.status(400).json({ error: 'ไม่มีข้อมูล' });
  const insert = db.prepare(`
    INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const importMany = db.transaction(recs => {
    let ok=0, fail=0;
    for (const r of recs) {
      if (!r.company||!r.type||!r.plate) { fail++; continue; }
      try {
        insert.run(r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null,req.user.id);
        ok++;
      } catch { fail++; }
    }
    return { ok, fail };
  });
  const result = importMany(rows);
  log(req.user.id,'IMPORT',`Imported ${result.ok} records`);
  res.json(result);
});

// ─── SUMMARY ROUTES ───────────────────────────────
app.get('/api/summary/monthly', auth, (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const rows = db.prepare(`
    SELECT strftime('%m',pay_date) AS month, type, SUM(premium) AS total, COUNT(*) AS cnt
    FROM records WHERE pay_date IS NOT NULL AND strftime('%Y',pay_date)=?
    GROUP BY month, type ORDER BY month
  `).all(String(year));
  res.json(rows);
});

app.get('/api/summary/yearly', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y',pay_date) AS year, type, SUM(premium) AS total, COUNT(*) AS cnt
    FROM records WHERE pay_date IS NOT NULL
    GROUP BY year, type ORDER BY year
  `).all();
  res.json(rows);
});

app.get('/api/summary/dashboard', auth, (req, res) => {
  const total       = db.prepare('SELECT COUNT(*) AS n FROM records').get().n;
  const totalPremium= db.prepare('SELECT COALESCE(SUM(premium),0) AS s FROM records').get().s;
  const today       = new Date().toISOString().split('T')[0];
  const in30        = new Date(); in30.setDate(in30.getDate()+30);
  const expiring    = db.prepare("SELECT COUNT(*) AS n FROM records WHERE end_date>=? AND end_date<=?").get(today, in30.toISOString().split('T')[0]).n;
  const expired     = db.prepare("SELECT COUNT(*) AS n FROM records WHERE end_date<?").get(today).n;
  res.json({ total, totalPremium, expiring, expired });
});

// ─── USERS ROUTES (admin only) ────────────────────
app.get('/api/users', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id,username,full_name,role,created_at FROM users').all());
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username||!password) return res.status(400).json({ error: 'กรุณาระบุ username และ password' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username,password,full_name,role) VALUES (?,?,?,?)').run(username, hash, full_name||'', role||'user');
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username นี้มีอยู่แล้ว' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  if (Number(req.params.id)===req.user.id) return res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/users/:id/password', auth, adminOnly, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'กรุณาระบุ password ใหม่' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ success: true });
});

// ─── ACTIVITY LOG ─────────────────────────────────
app.get('/api/logs', auth, adminOnly, (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, u.username, u.full_name FROM activity_log l
    LEFT JOIN users u ON l.user_id=u.id
    ORDER BY l.created_at DESC LIMIT 100
  `).all();
  res.json(rows);
});

// ─── SPA fallback ─────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────────┐
  │  🚗 ระบบจัดการประกันภัยรถยนต์ v2.0     │
  │  🌐 http://localhost:${PORT}                │
  │  👤 admin / admin1234                   │
  │  👤 user1 / user1234                    │
  └─────────────────────────────────────────┘
  `);
});
