// Utility functions for the application
console.log('Utils.js loaded successfully');

window.utils = {
    formatDate: function(date) {
        return new Date(date).toLocaleDateString('es-MX');
    },
    
    formatTime: function(time) {
        return time;
    },
    
    showNotification: function(message, type = 'info') {
        alert(message);
    }
};
