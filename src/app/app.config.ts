import { ApplicationConfig, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; // Importa provideHttpClient

import { routes } from './app.routes';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { CartService } from './services/cart.service';

// Importaciones para localización de moneda
import { registerLocaleData } from '@angular/common';
import localeEsUy from '@angular/common/locales/es-UY'; // Importa la data de localización para es-UY

// Registra la data de localización para 'es-UY'
registerLocaleData(localeEsUy);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(), // Provee HttpClient para que Angular pueda cargar la data de localización si es necesario
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideDatabase(() => getDatabase()),
    provideAuth(() => getAuth()),
    CartService, // Provee CartService explícitamente aquí
    // Provee la localización por defecto para los pipes de Angular
    { provide: LOCALE_ID, useValue: 'es-UY' } // Establece el locale por defecto a 'es-UY'
  ]
};
