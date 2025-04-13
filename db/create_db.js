const fs = require('fs');
const path = require('path');
const sqlite = require('better-sqlite3');

// 📁 Chemin vers la base
const dbPath = path.join(__dirname, 'db.sqlite');

// 🧹 Supprimer l'ancienne base si elle existe
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Ancienne base supprimée.');
}

// 📦 Créer une nouvelle base
const db = new sqlite(dbPath);

// ✅ Créer les tables avec tous les champs nécessaires
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    location TEXT,
    phone TEXT,
    bio TEXT,
    profile_picture TEXT,
    is_verified INTEGER DEFAULT 0,
    verification_token TEXT
  );

  CREATE TABLE IF NOT EXISTS food_offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    quantity INTEGER,
    expiration_date TEXT,
    status TEXT DEFAULT 'disponible',
    location TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    offer_id INTEGER,
    status TEXT DEFAULT 'en attente',
    request_date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(offer_id) REFERENCES food_offers(id)
  );
`);

console.log("✅ Base de données recréée avec succès.");

// (Optionnel) Affichage de confirmation
const tables = ['users', 'food_offers', 'requests'];
tables.forEach(table => {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  console.log(`🧾 Table ${table} :`, rows);
});
