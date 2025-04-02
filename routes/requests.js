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
      SELECT r.id, r.status, o.title, u.name as requester_name 
      FROM requests r
      JOIN food_offers o ON r.offer_id = o.id
      JOIN users u ON r.user_id = u.id
      WHERE o.user_id = ?
    `;
  
    try {
      // Utilisation de db.prepare().all() de manière synchrone
      const requests = db.prepare(query).all(req.session.user.id);
  
      // Vérifie si des demandes existent
      if (!requests || requests.length === 0) {
        console.log("⚠️ Aucune demande trouvée.");
      }
  
      // Ajouter un champ pour savoir si la demande est en attente
      const modifiedRequests = requests.map(req => ({
        ...req,
        isPending: req.status === "en attente"
      }));
  
      // Rendu de la vue
      res.render('my_requests', { requests: modifiedRequests });
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
      // Préparer et exécuter la mise à jour du statut de la demande
      const updateQuery = db.prepare("UPDATE requests SET status = ? WHERE id = ?");
      updateQuery.run(status, request_id);
  
      // Rediriger vers la liste des demandes après la mise à jour
      res.redirect('/requests/my-requests');
    } catch (err) {
      console.error("Erreur lors de la mise à jour de la demande:", err);
      return res.status(500).send("Erreur serveur");
    }
  });
  

  return router;
};
