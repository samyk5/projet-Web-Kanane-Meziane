module.exports = (db) => {
    function getOfferById(offerId) {
      return db.prepare('SELECT * FROM food_offers WHERE id = ?').get(offerId);
    }
  
    function updateOffer(offerId, updatedData) {
      const query = `
        UPDATE food_offers 
        SET title = ?, description = ?, quantity = ?, expiration_date = ?, location = ? 
        WHERE id = ?`;
      return db.prepare(query).run(
        updatedData.title,
        updatedData.description,
        updatedData.quantity,
        updatedData.expiration_date,
        updatedData.location,
        offerId
      );
    }
  
    function deleteOffer(offerId) {
      const count = db.prepare("SELECT COUNT(*) AS count FROM requests WHERE offer_id = ?").get(offerId).count;
    
      if (count > 0) {
        // On lève une erreur personnalisée si des demandes existent
        throw new Error("Impossible de supprimer l’offre : des demandes y sont encore associées.");
      }
    
      return db.prepare('DELETE FROM food_offers WHERE id = ?').run(offerId);
    }
      
    return { getOfferById, updateOffer, deleteOffer };
};
  