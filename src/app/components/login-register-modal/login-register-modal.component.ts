import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necesario para ngModel
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-register-modal',
  standalone: true, // Aquí se define como standalone
  imports: [CommonModule, FormsModule], // Importa FormsModule
  templateUrl: './login-register-modal.component.html',
  styleUrl: './login-register-modal.component.css'
})
export class LoginRegisterModalComponent {
  @Output() close = new EventEmitter<void>(); // Evento para cerrar el modal
  @Output() loggedIn = new EventEmitter<void>(); // Evento cuando el usuario se loguea/registra

  isLoginMode: boolean = true; // true para login, false para register
  email: string = '';
  password: string = '';
  errorMessage: string | null = null;
  loading: boolean = false;

  constructor(private authService: AuthService) { }

  /**
   * Cambia entre el modo de login y registro.
   */
  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = null; // Limpia mensajes de error al cambiar de modo
  }

  /**
   * Maneja el envío del formulario (login o registro).
   */
  async onSubmit(): Promise<void> {
    this.errorMessage = null;
    this.loading = true;

    try {
      if (this.isLoginMode) {
        await this.authService.login(this.email, this.password);
        console.log('Inicio de sesión exitoso');
      } else {
        await this.authService.register(this.email, this.password);
        console.log('Registro exitoso');
      }
      this.loggedIn.emit(); // Emite evento para indicar que el usuario se ha logueado/registrado
      this.close.emit(); // Cierra el modal
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      // Muestra un mensaje de error amigable al usuario
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'El email ya está en uso. Intenta iniciar sesión.';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'El formato del email no es válido.';
          break;
        case 'auth/weak-password':
          this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          this.errorMessage = 'Email o contraseña incorrectos.';
          break;
        case 'auth/too-many-requests':
          this.errorMessage = 'Demasiados intentos fallidos. Intenta de nuevo más tarde.';
          break;
        default:
          this.errorMessage = 'Ocurrió un error. Por favor, inténtalo de nuevo.';
          break;
      }
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cierra el modal.
   */
  onClose(): void {
    this.close.emit();
  }
}
