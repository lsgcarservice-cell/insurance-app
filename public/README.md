# 🚗 ระบบจัดการประกันภัยรถยนต์ v2.0

ระบบจัดเก็บข้อมูลการซื้อประกันภัยรถยนต์ รายเดือน รายปี พร้อม Login, Database, และ Deploy บน Server

---

## 📁 โครงสร้างไฟล์

```
insurance-app/
├── server.js          ← Backend (Node.js + Express + SQLite)
├── package.json
├── .env.example       ← คัดลอกเป็น .env แล้วแก้ค่า
├── insurance.db       ← SQLite Database (สร้างอัตโนมัติ)
├── README.md
└── public/
    └── index.html     ← Frontend (HTML/CSS/JS)
```

---

## ⚙️ การติดตั้งและรัน (Local)

### ขั้นตอนที่ 1: ติดตั้ง Node.js
ดาวน์โหลด Node.js v18+ จาก https://nodejs.org

### ขั้นตอนที่ 2: ติดตั้ง Dependencies
```bash
cd insurance-app
npm install
```

### ขั้นตอนที่ 3: ตั้งค่า Environment
```bash
cp .env.example .env
```
แก้ไขไฟล์ `.env`:
```
PORT=3000
JWT_SECRET=your_very_long_random_secret_key_here_change_this
NODE_ENV=production
```

### ขั้นตอนที่ 4: รันระบบ
```bash
npm start
```
เปิด Browser ที่ **http://localhost:3000**

---

## 👤 บัญชีเริ่มต้น

| Username | Password  | Role  |
|----------|-----------|-------|
| admin    | admin1234 | Admin |
| user1    | user1234  | User  |

> ⚠️ **เปลี่ยนรหัสผ่านทันทีหลังติดตั้ง!**

---

## 🌐 Deploy บน VPS/Server (Ubuntu)

### 1. ติดตั้ง Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Upload ไฟล์ขึ้น Server
```bash
scp -r insurance-app/ user@your-server:/var/www/insurance-app
```

### 3. ติดตั้ง dependencies บน server
```bash
cd /var/www/insurance-app
npm install --production
```

### 4. ใช้ PM2 รัน background
```bash
sudo npm install -g pm2
pm2 start server.js --name insurance-app
pm2 startup    # auto-start on reboot
pm2 save
```

### 5. ตั้งค่า Nginx (Reverse Proxy)
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/insurance
```
ใส่เนื้อหา:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/insurance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. HTTPS ด้วย Let's Encrypt (ฟรี)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## ☁️ Deploy บน Railway (ฟรี / ง่ายมาก)

1. สมัครที่ https://railway.app
2. กด **New Project → Deploy from GitHub repo**
3. Push โค้ดขึ้น GitHub แล้วเชื่อมกับ Railway
4. ตั้ง Environment Variables:
   - `JWT_SECRET` = (สุ่มตัวอักษรยาวๆ)
   - `NODE_ENV` = production
5. Deploy อัตโนมัติ ✅

---

## ☁️ Deploy บน Render (ฟรี)

1. สมัครที่ https://render.com
2. **New → Web Service → Connect GitHub**
3. ตั้งค่า:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. ตั้ง Environment Variables เหมือน Railway

---

## 🗄️ API Endpoints

| Method | Path                      | Description            | Auth |
|--------|---------------------------|------------------------|------|
| POST   | /api/auth/login           | เข้าสู่ระบบ           | -    |
| GET    | /api/auth/me              | ข้อมูล user ปัจจุบัน  | ✓    |
| GET    | /api/records              | ดึงข้อมูลทั้งหมด      | ✓    |
| POST   | /api/records              | เพิ่มข้อมูล            | ✓    |
| PUT    | /api/records/:id          | แก้ไขข้อมูล            | ✓    |
| DELETE | /api/records/:id          | ลบข้อมูล              | ✓    |
| POST   | /api/records/import       | นำเข้าจาก xlsx        | ✓    |
| GET    | /api/summary/dashboard    | สรุป KPI               | ✓    |
| GET    | /api/summary/monthly      | สรุปรายเดือน           | ✓    |
| GET    | /api/summary/yearly       | สรุปรายปี              | ✓    |
| GET    | /api/users                | จัดการผู้ใช้ (admin)  | ✓👑  |
| POST   | /api/users                | เพิ่มผู้ใช้ (admin)    | ✓👑  |
| DELETE | /api/users/:id            | ลบผู้ใช้ (admin)       | ✓👑  |
| GET    | /api/logs                 | Activity Log (admin)   | ✓👑  |

---

## 🔄 การ Backup ข้อมูล

ข้อมูลทั้งหมดอยู่ในไฟล์ `insurance.db` (SQLite)
```bash
# Backup
cp insurance.db backup_$(date +%Y%m%d).db

# Restore
cp backup_20250101.db insurance.db
```

---

## 📦 Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3) — ไม่ต้องติดตั้ง DB Server แยก
- **Auth**: JWT + bcryptjs
- **Frontend**: Vanilla HTML/CSS/JS
- **Excel**: SheetJS (xlsx)
