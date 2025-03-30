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

  // Faire une demande
  router.post('/create', requireAuth, (req, res) => {
    if (req.session.user.role !== 'beneficiaire') {
      return res.status(403).send('Accès non autorisé');
    }

    const { offer_id } = req.body;

    const query = `
      INSERT INTO requests 
      (offer_id, user_id, status) 
      VALUES (?, ?, 'en_attente')
    `;

    db.run(query, [offer_id, req.session.user.id], function(err) {
      if (err) {
        return res.status(500).send('Erreur lors de la création de la demande');
      }
      res.redirect('/dashboard');
    });
  });

  // Liste des demandes pour un donateur
  router.get('/my-requests', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }

    const query = `
      SELECT r.id, r.status, o.title, u.name as requester_name 
      FROM requests r
      JOIN food_offers o ON r.offer_id = o.id
      JOIN users u ON r.user_id = u.id
      WHERE o.user_id = ?
    `;

    db.all(query, [req.session.user.id], (err, requests) => {
      if (err) {
        return res.status(500).send('Erreur serveur');
      }
      res.render('my_requests', { requests });
    });
  });

  // Accepter/Refuser une demande
  router.post('/respond', requireAuth, (req, res) => {
    if (req.session.user.role !== 'donateur') {
      return res.status(403).send('Accès non autorisé');
    }

    const { request_id, status } = req.body;

    const query = 'UPDATE requests SET status = ? WHERE id = ?';

    db.run(query, [status, request_id], function(err) {
      if (err) {
        return res.status(500).send('Erreur lors de la mise à jour de la demande');
      }
      res.redirect('/requests/my-requests');
    });
  });

  return router;
};