require('dotenv').config();
const express  = require('express');
const sqlite3  = require('sqlite3').verbose();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'insurance_secret_2024_change_me';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── DB Setup ─────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'insurance.db');
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) { console.error('DB error:', err); process.exit(1); }
  console.log('📂 DB:', DB_PATH);
});
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

const dbRun = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e){ e?rej(e):res(this); }));
const dbGet = (sql, p=[]) => new Promise((res,rej) => db.get(sql, p, (e,r) => e?rej(e):res(r)));
const dbAll = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r)));

async function initDB() {
  await dbRun(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, full_name TEXT DEFAULT '', role TEXT DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT NOT NULL, type TEXT NOT NULL, plate TEXT NOT NULL, start_date TEXT, end_date TEXT, premium REAL DEFAULT 0, pay_date TEXT, note TEXT DEFAULT '', car_model TEXT DEFAULT '', owner TEXT DEFAULT '', dept_budget TEXT DEFAULT '', dept_use TEXT DEFAULT '', branch TEXT DEFAULT '', tax_due TEXT DEFAULT '', created_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await dbRun(`CREATE TABLE IF NOT EXISTS activity_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT, detail TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  const cnt = await dbGet('SELECT COUNT(*) as n FROM users');
  if (cnt.n === 0) {
    await dbRun('INSERT INTO users (username,password,full_name,role) VALUES (?,?,?,?)', ['admin', bcrypt.hashSync('admin1234',10), 'ผู้ดูแลระบบ', 'admin']);
    await dbRun('INSERT INTO users (username,password,full_name,role) VALUES (?,?,?,?)', ['user1', bcrypt.hashSync('user1234',10), 'ผู้ใช้งาน', 'user']);
    const t = new Date(), fmt = d => d.toISOString().split('T')[0];
    const add = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
    const demos = [
      ['วิริยะประกันภัย','ชั้น 1','กข 1234 กทม',fmt(add(t,-160)),fmt(add(t,205)),18500,fmt(add(t,-160)),'กธ. 12345678','Toyota Camry 2022','บริษัท ABC จำกัด','ฝ่ายบริหาร','ฝ่ายบริหาร','สำนักงานใหญ่',fmt(add(t,20))],
      ['เมืองไทยประกันภัย','ชั้น 3+','ขค 5678 กทม',fmt(add(t,-145)),fmt(add(t,25)),7200,fmt(add(t,-145)),'','Honda Jazz 2020','นายสมชาย ใจดี','ฝ่ายขาย','ฝ่ายขาย','สาขากรุงเทพ',''],
      ['คุ้มภัยประกันภัย','พ.ร.บ.','กข 1234 กทม',fmt(add(t,-160)),fmt(add(t,205)),600,fmt(add(t,-160)),'','Toyota Camry 2022','บริษัท ABC จำกัด','ฝ่ายบริหาร','ฝ่ายบริหาร','สำนักงานใหญ่',''],
      ['ทิพยประกันภัย','ชั้น 2+','คง 9012 เชียงใหม่',fmt(add(t,-120)),fmt(add(t,-5)),9800,fmt(add(t,-120)),'','Isuzu D-Max 2023','บริษัท ABC จำกัด','ฝ่ายปฏิบัติการ','ฝ่ายปฏิบัติการ','สาขาเชียงใหม่',''],
      ['วิริยะประกันภัย','ชั้น 1','งจ 3456 กทม',fmt(add(t,-30)),fmt(add(t,335)),22000,fmt(add(t,-30)),'','Ford Ranger 2024','นางสาวสมหญิง ดีจริง','ฝ่ายบัญชี','ฝ่ายบัญชี','สำนักงานใหญ่',''],
      ['อลิอันซ์ประกันภัย','ชั้น 1','ฉช 1122 กทม',fmt(add(t,-60)),fmt(add(t,305)),25000,fmt(add(t,-60)),'VIP Policy','BMW 320i 2023','นายใหญ่ มีเงิน','ฝ่ายผู้บริหาร','ฝ่ายผู้บริหาร','สำนักงานใหญ่',''],
      ['เมืองไทยประกันภัย','พ.ร.บ.','ขค 5678 กทม',fmt(add(t,-145)),fmt(add(t,25)),600,fmt(add(t,-145)),'','Honda Jazz 2020','นายสมชาย ใจดี','ฝ่ายขาย','ฝ่ายขาย','สาขากรุงเทพ',''],
      ['ทิพยประกันภัย','ชั้น 3+','จฉ 7890 กทม',fmt(add(t,-90)),fmt(add(t,275)),8500,fmt(add(t,-90)),'','Mazda 2 2021','บริษัท ABC จำกัด','ฝ่าย HR','ฝ่าย HR','สำนักงานใหญ่',''],
    ];
    for (const r of demos) await dbRun(`INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`, r);
    console.log('🌱 Seeded demo data');
  }
}

// ─── Auth ──────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' }); }
}
const admin = (req,res,next) => req.user?.role==='admin' ? next() : res.status(403).json({ error: 'Admin only' });
const log = async (uid, action, detail) => { try { await dbRun('INSERT INTO activity_log(user_id,action,detail)VALUES(?,?,?)',[uid,action,detail]); } catch {} };
const wrap = fn => async (req,res,next) => { try { await fn(req,res,next); } catch(e) { console.error(e.message); res.status(500).json({ error: e.message }); } };

// ─── Health ────────────────────────────────────────
app.get('/api/health', (_,res) => res.json({ ok:true, ts: new Date().toISOString() }));

// ─── Auth routes ───────────────────────────────────
app.post('/api/auth/login', wrap(async (req,res) => {
  const { username, password } = req.body||{};
  if (!username||!password) return res.status(400).json({ error: 'กรุณาระบุ username และ password' });
  const u = await dbGet('SELECT * FROM users WHERE username=?',[username]);
  if (!u || !bcrypt.compareSync(password, u.password)) return res.status(401).json({ error: 'Username หรือ Password ไม่ถูกต้อง' });
  const token = jwt.sign({ id:u.id, username:u.username, role:u.role, fullName:u.full_name }, JWT_SECRET, { expiresIn:'8h' });
  await log(u.id,'LOGIN',`${u.username} logged in`);
  res.json({ token, user:{ id:u.id, username:u.username, role:u.role, fullName:u.full_name } });
}));

app.get('/api/auth/me', auth, wrap(async (req,res) => res.json(req.user)));

// ─── Records routes ────────────────────────────────
app.get('/api/records', auth, wrap(async (req,res) => {
  const { search, type, status } = req.query;
  let sql = 'SELECT * FROM records WHERE 1=1', p = [];
  if (search) { sql+=' AND (plate LIKE ? OR company LIKE ? OR car_model LIKE ? OR owner LIKE ?)'; const s=`%${search}%`; p.push(s,s,s,s); }
  if (type)   { sql+=' AND type=?'; p.push(type); }
  sql += ' ORDER BY created_at DESC';
  let rows = await dbAll(sql, p);
  if (status) {
    const now = new Date();
    rows = rows.filter(r => {
      if (!r.end_date) return false;
      const d = Math.ceil((new Date(r.end_date)-now)/86400000);
      if (status==='expired')  return d<0;
      if (status==='expiring') return d>=0&&d<=30;
      if (status==='active')   return d>30;
      return true;
    });
  }
  res.json(rows);
}));

app.get('/api/records/:id', auth, wrap(async (req,res) => {
  const r = await dbGet('SELECT * FROM records WHERE id=?',[req.params.id]);
  if (!r) return res.status(404).json({ error:'Not found' });
  res.json(r);
}));

app.post('/api/records', auth, wrap(async (req,res) => {
  const r = req.body||{};
  if (!r.company||!r.type||!r.plate) return res.status(400).json({ error:'กรุณากรอกข้อมูลที่จำเป็น' });
  const result = await dbRun(`INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null,req.user.id]);
  await log(req.user.id,'CREATE',`Added ${r.plate} (${r.company})`);
  res.json({ id:result.lastID, ...r });
}));

