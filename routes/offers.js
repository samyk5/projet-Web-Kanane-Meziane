module.exports = (db) => {
  const express = require('express');
  const router = express.Router();
  const { body, validationResult } = require('express-validator');
  const xss = require('xss');

  // Middleware pour vérifier l'authentification
  const requireAuth = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    next();
  };

  // Publier une annonce pour les donateurs
  router.get('/new', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }
    res.render('new_offer', { user: req.session.user });
  });

  router.post('/new', requireAuth, [
    body('title').notEmpty().withMessage('Le titre est requis').trim(),
    body('description').notEmpty().withMessage('La description est requise').trim(),
    body('quantity').isInt({ min: 1 }).withMessage('La quantité doit être un nombre positif'),
    body('expiration_date').isDate().withMessage('La date d\'expiration est invalide'),
    body('location').notEmpty().withMessage('La localisation est requise').trim()
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('new_offer', { errors: errors.array(), user: req.session.user });
    }

    const { title, description, quantity, expiration_date, location } = req.body;

    // Échapper les données pour éviter les attaques XSS
    const safeTitle = xss(title);
    const safeDescription = xss(description);
    const safeLocation = xss(location);

    const query = `
      INSERT INTO food_offers (user_id, title, description, quantity, expiration_date, location)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      db.prepare(query).run(req.session.user.id, safeTitle, safeDescription, quantity, expiration_date, safeLocation);
      res.redirect('/offers/my-offers');
    } catch (err) {
      console.error('Erreur lors de la publication de l\'annonce:', err);
      return res.status(500).render('new_offer', { error: 'Erreur lors de la création de l\'annonce', user: req.session.user });
    }
  });

  // Liste des annonces publiées par l'utilisateur
  router.get('/my-offers', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }
    

    console.log(db.prepare('SELECT * FROM food_offers WHERE user_id = ?').all(req.session.user.id));
    const offers = db.prepare('SELECT * FROM food_offers WHERE user_id = ?').all(req.session.user.id);
    res.render('my_offers', { offers });
  });


  // Afficher une offre spécifique
  router.get('/offer/:id', requireAuth, (req, res) => {
    const offerId = req.params.id;
    const offer = db.prepare('SELECT * FROM food_offers WHERE id = ?').get(offerId); // Récupère l'offre par ID

    if (!offer) {
      return res.status(404).send('Offre non trouvée');
    }

    // Assurez-vous de transmettre une seule offre à la vue
    res.render('offer', offer);  // Passez l'offre entière à Mustache
  });





  return router;
};
