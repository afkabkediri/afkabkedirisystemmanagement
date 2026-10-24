// config.js

const CONFIG = {
    // URL Deployment Google Apps Script (GAS) untuk integrasi dual database
    GAS_URL: "https://script.google.com/macros/s/AKfycbzjl8Y5Vws1pschkk93bNuzVBkGnIhYtf5SbmdRPdq8-T_gnZvL95Yi__6RS7C3pDhg/exec",
    
    // Konfigurasi Firebase dari project afkab-kediri-sys
    FIREBASE: {
        apiKey: "AIzaSyByM9aM3FywG3Leu8nSsIzO0xAR4VAQfJU",
        authDomain: "afkab-kediri-sys.firebaseapp.com",
        projectId: "afkab-kediri-sys",
        storageBucket: "afkab-kediri-sys.firebasestorage.app",
        messagingSenderId: "703292418199",
        appId: "1:703292418199:web:8b7e2821fac3af303da1d2"
    }
};

console.log("Config loaded. GAS URL:", CONFIG.GAS_URL);