module.exports = (db) => {
    const express = require('express');
    const router = express.Router();
  
    router.get('/', (req, res) => {
        let { search, sort, location, category } = req.query;
  
        let query = `SELECT * FROM food_offers WHERE expiration_date >= DATE('now')`;
        let params = [];
  
        // 🔍 Recherche par mot-clé (titre ou description)
        if (search) {
            query += ` AND (title LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
  
        // 📍 Filtrage par localisation
        if (location) {
            query += ` AND location = ?`;
            params.push(location);
        }
  
        // 🎯 Filtrage par catégorie (optionnel)
        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }
  
        // 🔀 Tri des annonces
        if (sort === 'date') {
            query += ` ORDER BY expiration_date DESC`;
        } else if (sort === 'location') {
            query += ` ORDER BY location ASC`;
        }
  
        try {
            const offers = db.prepare(query).all(...params);
            
            // ✅ Gestion des rôles
            const sessionData = req.session.user
                ? {
                    name: req.session.user.name,
                    isDonator: req.session.user.role === 'donateur',
                    isBeneficiary: req.session.user.role === 'beneficiaire'
                }
                : null;

            res.render('index', { offers, session: sessionData, search, location });
        } catch (err) {
            console.error('Erreur lors de la récupération des annonces:', err);
            res.status(500).send('Erreur interne du serveur');
        }
    });
  
    return router;
};
