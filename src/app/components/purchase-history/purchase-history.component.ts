import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common'; // Importa DatePipe
import { RouterLink } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { Purchase } from '../../models/purchase.model'; // Importa el modelo de Purchase

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe], // Añade DatePipe
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.css'
})
export class PurchaseHistoryComponent implements OnInit, OnDestroy {
  purchases$: Observable<Purchase[]>;
  currentUserSubscription: Subscription | undefined;
  userId: string | null = null;
  loading: boolean = true; // Para controlar el estado de carga

  constructor(
    private authService: AuthService,
    private cartService: CartService
  ) {
    this.purchases$ = of([]); // Inicializa el observable
  }

  ngOnInit(): void {
    this.currentUserSubscription = this.authService.user$.pipe(
      switchMap(user => {
        this.userId = user ? user.uid : null;
        if (this.userId) {
          this.loading = true; // Muestra el estado de carga al iniciar la busqueda
          return this.cartService.getPurchaseHistory(this.userId);
        } else {
          this.loading = false; // No hay usuario, no hay carga
          return of([]); // No hay usuario, no hay historial
        }
      }),
      map((purchases: Purchase[]) => { // Añadido tipo explícito a 'purchases'
        this.loading = false; // Oculta el estado de carga una vez que se reciben los datos
        console.log('Historial de compras cargado:', purchases);
        // Ordenar las compras por fecha descendente (las mas recientes primero)
        return purchases.sort((a: Purchase, b: Purchase) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      })
    ).subscribe(
      // Asignamos el resultado al observable purchases$
      (purchases) => this.purchases$ = of(purchases),
      (error) => {
        console.error('Error al cargar el historial de compras:', error);
        this.loading = false; // Asegura que el estado de carga se desactive en caso de error
        this.purchases$ = of([]); // Muestra un array vacio en caso de error
      }
    );
  }

  ngOnDestroy(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
  }
}
