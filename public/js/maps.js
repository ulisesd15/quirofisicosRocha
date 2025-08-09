// Google Maps integration
class MapsManager {
  constructor() {
    this.apiKey = null;
    this.mapContainer = document.getElementById('map-container');
  }

  async loadApiKey() {
    try {
      const response = await fetch('/api/config/maps-key');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
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
      console.warn('Google Maps API key not available, using fallback map');
      this.showFallbackMap();
      return;
    }

    console.log('Google Maps API key loaded:', apiKey.substring(0, 10) + '...');
    
    // Try to load Google Maps with API key, fallback if it fails
    try {
      await this.loadGoogleMapsEmbed();
    } catch (error) {
      console.error('Failed to load Google Maps with API key:', error);
      this.showFallbackMap();
    }
  }

  async loadGoogleMapsEmbed() {
    return new Promise((resolve, reject) => {
      // Quirofísicos Rocha actual location
      const businessLocation = {
        lat: 32.5149469, // Tijuana coordinates
        lng: -117.0382471,
        name: "Quirofísicos Rocha",
        address: "Plaza Johnson, Av. Josefa Ortiz de Domínguez 1993, Independencia, 22055 Tijuana, B.C., Mexico"
      };

      // Create Google Maps embed URL with your specific location
      const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${this.apiKey}&q=${encodeURIComponent(businessLocation.address)}&zoom=15`;
      
      console.log('Loading Maps embed URL:', embedUrl);
      
      // Update the iframe src
      const iframe = document.getElementById('google-map');
      if (iframe) {
        // Add error handling before setting src
        iframe.onerror = (event) => {
          console.error('Google Maps iframe failed to load:', event);
          reject(new Error('Google Maps iframe load failed'));
        };
        
        // Set up a timeout to check if map loaded successfully
        const timeout = setTimeout(() => {
          console.warn('Google Maps API timeout - checking for 403/404 errors');
          // Check if we got a 403 or other error by examining iframe
          try {
            // This might throw due to CORS, but we can catch it
            const iframeSrc = iframe.src;
            if (iframeSrc.includes('403') || iframeSrc.includes('404')) {
              reject(new Error('Google Maps API permission error (403/404)'));
              return;
            }
          } catch (e) {
            // CORS error is expected, but if iframe is still loading, that's ok
          }
          
          console.info('Google Maps loaded successfully (or still loading)');
          resolve();
        }, 5000);
        
        // If iframe loads successfully, clear timeout
        iframe.onload = () => {
          clearTimeout(timeout);
          console.info('Google Maps iframe loaded successfully');
          resolve();
        };
        
        // Set the source to trigger loading
        iframe.src = embedUrl;
        
      } else {
        reject(new Error('Google Maps iframe element not found'));
      }
    });
  }

  showFallbackMap() {
    // Fallback map showing Quirofísicos Rocha location without API key
    const iframe = document.getElementById('google-map');
    if (iframe) {
      // Remove any error handlers to prevent conflicts
      iframe.onerror = null;
      iframe.onload = null;
      
      // Enhanced static embed for Tijuana location - this works without API key
      const fallbackUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.2155419434!2d-117.04064468536147!3d32.51311678103924!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80d948771984693b%3A0x8b8b8b8b8b8b8b8b!2sAv.%20Josefa%20Ortiz%20de%20Dom%C3%ADnguez%201993%2C%20Independencia%2C%2022055%20Tijuana%2C%20B.C.%2C%20Mexico!5e0!3m2!1ses-419!2sus!4v1691234567890!5m2!1ses-419!2sus";
      
      iframe.src = fallbackUrl;
      console.log('✅ Fallback map loaded - Google Maps API unavailable or has permission issues');
      
      // Add a visual indicator that this is fallback mode
      this.addFallbackIndicator();
    }
  }

  addFallbackIndicator() {
    // Add a subtle indicator that we're using fallback mode
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      // Remove any existing indicator
      const existingIndicator = mapContainer.querySelector('.map-fallback-indicator');
      if (existingIndicator) {
        existingIndicator.remove();
      }
      
      // Add new indicator
      const indicator = document.createElement('div');
      indicator.className = 'map-fallback-indicator';
      indicator.innerHTML = `
        <div style="
          position: absolute; 
          top: 10px; 
          right: 10px; 
          background: rgba(44, 90, 160, 0.9); 
          color: white; 
          padding: 8px 12px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: 500;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          📍 Mapa Estático
        </div>
      `;
      mapContainer.style.position = 'relative';
      mapContainer.appendChild(indicator);
    }
  }
}

// Initialize maps when page loads
document.addEventListener('DOMContentLoaded', () => {
  const mapsManager = new MapsManager();
  
  // Add global error handler for resource loading issues
  window.addEventListener('error', (event) => {
    if (event.target && event.target.src && event.target.src.includes('maps')) {
      console.error('🗺️ Maps resource error:', {
        source: event.target.src,
        error: event.error,
        message: event.message
      });
    }
  }, true);
  
  // Initialize maps
  mapsManager.initializeMap();
});
