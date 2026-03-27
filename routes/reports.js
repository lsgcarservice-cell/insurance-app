const express = require('express');
const auth = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  router.get('/summary', auth, (req, res) => {
    const total = db.prepare("SELECT COUNT(*) as c FROM customers").get();
    const policies = db.prepare("SELECT COUNT(*) as c FROM policies").get();
    const revenue = db.prepare("SELECT SUM(total) as sum FROM policies").get();

    res.json({
      customers: total.c,
      policies: policies.c,
      revenue: revenue.sum || 0
    });
  });

  return router;
};
const XLSX = require('xlsx');

router.get('/export', auth, (req, res) => {
  const data = db.prepare("SELECT * FROM customers").all();

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=data.xlsx');
  res.send(buffer);
});