const express = require('express');
const auth = require('../middleware/auth');
const { calculatePremium } = require('../services/insurance');

module.exports = (db) => {
  const router = express.Router();

  router.post('/', auth, (req, res) => {
    const { customer_id, car_value, type } = req.body;

    const calc = calculatePremium(car_value, type);

    db.prepare(`
      INSERT INTO policies (customer_id, car_value, type, premium, vat, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(customer_id, car_value, type, calc.premium, calc.vat, calc.total);

    res.json(calc);
  });

  router.get('/', auth, (req, res) => {
    const data = db.prepare(`
      SELECT p.*, c.name
      FROM policies p
      JOIN customers c ON p.customer_id = c.id
    `).all();

    res.json(data);
  });

  return router;
};