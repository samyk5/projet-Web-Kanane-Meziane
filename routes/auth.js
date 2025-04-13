module.exports = (db) => {
  const express = require('express');
  const router = express.Router();
  const bcrypt = require('bcrypt');
  const crypto = require('crypto');
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ihabmp19@gmail.com',
      pass: 'gckv ctpi rskq vbir'
    }
  });

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
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const insertUser = db.prepare(`
        INSERT INTO users (name, email, password, role, location, phone, bio, profile_picture, is_verified, verification_token)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `);
      insertUser.run(name, email, hashedPassword, role, location, phone, bio, profile_picture, verificationToken);

      const verificationLink = `http://localhost:3001/auth/verify?token=${verificationToken}`;
      await transporter.sendMail({
        from: 'ihabmp19@gmail.com',
        to: email,
        subject: 'Vérification de votre compte',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Bienvenue sur notre site de lutte contre le gaspillage alimentaire, ${name} !</h2>
            <p>Merci de vous être inscrit. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
            <a href="${verificationLink}" style="display:inline-block; padding:10px 15px; background-color:#28a745; color:white; text-decoration:none; border-radius:5px;">Vérifier mon compte</a>
            <p>Si vous n’avez pas créé ce compte, ignorez cet email.</p>
          </div>
       `});
      res.render('signup', { success: "Un email de vérification a été envoyé." });
    } catch (error) {
      console.error("Erreur lors de l'inscription :", error);

      let message = 'Une erreur inconnue est survenue.';
    
      if (error.code === 'SQLITE_CONSTRAINT') {
        message = "Une contrainte a été violée. Vérifiez vos champs.";
      } else if (error.message.includes('email')) {
        message = "Problème avec l'adresse email fournie.";
      } else if (error.message.includes('verification_token')) {
        message = "Échec lors de la génération du lien de vérification.";
      } else if (error.responseCode === 535 || error.code === 'EAUTH') {
        message = "Erreur d'authentification avec le serveur mail. Vérifiez vos identifiants Gmail.";
      }
    
      res.status(500).render('signup', { error: message });
    }
  });

  // Vérification email
  router.get('/verify', (req, res) => {
    const { token } = req.query;
    const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);

    if (!user) {
      return res.send('Lien de vérification invalide ou expiré.');
    }

    db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
    res.send('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.');
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

      if (!user.is_verified) {
        return res.status(403).render('login', { error: 'Compte non vérifié. Vérifiez vos emails.' });
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

  // Mot de passe oublié
  router.get('/forgot-password', (req, res) => {
    res.render('forgot-password');
  });

  router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.render('forgot-password', { error: "Cet email n'existe pas." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(resetToken, user.id);

    const resetLink = `http://localhost:3001/auth/reset-password?token=${resetToken}`;

    transporter.sendMail({
      from: 'tonemail@gmail.com',
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `<p>Cliquez ici pour réinitialiser votre mot de passe : <a href="${resetLink}">Réinitialiser</a></p>`
    });

    res.render('forgot-password', { success: 'Un email a été envoyé pour réinitialiser le mot de passe.' });
  });

  // Formulaire de réinitialisation
  router.get('/reset-password', (req, res) => {
    const { token } = req.query;
    res.render('reset-password', { token });
  });

  router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);

    if (!user) {
      return res.render('reset-password', { error: 'Lien invalide ou expiré.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password = ?, verification_token = NULL WHERE id = ?').run(hashedPassword, user.id);

    res.redirect('/auth/login');
  });

  // Déconnexion
  router.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
  });

  return router;
};
