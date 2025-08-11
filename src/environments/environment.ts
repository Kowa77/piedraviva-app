// src/environments/environment.ts
export const environment = {
  production: false, // ¡IMPORTANTE! Establece esto a 'false' para desarrollo
  firebaseConfig: {
    // ¡IMPORTANTE! Reemplaza estos valores con la configuración de tu proyecto de Firebase
    // Estos deberían ser los mismos que en environment.prod.ts para el mismo proyecto.
    apiKey: "AIzaSyBwe-SvSjOdCdBfKG_Nv8hjJ4IE8Q-vS1g",
    authDomain: "piedraviva-20327.firebaseapp.com",
    projectId: "piedraviva-20327",
    storageBucket: "piedraviva-20327.firebasestorage.app",
    messagingSenderId: "895243777977",
    appId: "1:895243777977:web:8dff1a8e88b23df2c82868",
    measurementId: "G-HLK1QHRRQ8" // Este es opcional, si usas Google Analytics
  }
};