app.put('/api/records/:id', auth, wrap(async (req,res) => {
  const r = req.body||{};
  if (!await dbGet('SELECT id FROM records WHERE id=?',[req.params.id])) return res.status(404).json({ error:'Not found' });
  await dbRun(`UPDATE records SET company=?,type=?,plate=?,start_date=?,end_date=?,premium=?,pay_date=?,note=?,car_model=?,owner=?,dept_budget=?,dept_use=?,branch=?,tax_due=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,[r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null,req.params.id]);
  await log(req.user.id,'UPDATE',`Updated record ${req.params.id} (${r.plate})`);
  res.json({ success:true });
}));

app.delete('/api/records/:id', auth, wrap(async (req,res) => {
  const ex = await dbGet('SELECT plate FROM records WHERE id=?',[req.params.id]);
  if (!ex) return res.status(404).json({ error:'Not found' });
  await dbRun('DELETE FROM records WHERE id=?',[req.params.id]);
  await log(req.user.id,'DELETE',`Deleted ${req.params.id} (${ex.plate})`);
  res.json({ success:true });
}));

app.post('/api/records/import', auth, wrap(async (req,res) => {
  const { rows } = req.body||{};
  if (!Array.isArray(rows)||!rows.length) return res.status(400).json({ error:'ไม่มีข้อมูล' });
  let ok=0, fail=0;
  for (const r of rows) {
    if (!r.company||!r.type||!r.plate) { fail++; continue; }
    try { await dbRun(`INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null,req.user.id]); ok++; } catch { fail++; }
  }
  await log(req.user.id,'IMPORT',`Imported ${ok} records`);
  res.json({ ok, fail });
}));

