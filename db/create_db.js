const sqlite = require('better-sqlite3');
const db = new sqlite('db.sqlite');

// Créer la table users
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    location TEXT
  )
`).run();

// Créer la table food_offers
db.prepare(`
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
  )
`).run();

// Créer la table requests
db.prepare(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    offer_id INTEGER,
    status TEXT DEFAULT 'en attente',
    request_date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(offer_id) REFERENCES food_offers(id)
  )
`).run();

console.log("Base de données créée avec succès.");