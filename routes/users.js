const express = require('express');
const auth = require('../middleware/auth');

module.exports = (db) => {
  const router = express.Router();

  router.get('/', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const users = db.prepare("SELECT id,username,role FROM users").all();
    res.json(users);
  });

  router.post('/', auth, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { username, password, role } = req.body;
    db.prepare("INSERT INTO users (username,password,role) VALUES (?,?,?)")
      .run(username, password, role);

    res.json({ success: true });
  });

  return router;
};