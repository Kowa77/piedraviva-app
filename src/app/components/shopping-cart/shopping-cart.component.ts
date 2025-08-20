import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, of, BehaviorSubject } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem } from '../../models/cart-item.model';
import { Purchase } from '../../models/purchase.model';
import { User } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './shopping-cart.component.html',
  styleUrl: './shopping-cart.component.css'
})
export class ShoppingCartComponent implements OnInit, OnDestroy {

  cartItems$: BehaviorSubject<CartItem[]> = new BehaviorSubject<CartItem[]>([]);
  totalAmount$: Observable<number>;
  currentUserSubscription: Subscription | undefined;
  userId: string | null = null;
  showPurchaseHistoryButton: boolean = false;
  cart: CartItem[] = [];

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    this.totalAmount$ = this.cartItems$.pipe(
      map(items => items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0))
    );
  }

  ngOnInit(): void {
    this.currentUserSubscription = this.authService.currentUser.pipe(
      switchMap(user => {
        if (user) {
          this.userId = user.uid;
          // Asume que getCart es un método existente en CartService que devuelve un Observable
          return this.cartService.getCart(user.uid);
        } else {
          this.userId = null;
          return of([]);
        }
      })
    ).subscribe(cartItems => {
      this.cartItems$.next(cartItems);
      this.cart = cartItems;
    });
  }

  ngOnDestroy(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
  }

  incrementQuantity(item: CartItem): void {
    if (this.userId) {
      // Asume que incrementQuantity es un método existente en CartService
      this.cartService.incrementQuantity(this.userId, item);
    }
  }

  decrementQuantity(item: CartItem): void {
    if (this.userId) {
      // Asume que decrementQuantity es un método existente en CartService
      this.cartService.decrementQuantity(this.userId, item);
    }
  }

  removeItem(item: CartItem): void {
    if (this.userId) {
      // Asume que removeItem es un método existente en CartService
      this.cartService.removeItem(this.userId, item);
    }
  }

  payWithMercadoPago(): void {
    if (!this.userId) {
      alert('Debes iniciar sesión para completar la compra.');
      this.router.navigate(['/login']);
      return;
    }

    if (this.cart.length === 0) {
      alert('Tu carrito está vacío. Agrega productos para continuar.');
      return;
    }

    const validItems = this.cart.map(item => {
      const title = item.nombre;
      const quantity = Number(item.cantidad);
      const price = Number(item.precio);

      if (!title || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
        console.error('Error de validación en el frontend: Item inválido en el carrito.', item);
        return null;
      }

      return {
          title: title,
          quantity: quantity,
          unit_price: price,
      };
    }).filter(item => item !== null);

    if (validItems.length === 0) {
        alert('Hubo un error con los productos en tu carrito. Por favor, intenta de nuevo.');
        return;
    }

    const body = {
      items: validItems,
      userId: this.userId,
    };

    const backendUrl = environment.backendUrl;

    this.http.post<{ id: string, init_point: string }>(`${backendUrl}/create_preference`, body).subscribe({
      next: (response) => {
        if (response && response.init_point) {
          window.location.href = response.init_point;
        } else {
          console.error('No se recibió la URL de pago de Mercado Pago.');
          alert('Ocurrió un error al procesar tu pago. No se pudo obtener la URL de Mercado Pago.');
        }
      },
      error: (error) => {
        console.error('Error al crear la preferencia de pago:', error);
        if (error.status === 400 && error.error && error.error.error) {
            alert(`Error de validación del carrito: ${error.error.error}`);
        } else {
            alert('Ocurrió un error inesperado al procesar tu pago. Por favor, intenta más tarde.');
        }
      },
    });
  }

  viewPurchaseHistory(): void {
    if (this.userId) {
      this.router.navigate(['/purchase-history', this.userId]);
    } else {
      alert('Debes iniciar sesión para ver tu historial de compras.');
    }
  }
}
