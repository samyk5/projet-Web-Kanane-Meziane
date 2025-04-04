module.exports = (db) => {
  const express = require('express');
  const router = express.Router();
  const { body, validationResult } = require('express-validator');
  const xss = require('xss');

  // Importation des fonctions
  const { getOfferById, updateOffer, deleteOffer } = require('../models/offerModel')(db);

  // Middleware d'authentification
  const requireAuth = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    next();
  };

  // Afficher le formulaire de création d'une annonce
  router.get('/new', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }
    res.render('new_offer', { user: req.session.user });
  });

  // Créer une nouvelle annonce
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

    // Sécuriser les entrées
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

  // Afficher les annonces publiées par l'utilisateur
  router.get('/my-offers', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }
    
    const offers = db.prepare('SELECT * FROM food_offers WHERE user_id = ?').all(req.session.user.id);
    res.render('my_offers', { offers });
  });

  // Afficher une annonce spécifique
  router.get('/offer/:id', requireAuth, (req, res) => {
    const offerId = req.params.id;
    const offer = getOfferById(offerId);

    if (!offer) {
      return res.status(404).send('Offre non trouvée');
    }

    res.render('offer', { offer });
  });

  // Afficher le formulaire d'édition d'une annonce
  router.get('/edit/:id', requireAuth, (req, res) => {
    console.log("test") ; 
    const offerId = req.params.id;
    
    const offer = getOfferById(offerId);

    

    if (!offer || offer.user_id !== req.session.user.id) { // Correction de ownerId → user_id
      return res.status(403).send("Accès refusé");
    }

    res.render('edit_offer', { offer });
  });

  // Modifier une annonce (traitement du formulaire)
  router.post('/edit/:id', requireAuth, (req, res) => {
    const offerId = req.params.id;
    const { title, description, quantity, expiration_date, location } = req.body;

    // Vérifier si l'utilisateur est bien le propriétaire
    const offer = getOfferById(offerId);
    if (!offer || offer.user_id !== req.session.user.id) {
        return res.status(403).send("Accès refusé");
    }

    updateOffer(offerId, { title, description, quantity, expiration_date, location });
    res.redirect('/offers/my-offers');
  });

  // Supprimer une annonce
  router.get('/delete/:id', requireAuth, (req, res) => {
    const offerId = req.params.id;
    
    // Vérifier si l'utilisateur est bien le propriétaire
    const offer = getOfferById(offerId);
    if (!offer || offer.user_id !== req.session.user.id) {
        return res.status(403).send("Accès refusé");
    }

    deleteOffer(offerId);
    res.redirect('/offers/my-offers');
  });

  return router;
};
