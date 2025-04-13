module.exports = (db) => {
  const express = require('express');
  const router = express.Router();
  const { body, validationResult } = require('express-validator');

  // 🔐 Middleware d'authentification
  const requireAuth = (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    next();
  };

  router.post('/create', requireAuth, [
    body('offer_id').isInt({ min: 1 }).withMessage("ID de l'offre invalide")
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { offer_id } = req.body;
    const user_id = req.session.user.id;
  
    try {
      // Vérifier si l'utilisateur a déjà fait une demande pour cette offre
      const existingRequest = db.prepare("SELECT id FROM requests WHERE user_id = ? AND offer_id = ?").get(user_id, offer_id);
  
      if (existingRequest) {
        return res.status(400).send("Vous avez déjà fait une demande pour cette annonce.");
      }
  
      // Préparer et exécuter l'insertion de la demande
      const insertQuery = db.prepare(`
        INSERT INTO requests (offer_id, user_id, status) 
        VALUES (?, ?, 'en attente')
      `);
      insertQuery.run(offer_id, user_id);
  
      res.redirect('/');
    } catch (err) {
      console.error("Erreur lors de la création de la demande:", err);
      return res.status(500).send("Erreur serveur");
    }
  });
  

  // 📜 Liste des demandes reçues (donateur)
  router.get('/my-requests', requireAuth, (req, res) => {
    
  
    const query = `
       SELECT r.id, r.status, r.offer_id,
       u.id AS user_id, u.name AS requester_name, u.profile_picture AS requester_picture,
       o.title
       FROM requests r
       JOIN users u ON r.user_id = u.id
       JOIN food_offers o ON r.offer_id = o.id
       WHERE o.user_id = ?
      `;
  
    try {
      // Utilisation de db.prepare().all() de manière synchrone
      const requests = db.prepare(query).all(req.session.user.id);
  
      // Vérifie si des demandes existent
      if (!requests || requests.length === 0) {
        console.log("⚠️ Aucune demande trouvée.");
      }
  
      

      // 🔥 Ici tu ajoutes les booléens pour Mustache
      const enhancedRequests = requests.map(r => ({
        ...r,
        isPending: r.status === 'en attente',
        isAccepted: r.status === 'accepte',
        isRefused: r.status === 'refuse'
      }));
  
      // Rendu de la vue
      res.render('my_requests', { requests: enhancedRequests });
    } catch (err) {
      console.error("❌ Erreur SQL :", err);
      return res.status(500).send("Erreur serveur");
    }
  });

  const normalizeDiacritics = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };
  
  router.post('/respond', requireAuth, [
    body('request_id').isInt({ min: 1 }).withMessage("ID de la demande invalide"),
    body('status')
      .trim() // Supprime les espaces inutiles
      .customSanitizer(value => normalizeDiacritics(value)) // Normalise les accents
      .isIn(['accepte', 'refuse']).withMessage("Statut invalide") // Validation après normalisation
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { request_id, status } = req.body;
  
    try {
      // Récupérer la demande
      const request = db.prepare(`
        SELECT * FROM requests WHERE id = ?
      `).get(request_id);
  
      if (!request) {
        return res.status(404).send("Demande introuvable");
      }
  
      // Mise à jour du statut de la demande
      db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, request_id);
  
      if (status === 'accepte') {
        // Récupérer l'offre correspondante
        const offer = db.prepare("SELECT * FROM food_offers WHERE id = ?").get(request.offer_id);
  
        if (!offer) {
          return res.status(400).send("Offre introuvable");
        }
  
        console.log("Quantité actuelle:", offer.quantity);
  
        // Vérifier et mettre à jour la quantité
        if (offer.quantity > 0) {
          const newQuantity = offer.quantity - 1;
  
          if (newQuantity <= 0) {
            db.prepare("UPDATE food_offers SET quantity = 0, status = 'indisponible' WHERE id = ?").run(offer.id);
          } else {
            db.prepare("UPDATE food_offers SET quantity = ? WHERE id = ?").run(newQuantity, offer.id);
          }
        } else {
          return res.status(400).send("Stock insuffisant pour cette offre");
        }
      }
  
      res.redirect('/requests/my-requests');
    } catch (err) {
      console.error("Erreur lors du traitement de la demande:", err.message);
      return res.status(500).send("Erreur serveur");
    }
  });



  




  // routes/requests.js
  router.get('/my-status', requireAuth, (req, res) => {
    if (req.session.user.role !== 'beneficiaire') {
      return res.status(403).send('Accès non autorisé');
    }
  
    const query = `
      SELECT 
        r.id, 
        r.status, 
        o.id AS offer_id,
        o.title, 
        o.description, 
        o.location, 
        o.expiration_date, 
        r.request_date
      FROM requests r
      JOIN food_offers o ON r.offer_id = o.id
      WHERE r.user_id = ?
      ORDER BY r.request_date DESC
    `;
  
    try {
      const rawRequests = db.prepare(query).all(req.session.user.id);
  
      // Fonction pour normaliser le statut (pour les classes CSS)
      function normalizeStatus(status) {
        return status
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // supprime les accents
          .replace(/\s/g, '-')            // espaces → tirets
          .toLowerCase();                 // tout en minuscule
      }
  
      const requests = rawRequests.map(r => ({
        ...r,
        cssStatus: normalizeStatus(r.status), // pour appliquer les classes CSS
        displayStatus: r.status.charAt(0).toUpperCase() + r.status.slice(1) // pour affichage lisible
      }));
  
      res.render('my_status', {
        requests,
        session: {
          name: req.session.user.name,
          isBeneficiary: true
        }
      });
    } catch (err) {
      console.error("Erreur lors de la récupération des demandes:", err);
      res.status(500).send("Erreur serveur");
    }
  });
  




  return router;
};
