import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Auth,
  User,
  authState,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth'; // Importa los módulos de Auth

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Observable que emite el estado de autenticación del usuario (null si no logueado, User si logueado)
  user$: Observable<User | null>;

  constructor(private auth: Auth) {
    // authState() es un observable de AngularFire que emite el usuario actual.
    this.user$ = authState(this.auth);
  }

  /**
   * Registra un nuevo usuario con email y contraseña.
   * @param email Email del usuario.
   * @param password Contraseña del usuario.
   * @returns Una Promesa que se resuelve al registrar el usuario.
   */
  register(email: string, password: string): Promise<any> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  /**
   * Inicia sesión con email y contraseña.
   * @param email Email del usuario.
   * @param password Contraseña del usuario.
   * @returns Una Promesa que se resuelve al iniciar sesión.
   */
  login(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  /**
   * Cierra la sesión del usuario actual.
   * @returns Una Promesa que se resuelve al cerrar sesión.
   */
  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
// Este servicio maneja la autenticación de usuarios utilizando Firebase Authentication.
// Proporciona métodos para registrar, iniciar sesión y cerrar sesión, y expone un observable
