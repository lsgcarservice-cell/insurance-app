const express = require('express');
const auth = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  router.get('/', auth, (req, res) => {
    const data = db.prepare("SELECT * FROM customers").all();
    res.json(data);
  });

  router.post('/', auth, (req, res) => {
    const { name, phone, car } = req.body;

    db.prepare(`
      INSERT INTO customers (name, phone, car, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(name, phone, car);

    res.json({ success: true });
  });

  router.delete('/:id', auth, (req, res) => {
    db.prepare("DELETE FROM customers WHERE id=?").run(req.params.id);
    res.json({ success: true });
  });

  return router;
};