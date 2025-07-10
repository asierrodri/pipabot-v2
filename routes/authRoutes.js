const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

router.post('/login', login);

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesión cerrada' });
  });
});

router.get('/usuario', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
});

module.exports = router;
