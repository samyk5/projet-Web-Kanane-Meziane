module.exports = (db) => {
  const express = require('express');
  const router = express.Router();

  
  // 👥 Profil public par ID
  router.get('/:id', (req, res) => {
    const user = db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).get(req.params.id);
    console.log(user);
  
    if (!user) {
      return res.status(404).send("Utilisateur introuvable");
    }
  
    res.render('profile', { user });
  });

  
  return router;
};
  