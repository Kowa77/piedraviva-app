import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, map, first, take } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem } from '../../models/cart-item.model';
import { Purchase } from '../../models/purchase.model'; // Importa el modelo de Purchase

@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './shopping-cart.component.html',
  styleUrl: './shopping-cart.component.css'
})
export class ShoppingCartComponent implements OnInit, OnDestroy {
  cartItems$: Observable<CartItem[]>;
  totalAmount$: Observable<number>;
  currentUserSubscription: Subscription | undefined; // Reintroducida la declaración
  userId: string | null = null;
  showPurchaseHistoryButton: boolean = false; // Propiedad para controlar la visibilidad del botón

  private editedQuantities: Map<string, number> = new Map();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router // Inyecta Router para la navegación
  ) {
    this.cartItems$ = of([]); // Inicializado a un observable vacío
    this.totalAmount$ = of(0); // Inicializado a un observable que emite 0
  }

  ngOnInit(): void {
    // Suscribimos a authService.user$ directamente para gestionar userId y checkPurchaseHistory
    this.currentUserSubscription = this.authService.user$.pipe(
      switchMap(user => {
        this.userId = user ? user.uid : null;
        if (this.userId) {
          // Verifica si hay historial de compras al cargar el componente o al cambiar de usuario
          this.checkPurchaseHistory(this.userId);
          // Retorna el observable del carrito del usuario actual
          return this.cartService.getCart(this.userId);
        } else {
          this.showPurchaseHistoryButton = false; // Oculta el botón si no hay usuario logueado
          return of([]); // Carrito vacío si no hay usuario
        }
      }),
      map(items => {
        // Limpiamos las cantidades editadas cuando la fuente de verdad (Firebase) se actualiza
        this.editedQuantities.clear();
        console.log('Carrito actualizado desde Firebase:', items);
        return items;
      })
    ).subscribe(items => {
      // Asignamos los ítems recibidos a cartItems$. El 'async' pipe en el template
      // ahora reaccionará a este Observable.
      this.cartItems$ = of(items);
    });

    // totalAmount$ se deriva reactivamente de cartItems$.
    // Se actualizará automáticamente cada vez que cartItems$ emita un nuevo valor.
    this.totalAmount$ = this.cartItems$.pipe(
      map(items => this.calculateTotal(items))
    );
  }

  ngOnDestroy(): void {
    // Desuscripción manual de currentUserSubscription para evitar fugas de memoria
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
  }

  /**
   * Verifica si el usuario tiene historial de compras para mostrar el botón.
   * @param userId El UID del usuario.
   */
  private checkPurchaseHistory(userId: string): void {
    this.cartService.getPurchaseHistory(userId).pipe(
      take(1), // Tomamos solo el primer valor y luego nos desuscribimos
      map(purchases => {
        console.log('Historial de compras recibido en ShoppingCartComponent:', purchases);
        return purchases.length > 0; // Mapeamos a un booleano: true si hay compras, false si no
      })
    ).subscribe(hasHistory => {
      this.showPurchaseHistoryButton = hasHistory;
      console.log('¿Tiene historial de compras al cargar (resultado final)?', hasHistory);
    });
  }

  /**
   * Calcula el monto total del carrito.
   * @param items Los ítems actuales en el carrito.
   * @returns El monto total.
   */
  private calculateTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }

  /**
   * Maneja el cambio en el input de cantidad.
   * Almacena la cantidad editada localmente, pero no actualiza la DB todavía.
   * @param item El ítem del carrito.
   * @param event El evento del input.
   */
  onQuantityChange(item: CartItem, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);

    if (isNaN(newQuantity) || newQuantity < 0) {
      return;
    }
    const updatedEditedQuantities = new Map(this.editedQuantities);
    updatedEditedQuantities.set(item.pizzaId, newQuantity);
    this.editedQuantities = updatedEditedQuantities;

    console.log(`Cantidad de "${item.nombre}" editada a ${newQuantity} (localmente).`);
  }

  /**
   * Verifica si un ítem tiene una cantidad editada pendiente de guardar.
   * @param item El ítem del carrito.
   * @returns True si hay una cantidad editada y es diferente de la cantidad actual del ítem, false en caso contrario.
   */
  hasEditedQuantity(item: CartItem): boolean {
    const editedValue = this.editedQuantities.get(item.pizzaId);
    return editedValue !== undefined && editedValue !== item.cantidad;
  }

  /**
   * Guarda la cantidad editada de un ítem en la base de datos.
   * @param item El ítem del carrito a actualizar.
   */
  async saveQuantity(item: CartItem): Promise<void> {
    if (!this.userId || !item.pizzaId) {
      alert('Error: No se pudo identificar el usuario o el producto.');
      return;
    }

    const newQuantity = this.editedQuantities.get(item.pizzaId);

    if (newQuantity === undefined || isNaN(newQuantity) || newQuantity < 0) {
      alert('Por favor, introduce una cantidad válida.');
      return;
    }

    try {
      await this.cartService.updateItemQuantity(this.userId, item.pizzaId, newQuantity);
      alert(`Cantidad de "${item.nombre}" actualizada a ${newQuantity}.`);
      console.log(`Cantidad de "${item.nombre}" actualizada a ${newQuantity} en Firebase.`);
    } catch (error) {
      console.error('Error al actualizar cantidad en Firebase:', error);
      alert('Error al actualizar la cantidad. Por favor, inténtalo de nuevo.');
    }
  }

  /**
   * Elimina un ítem del carrito.
   * @param item El ítem del carrito a eliminar.
   */
  async removeItem(item: CartItem): Promise<void> {
    if (this.userId && item.pizzaId) {
      if (confirm(`¿Estás seguro de que quieres eliminar "${item.nombre}" del carrito?`)) {
        try {
          await this.cartService.removeItemFromCart(this.userId, item.pizzaId);
          alert(`"${item.nombre}" eliminado del carrito.`);
          console.log(`"${item.nombre}" eliminado del carrito en Firebase.`);
        } catch (error) {
          console.error('Error al eliminar ítem de Firebase:', error);
          alert('Error al eliminar el ítem del carrito. Por favor, inténtalo de nuevo.');
        }
      }
    }
  }

  /**
   * Procede con la compra del carrito actual.
   */
  async checkout(): Promise<void> {
    if (!this.userId) {
      alert('Debes iniciar sesión para completar la compra.');
      return;
    }

    if (this.editedQuantities.size > 0) {
      alert('Por favor, guarda o descarta los cambios de cantidad antes de proceder con la compra.');
      return;
    }

    const currentCartItems = await this.cartItems$.pipe(map(items => items), first()).toPromise() || [];
    const currentTotal = this.calculateTotal(currentCartItems);

    if (currentCartItems.length === 0) {
      alert('Tu carrito está vacío. Agrega productos antes de comprar.');
      return;
    }

    if (confirm(`¿Confirmas la compra por un total de ${currentTotal?.toFixed(2)} Pesos Uruguayos?`)) {
      try {
        await this.cartService.recordPurchase(this.userId, currentCartItems, currentTotal);
        console.log('Compra registrada exitosamente.');

        await this.cartService.clearCart(this.userId);
        alert('¡Compra realizada con éxito! Tu carrito ha sido vaciado.');
        this.showPurchaseHistoryButton = true; // Muestra el botón de historial después de una compra exitosa
        console.log('Carrito vaciado después de la compra.');

      } catch (error) {
        console.error('Error al procesar la compra:', error);
        alert('Ocurrió un error al procesar tu compra. Por favor, inténtalo de nuevo.');
      }
    }
  }

  /**
   * Navega al componente de historial de compras.
   */
  viewPurchaseHistory(): void {
    this.router.navigate(['/purchase-history']); // Navega a la nueva ruta
  }
}
