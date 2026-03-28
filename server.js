require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── DB ────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'insurance.db');
const db = new sqlite3.Database(DB_PATH, err => {
  if (err) { console.error('DB error:', err); process.exit(1); }
  console.log('📂 DB:', DB_PATH);
});
db.run('PRAGMA journal_mode=WAL');

const dbRun = (sql, p=[]) => new Promise((res,rej) => db.run(sql, p, function(e){ e?rej(e):res(this); }));
const dbGet = (sql, p=[]) => new Promise((res,rej) => db.get(sql, p, (e,r) => e?rej(e):res(r)));
const dbAll = (sql, p=[]) => new Promise((res,rej) => db.all(sql, p, (e,r) => e?rej(e):res(r)));
const wrap  = fn => async (req,res,next) => { try { await fn(req,res,next); } catch(e) { console.error(e.message); res.status(500).json({ error: e.message }); } };

async function initDB() {
  await dbRun(`CREATE TABLE IF NOT EXISTS records (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    company     TEXT NOT NULL,
    type        TEXT NOT NULL,
    plate       TEXT NOT NULL,
    start_date  TEXT,
    end_date    TEXT,
    premium     REAL DEFAULT 0,
    pay_date    TEXT,
    note        TEXT DEFAULT '',
    car_model   TEXT DEFAULT '',
    owner       TEXT DEFAULT '',
    dept_budget TEXT DEFAULT '',
    dept_use    TEXT DEFAULT '',
    branch      TEXT DEFAULT '',
    tax_due     TEXT DEFAULT '',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const cnt = (await dbGet('SELECT COUNT(*) as n FROM records')).n;
  if (cnt === 0) {
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
    for (const r of demos) {
      await dbRun(`INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, r);
    }
    console.log('🌱 Seeded demo records');
  }
  console.log('✅ DB ready, records:', cnt || 'seeded');
}

// ─── Health ────────────────────────────────────────
app.get('/api/health', (_,res) => res.json({ ok:true, ts: new Date().toISOString() }));

// ─── Records ───────────────────────────────────────
app.get('/api/records', wrap(async (req,res) => {
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

app.get('/api/records/:id', wrap(async (req,res) => {
  const r = await dbGet('SELECT * FROM records WHERE id=?',[req.params.id]);
  if (!r) return res.status(404).json({ error:'Not found' });
  res.json(r);
}));

app.post('/api/records', wrap(async (req,res) => {
  const r = req.body||{};
  if (!r.company||!r.type||!r.plate) return res.status(400).json({ error:'กรุณากรอกข้อมูลที่จำเป็น' });
  const result = await dbRun(
    `INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null]
  );
  res.json({ id:result.lastID, ...r });
}));

app.put('/api/records/:id', wrap(async (req,res) => {
  const r = req.body||{};
  if (!await dbGet('SELECT id FROM records WHERE id=?',[req.params.id])) return res.status(404).json({ error:'Not found' });
  await dbRun(
    `UPDATE records SET company=?,type=?,plate=?,start_date=?,end_date=?,premium=?,pay_date=?,note=?,car_model=?,owner=?,dept_budget=?,dept_use=?,branch=?,tax_due=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    [r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null,req.params.id]
  );
  res.json({ success:true });
}));

app.delete('/api/records/:id', wrap(async (req,res) => {
  const ex = await dbGet('SELECT id FROM records WHERE id=?',[req.params.id]);
  if (!ex) return res.status(404).json({ error:'Not found' });
  await dbRun('DELETE FROM records WHERE id=?',[req.params.id]);
  res.json({ success:true });
}));

app.post('/api/records/import', wrap(async (req,res) => {
  const { rows } = req.body||{};
  if (!Array.isArray(rows)||!rows.length) return res.status(400).json({ error:'ไม่มีข้อมูล' });
  let ok=0, fail=0;
  for (const r of rows) {
    if (!r.company||!r.type||!r.plate) { fail++; continue; }
    try {
      await dbRun(`INSERT INTO records (company,type,plate,start_date,end_date,premium,pay_date,note,car_model,owner,dept_budget,dept_use,branch,tax_due) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[r.company,r.type,r.plate,r.start_date||null,r.end_date||null,Number(r.premium||0),r.pay_date||null,r.note||'',r.car_model||'',r.owner||'',r.dept_budget||'',r.dept_use||'',r.branch||'',r.tax_due||null]);
      ok++;
    } catch { fail++; }
  }
  res.json({ ok, fail });
}));

// ─── Summary ───────────────────────────────────────
app.get('/api/summary/dashboard', wrap(async (req,res) => {
  const total        = (await dbGet('SELECT COUNT(*) AS n FROM records')).n;
  const totalPremium = (await dbGet('SELECT COALESCE(SUM(premium),0) AS s FROM records')).s;
  const today = new Date().toISOString().split('T')[0];
  const in30  = new Date(); in30.setDate(in30.getDate()+30);
  const expiring = (await dbGet('SELECT COUNT(*) AS n FROM records WHERE end_date>=? AND end_date<=?',[today,in30.toISOString().split('T')[0]])).n;
  const expired  = (await dbGet('SELECT COUNT(*) AS n FROM records WHERE end_date<?',[today])).n;
  res.json({ total, totalPremium, expiring, expired });
}));

app.get('/api/summary/monthly', wrap(async (req,res) => {
  const year = req.query.year || new Date().getFullYear();
  res.json(await dbAll(`SELECT strftime('%m',pay_date) AS month,type,SUM(premium) AS total,COUNT(*) AS cnt FROM records WHERE pay_date IS NOT NULL AND strftime('%Y',pay_date)=? GROUP BY month,type ORDER BY month`,[String(year)]));
}));

app.get('/api/summary/yearly', wrap(async (req,res) => {
  res.json(await dbAll(`SELECT strftime('%Y',pay_date) AS year,type,SUM(premium) AS total,COUNT(*) AS cnt FROM records WHERE pay_date IS NOT NULL GROUP BY year,type ORDER BY year`));
}));

// ─── SPA fallback ──────────────────────────────────
app.get('*', (_,res) => res.sendFile(path.join(__dirname,'public','index.html')));

// ─── Start ─────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚗 Insurance System running on port ${PORT}\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
