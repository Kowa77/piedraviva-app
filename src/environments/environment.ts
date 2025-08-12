// src/environments/environment.ts
// ESTE ARCHIVO ES PARA DESARROLLO LOCAL.
// Puedes dejar las credenciales hardcodeadas aquí para mayor comodidad en el desarrollo local.

export const environment = {
  production: false, // ¡IMPORTANTE! 'false' para desarrollo
  firebaseConfig: {
    apiKey: "AIzaSyBwe-SvSjOdCdBfKG_Nv8hjJ4IE8Q-vS1g",
    authDomain: "piedraviva-20327.firebaseapp.com",
    projectId: "piedraviva-20327",
    storageBucket: "piedraviva-20327.firebasestorage.app",
    messagingSenderId: "895243777977",
    appId: "1:895243777977:web:8dff1a8e88b23df2c82868",
    measurementId: "G-HLK1QHRRQ8" // Este es opcional, si usas Google Analytics
  }
};