// ─── Summary ───────────────────────────────────────
app.get('/api/summary/dashboard', auth, wrap(async (req,res) => {
  const total = (await dbGet('SELECT COUNT(*) AS n FROM records')).n;
  const totalPremium = (await dbGet('SELECT COALESCE(SUM(premium),0) AS s FROM records')).s;
  const today = new Date().toISOString().split('T')[0];
  const in30 = new Date(); in30.setDate(in30.getDate()+30);
  const expiring = (await dbGet('SELECT COUNT(*) AS n FROM records WHERE end_date>=? AND end_date<=?',[today,in30.toISOString().split('T')[0]])).n;
  const expired  = (await dbGet('SELECT COUNT(*) AS n FROM records WHERE end_date<?',[today])).n;
  res.json({ total, totalPremium, expiring, expired });
}));

app.get('/api/summary/monthly', auth, wrap(async (req,res) => {
  const year = req.query.year || new Date().getFullYear();
  res.json(await dbAll(`SELECT strftime('%m',pay_date) AS month,type,SUM(premium) AS total,COUNT(*) AS cnt FROM records WHERE pay_date IS NOT NULL AND strftime('%Y',pay_date)=? GROUP BY month,type ORDER BY month`,[String(year)]));
}));

app.get('/api/summary/yearly', auth, wrap(async (req,res) => {
  res.json(await dbAll(`SELECT strftime('%Y',pay_date) AS year,type,SUM(premium) AS total,COUNT(*) AS cnt FROM records WHERE pay_date IS NOT NULL GROUP BY year,type ORDER BY year`));
}));

// ─── Users (admin) ─────────────────────────────────
app.get('/api/users', auth, admin, wrap(async (req,res) => res.json(await dbAll('SELECT id,username,full_name,role,created_at FROM users'))));

app.post('/api/users', auth, admin, wrap(async (req,res) => {
  const { username, password, full_name, role } = req.body||{};
  if (!username||!password) return res.status(400).json({ error:'กรุณาระบุ username และ password' });
  try {
    const r = await dbRun('INSERT INTO users (username,password,full_name,role) VALUES (?,?,?,?)',[username,bcrypt.hashSync(password,10),full_name||'',role||'user']);
    res.json({ id:r.lastID });
  } catch(e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error:'Username นี้มีอยู่แล้ว' });
    throw e;
  }
}));

app.delete('/api/users/:id', auth, admin, wrap(async (req,res) => {
  if (Number(req.params.id)===req.user.id) return res.status(400).json({ error:'ไม่สามารถลบตัวเองได้' });
  await dbRun('DELETE FROM users WHERE id=?',[req.params.id]);
  res.json({ success:true });
}));

// ─── Logs ──────────────────────────────────────────
app.get('/api/logs', auth, admin, wrap(async (req,res) => {
  res.json(await dbAll(`SELECT l.*,u.username,u.full_name FROM activity_log l LEFT JOIN users u ON l.user_id=u.id ORDER BY l.created_at DESC LIMIT 100`));
}));

// ─── SPA ───────────────────────────────────────────
app.get('*', (_,res) => res.sendFile(path.join(__dirname,'public','index.html')));

// ─── Start ─────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚗 Insurance System v2.1 running on port ${PORT}\n  👤 admin/admin1234  |  user1/user1234\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
