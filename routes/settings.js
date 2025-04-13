// 📁 routes/settings.js
const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');

module.exports = (db) => {
  // Affichage des paramètres utilisateur
  router.get('/', (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
    res.render('settings', { user });
  });

  // Mise à jour des informations
  router.post('/update', upload.single('profile_picture_file'), (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const { name, email, phone, location, bio } = req.body;

    let profile_picture = req.body.profile_picture; // URL fournie manuellement
    if (req.file) {
      profile_picture = `/uploads/${req.file.filename}`; // Fichier uploadé
    }

    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, phone = ?, location = ?, bio = ?, profile_picture = ?
      WHERE id = ?
    `).run(name, email, phone, location, bio, profile_picture, req.session.user.id);

    res.redirect('/settings');
  });

  return router;
};
