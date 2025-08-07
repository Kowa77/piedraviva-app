// src/environments/environment.ts
export const environment = {
  production: false, // Establece a 'true' para el entorno de producción
  firebaseConfig: {
    // ¡IMPORTANTE! Reemplaza estos valores con la configuración de tu proyecto de Firebase
    apiKey: "AIzaSyBwe-SvSjOdCdBfKG_Nv8hjJ4IE8Q-vS1g",
    authDomain: "piedraviva-20327.firebaseapp.com",
    projectId: "piedraviva-20327",
    storageBucket: "piedraviva-20327.firebasestorage.app",
    messagingSenderId: "895243777977",
    appId: "1:895243777977:web:8dff1a8e88b23df2c82868",
    measurementId: "G-HLK1QHRRQ8" // Este es opcional, si usas Google Analytics
  }
};

/*
 * Para un entorno de desarrollo, puedes dejar 'production: false'.
 * Para el entorno de producción, crearías un archivo 'environment.prod.ts'
 * con 'production: true' y la misma configuración de Firebase (o una diferente si es necesario).
 *
 * Ejemplo de src/environments/environment.prod.ts:
 * export const environment = {
 * production: true,
 * firebaseConfig: {
 * apiKey: "TU_API_KEY_PROD",
 * authDomain: "TU_DOMINO_PROD.firebaseapp.com",
 * projectId: "TU_PROJECT_ID_PROD",
 * storageBucket: "TU_BUCKET_PROD.appspot.com",
 * messagingSenderId: "TU_SENDER_ID_PROD",
 * appId: "TU_APP_ID_PROD",
 * measurementId: "TU_MEASUREMENT_ID_PROD"
 * }
 * };
 */
