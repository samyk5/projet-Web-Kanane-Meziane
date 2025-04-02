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
      return db.prepare('DELETE FROM food_offers WHERE id = ?').run(offerId);
    }
  
    return { getOfferById, updateOffer, deleteOffer };
};
  