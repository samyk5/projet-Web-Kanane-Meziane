module.exports = (db) => {
  const express = require('express');
  const router = express.Router();

  // Middleware pour vérifier l'authentification
  const requireAuth = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    next();
  };

  // Publier une annonce
  router.get('/new', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }
    res.render('new_offer');
  });

  router.post('/new', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }

    const { title, description, quantity, expiration_date, location } = req.body;

    const query = `
      INSERT INTO food_offers 
      (user_id, title, description, quantity, expiration_date, location) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [req.session.user.id, title, description, quantity, expiration_date, location], function(err) {
      if (err) {
        return res.status(500).render('new_offer', { error: 'Erreur lors de la création de l\'annonce' });
      }
      res.redirect('/');
    });
  });

  // Liste des annonces publiées par l'utilisateur
  router.get('/my-offers', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }

    const offers = db.prepare('SELECT * FROM food_offers WHERE user_id = ?').all(req.session.user.id);
    res.render('my_offers', { offers });
  });

  return router;
};