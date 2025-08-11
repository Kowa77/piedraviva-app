import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service'; // Asegúrate de que la ruta a AuthService sea correcta
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.authService.user$.pipe(
      take(1), // Toma solo el primer valor y luego completa
      map(user => {
        if (user) {
          return true; // Si hay un usuario logueado, permite el acceso
        } else {
          // Si no hay usuario, redirige a la página de inicio o a una página de login
          alert('Necesitas iniciar sesión para acceder a esta página.'); // Puedes reemplazar esto con un modal
          return this.router.createUrlTree(['/']); // Redirige a la ruta principal
        }
      })
    );
  }
}
