module.exports = (db) => {
  const express = require('express');
  const router = express.Router();
  const { body, validationResult } = require('express-validator');
  const xss = require('xss');
  const upload = require('../middlewares/upload');
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

  // // Afficher une annonce spécifique
  // router.get('/offer/:id', requireAuth, (req, res) => {
  //   const offerId = req.params.id;
  //   const offer = getOfferById(offerId);

  //   if (!offer) {
  //     return res.status(404).send('Offre non trouvée');
  //   }

  //   res.render('offer', { offer });
  // });

  router.get('/:id', (req, res) => {
    
    const offer = db.prepare(`
      SELECT o.*, u.name AS owner_name, u.id AS owner_id
      FROM food_offers o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);
    
  
    if (!offer) {
      return res.status(404).send("Annonce introuvable");
    }
  
    res.render('offer', { offer });
  });
  

  // Afficher le formulaire d'édition d'une annonce
  router.get('/edit/:id', requireAuth, (req, res) => {
    const offerId = req.params.id;
    const offer = db.prepare('SELECT * FROM food_offers WHERE id = ?').get(offerId);

    if (!offer || offer.user_id !== req.session.user.id) {
      return res.status(403).send("Accès refusé");
    }

    res.render('edit_offer', { offer });
  });
  // Modifier une annonce (traitement du formulaire)
  router.post('/edit/:id', requireAuth, upload.single('image'), (req, res) => {
    const offerId = req.params.id;
    const { title, description, quantity, expiration_date, location, image_url } = req.body;

    const offer = db.prepare('SELECT * FROM food_offers WHERE id = ?').get(offerId);

    if (!offer || offer.user_id !== req.session.user.id) {
      return res.status(403).send("Accès refusé");
    }

    let finalImageUrl = image_url;
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    }

    db.prepare(`
      UPDATE food_offers
      SET title = ?, description = ?, quantity = ?, expiration_date = ?, location = ?, image_url = ?
      WHERE id = ?
    `).run(title, description, quantity, expiration_date, location, finalImageUrl, offerId);

    res.redirect('/offers/mine'); // ou où tu veux rediriger
  });

  // Supprimer une annonce
  router.get('/delete/:id', requireAuth, (req, res) => {
    const offerId = req.params.id;
    
    // Vérifier si l'utilisateur est bien le propriétaire
    const offer = getOfferById(offerId);
    if (!offer || offer.user_id !== req.session.user.id) {
        return res.status(403).send("Accès refusé");
    }

    try {
      deleteOffer(offerId);
      res.redirect('/offers/my-offers'); // ou autre redirection logique
    } catch (err) {
      console.error("Erreur lors de la suppression :", err.message);
      res.status(400).send(err.message); // ou render une page avec le message
    }

    
  });

  return router;
};
