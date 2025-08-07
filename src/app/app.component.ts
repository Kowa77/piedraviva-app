import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router'; // Importa RouterLink
import { LoginRegisterModalComponent } from './components/login-register-modal/login-register-modal.component'; // Importa el modal
import { AuthService } from './services/auth.service'; // Importa el servicio de autenticación
import { User } from 'firebase/auth'; // Importa el tipo User de Firebase Auth
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, LoginRegisterModalComponent], // Añade el modal y RouterLink
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'pizza-reservation-app';
  showLoginModal: boolean = false; // Controla la visibilidad del modal
  currentUser$: Observable<User | null>; // Observable para el usuario actual

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.user$; // Asigna el observable del servicio
  }

  ngOnInit(): void {
    // Puedes añadir lógica de inicialización si es necesario
  }

  /**
   * Abre el modal de login/registro.
   */
  openLoginModal(): void {
    this.showLoginModal = true;
  }

  /**
   * Cierra el modal de login/registro.
   */
  closeLoginModal(): void {
    this.showLoginModal = false;
  }

  /**
   * Cierra la sesión del usuario.
   */
  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      console.log('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Inténtalo de nuevo.');
    }
  }
}
