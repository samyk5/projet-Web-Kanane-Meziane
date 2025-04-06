document.addEventListener('DOMContentLoaded', function() {
  console.log("Application anti-gaspillage initialisée");
  
  // Gestion améliorée des boutons
  document.querySelectorAll('.btn-primary').forEach(button => {
    button.addEventListener('click', function(e) {
      // Ajout d'un effet de feedback au clic
      e.currentTarget.classList.add('active');
      setTimeout(() => {
        e.currentTarget.classList.remove('active');
      }, 200);
    });
  });
  
  // Gestion des cartes interactives
  document.querySelectorAll('.offer-card, .request-card').forEach(card => {
    card.addEventListener('click', function(e) {
      // Empêche l'action si on clique sur un lien ou un bouton
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
      
      // Trouve le premier lien dans la carte et le suit
      const link = card.querySelector('a');
      if (link) {
        window.location.href = link.href;
      }
    });
  });
  
  // Fonction pour afficher les notifications
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
  
  // Écouteur pour les messages flash du serveur
  if (document.querySelector('.alert')) {
    setTimeout(() => {
      document.querySelector('.alert').style.opacity = '0';
      setTimeout(() => {
        document.querySelector('.alert').remove();
      }, 300);
    }, 5000);
  }
  
  // Gestion des formulaires avec feedback visuel
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function() {
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader-btn"></span> Traitement...';
      }
    });
  });
  
  // Fonction pour charger du contenu de manière asynchrone
  async function loadContent(url, containerId) {
    try {
      const container = document.getElementById(containerId);
      container.innerHTML = '<div class="loader"></div>';
      
      const response = await fetch(url);
      const data = await response.text();
      
      container.innerHTML = data;
      container.classList.add('fade-in');
    } catch (error) {
      console.error('Erreur de chargement:', error);
      showNotification('Erreur lors du chargement', 'error');
    }
  }
  
  // Exemple d'utilisation pour la pagination
  document.querySelectorAll('.page-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      loadContent(this.href, 'content-container');
    });
  });
});