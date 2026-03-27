const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = (db) => {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Login failed' });
    }

    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user });
  });

  return router;
};