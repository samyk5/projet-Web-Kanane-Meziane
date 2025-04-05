module.exports = (db) => {
  const express = require('express');
  const router = express.Router();
  const bcrypt = require('bcrypt');

  // Inscription
  router.get('/signup', (req, res) => {
    res.render('signup');
  });

  router.post('/signup', async (req, res) => {
    const { name, email, password, role, location, phone, bio, profile_picture } = req.body;

    try {
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).render('signup', { error: 'Cet email est déjà utilisé' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const insertUser = db.prepare(
        'INSERT INTO users (name, email, password, role, location, phone, bio, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertUser.run(name, email, hashedPassword, role, location, phone, bio, profile_picture);

      res.redirect('/auth/login');
    } catch (error) {
      res.status(500).render('signup', { error: 'Erreur lors de la création du compte' });
    }
  });

  // Connexion
  router.get('/login', (req, res) => {
    res.render('login');
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      
      if (!user) {
        return res.status(400).render('login', { error: 'Email ou mot de passe incorrect' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
       
      
      if (!validPassword) {
        return res.status(400).render('login', { error: 'Email ou mot de passe incorrect' });
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      
      res.redirect('/');
    } catch (error) {
      console.log("Erreur dans la connexion :", error);
      res.status(500).render('login', { error: 'Erreur serveur' });
    }
  });

  // Déconnexion
  router.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
  });

  return router;
};