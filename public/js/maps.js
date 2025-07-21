// Google Maps integration
class MapsManager {
  constructor() {
    this.apiKey = null;
    this.mapContainer = document.getElementById('map-container');
  }

  async loadApiKey() {
    try {
      const response = await fetch('/api/config/maps-key');
      const data = await response.json();
      this.apiKey = data.apiKey;
      return this.apiKey;
    } catch (error) {
      console.error('Error loading Maps API key:', error);
      return null;
    }
  }

  async initializeMap() {
    const apiKey = await this.loadApiKey();
    
    if (!apiKey) {
      console.warn('Google Maps API key not available');
      this.showFallbackMap();
      return;
    }

    // Load Google Maps with your specific location
    this.loadGoogleMapsEmbed();
  }

  loadGoogleMapsEmbed() {
    // Quirofísicos Rocha actual location
    const businessLocation = {
      lat: 32.5149469, // Tijuana coordinates
      lng: -117.0382471,
      name: "Quirofísicos Rocha",
      address: "Plaza Johnson, Av. Josefa Ortiz de Domínguez 1993, Independencia, 22055 Tijuana, B.C., Mexico"
    };

    // Create Google Maps embed URL with your specific location
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=${encodeURIComponent(businessLocation.address)}&zoom=15`;
    
    // Update the iframe src
    const iframe = document.getElementById('google-map');
    if (iframe) {
      iframe.src = embedUrl;
    }
  }

  showFallbackMap() {
    // Fallback map showing Quirofísicos Rocha location without API key
    const iframe = document.getElementById('google-map');
    if (iframe) {
      // Static embed for Tijuana location - this works without API key
      iframe.src = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.2155419434!2d-117.04064468536147!3d32.51311678103924!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d948af9b3f9b3f%3A0x123456789abcdef0!2sAv.%20Josefa%20Ortiz%20de%20Dom%C3%ADnguez%201993%2C%20Independencia%2C%2022055%20Tijuana%2C%20B.C.%2C%20Mexico!5e0!3m2!1ses-419!2sus!4v1642089600000!5m2!1ses-419!2sus";
    }
  }
}

// Initialize maps when page loads
document.addEventListener('DOMContentLoaded', () => {
  const mapsManager = new MapsManager();
  mapsManager.initializeMap();
});
