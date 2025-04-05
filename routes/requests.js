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
  
      res.redirect('/dashboard');
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
        isAccepted: r.status === 'accepté',
        isRefused: r.status === 'refusé'
      }));
  
      // Rendu de la vue
      res.render('my_requests', { requests: enhancedRequests });
    } catch (err) {
      console.error("❌ Erreur SQL :", err);
      return res.status(500).send("Erreur serveur");
    }
  });

  router.post('/respond', requireAuth, [
    body('request_id').isInt({ min: 1 }).withMessage("ID de la demande invalide"),
    body('status').isIn(['accepté', 'refusé']).withMessage("Statut invalide")
  ], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const { request_id, status } = req.body;
  
    try {
      const request = db.prepare(`
        SELECT * FROM requests WHERE id = ?
      `).get(request_id);
  
      if (!request) {
        return res.status(404).send("Demande introuvable");
      }
  
      // Mise à jour du statut
      db.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, request_id);
  
      if (status === 'accepté') {
        // Récupérer l'offre correspondante
        const offer = db.prepare("SELECT * FROM food_offers WHERE id = ?").get(request.offer_id);
  
        if (offer && offer.quantity > 0) {
          const newQuantity = offer.quantity - 1;
  
          // Mettre à jour la quantité (et éventuellement le statut)
          if (newQuantity <= 0) {
            db.prepare("UPDATE food_offers SET quantity = 0, status = 'indisponible' WHERE id = ?").run(offer.id);
          } else {
            db.prepare("UPDATE food_offers SET quantity = ? WHERE id = ?").run(newQuantity, offer.id);
          }
        }
      }
  
      res.redirect('/requests/my-requests');
    } catch (err) {
      console.error("Erreur lors du traitement de la demande:", err);
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
    o.id AS offer_id,         -- ← ici on ajoute l'identifiant de l'offre
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
     const myRequests = db.prepare(query).all(req.session.user.id);
     res.render('my_status', {
       requests: myRequests,
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
