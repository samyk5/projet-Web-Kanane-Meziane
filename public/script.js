// scripts.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("Scripts loaded successfully");
  
    // Exemple d'action dynamique si nécessaire
    document.querySelectorAll('.btn-primary').forEach(button => {
      button.addEventListener('click', function() {
        alert("Vous avez cliqué sur un bouton d'offre !");
      });
    });
  });
  