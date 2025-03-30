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
  maxAge: 24 * 60 * 60 * 1000 // Durée de vie de la session : 24 heures
}));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth')(db);
const offersRoutes = require('./routes/offers')(db);
const requestsRoutes = require('./routes/requests')(db);

app.use('/auth', authRoutes);
app.use('/offers', offersRoutes);
app.use('/requests', requestsRoutes);

// Route GET pour la page d'accueil
app.get('/', (req, res) => {
  const offersQuery = db.prepare("SELECT * FROM food_offers WHERE status = 'disponible'");
  const offers = offersQuery.all();
  res.render('index', { offers, user: req.session.user });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});