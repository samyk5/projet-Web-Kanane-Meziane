const express = require('express');
const path = require('path');
const mustacheExpress = require('mustache-express');
const cookieSession = require('cookie-session');
const sqlite = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Connexion à la base de données
const db = new sqlite('./db/db.sqlite');

// Configuration du moteur de template Mustache
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour parser les données des formulaires
app.use(express.urlencoded({ extended: true }));

// Middleware pour gérer les sessions
app.use(cookieSession({
  name: 'session',
  keys: ['clé_secrète_1', 'clé_secrète_2'],
  maxAge: 24 * 60 * 60 * 1000 ,  // Durée de vie de la session : 24 heures
  secure: false, // Désactive le mode sécurisé si en localhost
  httpOnly: true
}));

// Middleware pour partager la session avec les vues
app.use((req, res, next) => {
  res.locals.session = req.session.user; // Assurer que la session est disponible pour les templates
  next();
});

// Fonction de middleware pour vérifier si l'utilisateur est authentifié
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login'); // Redirige si l'utilisateur n'est pas connecté
  }
  next();
};



// Configurer Express pour servir des fichiers statiques (CSS, JS) depuis le dossier "public"
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth')(db);
const offersRoutes = require('./routes/offers')(db);
const requestsRoutes = require('./routes/requests')(db);
const indexRoutes = require('./routes/index')(db);


app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/offers', offersRoutes);
app.use('/requests', requestsRoutes);

// // Route GET pour la page d'accueil
// app.get('/', requireAuth, (req, res) => {
//   const offers = db.prepare("SELECT * FROM food_offers WHERE status = 'disponible'").all();
//   res.render('index', {
//     session: req.session.user ? {
//       name: req.session.user.name,
//       isDonator: req.session.user.role === 'donateur',
//       isBeneficiary: req.session.user.role === 'beneficiaire'
//     } : null,  // Récupère les informations de l'utilisateur connecté
//     offers: offers
//   });
// });

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
