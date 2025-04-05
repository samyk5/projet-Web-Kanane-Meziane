const sqlite = require('better-sqlite3');
const db = new sqlite('./db/db.sqlite');

// Vérifier la table users
try {
  // db.prepare(`ALTER TABLE users ADD COLUMN phone TEXT`).run();
  // db.prepare(`ALTER TABLE users ADD COLUMN bio TEXT`).run();
  // db.prepare(`ALTER TABLE users ADD COLUMN profile_picture TEXT`).run();

  const users = db.prepare('SELECT * FROM users').all();
  console.log("Contenu de la table users :", users);
} catch (error) {
  console.error("Erreur lors de la lecture de la table users :", error.message);
}

// // Vérifier la table food_offers
// try {
//   const offers = db.prepare('SELECT * FROM food_offers').all();
//   console.log("Contenu de la table food_offers :", offers);
// } catch (error) {
//   console.error("Erreur lors de la lecture de la table food_offers :", error.message);
// }

// // Vérifier la table requests
// try {
//   const requests = db.prepare('SELECT * FROM requests').all();
//   console.log("Contenu de la table requests :", requests);
// } catch (error) {
//   console.error("Erreur lors de la lecture de la table requests :", error.message);
// }