import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, of, BehaviorSubject } from 'rxjs'; // Import BehaviorSubject
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
  // Cambiado a BehaviorSubject para que los observadores siempre reciban el último valor
  cartItems$: BehaviorSubject<CartItem[]> = new BehaviorSubject<CartItem[]>([]);
  totalAmount$: Observable<number>;
  currentUserSubscription: Subscription | undefined;
  userId: string | null = null;
  showPurchaseHistoryButton: boolean = false;

  private editedQuantities: Map<string, number> = new Map();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {
    // totalAmount$ ahora se suscribe directamente a los cambios de cartItems$ (BehaviorSubject)
    this.totalAmount$ = this.cartItems$.pipe(
      map(items => {
        const calculatedTotal = this.calculateTotal(items);
        console.log('ShoppingCartComponent: Items siendo pasados a calculateTotal (desde totalAmount$ pipe):', items); // LOG
        console.log('ShoppingCartComponent: Total calculado (desde totalAmount$ pipe):', calculatedTotal); // LOG
        return calculatedTotal;
      })
    );
  }

  ngOnInit(): void {
    this.currentUserSubscription = this.authService.user$.pipe(
      switchMap(user => {
        this.userId = user ? user.uid : null;
        console.log('ShoppingCartComponent: User ID after auth state change:', this.userId); // LOG
        if (this.userId) {
          this.checkPurchaseHistory(this.userId);
          // Retornamos el Observable de los ítems del carrito directamente
          return this.cartService.getCart(this.userId);
        } else {
          this.showPurchaseHistoryButton = false;
          return of([]);
        }
      }),
      map(items => {
        this.editedQuantities.clear();
        console.log('ShoppingCartComponent: Carrito recibido (items crudos) del servicio y procesado:', items); // LOG
        return items;
      })
    ).subscribe(items => {
      // Usamos next() para empujar los nuevos ítems al BehaviorSubject
      this.cartItems$.next(items);
    });
  }

  ngOnDestroy(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
    // Es importante completar el BehaviorSubject al destruir el componente
    this.cartItems$.complete();
  }

  private checkPurchaseHistory(userId: string): void {
    this.cartService.getPurchaseHistory(userId).pipe(
      take(1),
      map(purchases => {
        console.log('ShoppingCartComponent: Historial de compras para checkPurchaseHistory:', purchases); // LOG
        return purchases.length > 0;
      })
    ).subscribe(hasHistory => {
      this.showPurchaseHistoryButton = hasHistory;
      console.log('ShoppingCartComponent: ¿Tiene historial de compras?', hasHistory); // LOG
    });
  }

  /**
   * Calcula el monto total del carrito.
   * @param items Los ítems actuales en el carrito.
   * @returns El monto total.
   */
  private calculateTotal(items: CartItem[]): number {
    console.log('calculateTotal: Recibiendo items para sumar:', items); // LOG
    return items.reduce((sum, item) => {
      console.log(`calculateTotal: Sumando item: ${item.nombre}, Precio: ${item.precio}, Cantidad: ${item.cantidad}`); // LOG
      // Asegurarse de que precio y cantidad sean tratados como números
      const itemPrice = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio as any) || 0;
      const itemQuantity = typeof item.cantidad === 'number' ? item.cantidad : parseInt(item.cantidad as any, 10) || 0;

      const itemTotal = itemPrice * itemQuantity;
      console.log(`calculateTotal: Subtotal para ${item.nombre}: ${itemTotal}`); // LOG
      return sum + itemTotal;
    }, 0);
  }

  onQuantityChange(item: CartItem, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);

    if (isNaN(newQuantity) || newQuantity < 0) {
      // Si el valor no es válido, se revierte al valor actual del ítem para evitar errores
      inputElement.value = String(item.cantidad);
      return;
    }
    const updatedEditedQuantities = new Map(this.editedQuantities);
    updatedEditedQuantities.set(item.pizzaId, newQuantity);
    this.editedQuantities = updatedEditedQuantities;

    console.log(`ShoppingCartComponent: Cantidad de "${item.nombre}" editada a ${newQuantity} (localmente).`);
  }

  hasEditedQuantity(item: CartItem): boolean {
    const editedValue = this.editedQuantities.get(item.pizzaId);
    return editedValue !== undefined && editedValue !== item.cantidad;
  }

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
      console.log(`ShoppingCartComponent: Cantidad de "${item.nombre}" actualizada a ${newQuantity} en Firebase.`);
      // Limpiar la cantidad editada del mapa después de guardar exitosamente
      this.editedQuantities.delete(item.pizzaId);
    } catch (error) {
      console.error('ShoppingCartComponent: Error al actualizar cantidad en Firebase:', error);
      alert('Error al actualizar la cantidad. Por favor, inténtalo de nuevo.');
    }
  }

  async removeItem(item: CartItem): Promise<void> {
    if (this.userId && item.pizzaId) {
      // NO USAR confirm(), reemplazar con un modal personalizado
      // if (confirm(`¿Estás seguro de que quieres eliminar "${item.nombre}" del carrito?`)) {
        try {
          await this.cartService.removeItemFromCart(this.userId, item.pizzaId);
          alert(`"${item.nombre}" eliminado del carrito.`); // Temporal, reemplazar con modal
          console.log(`ShoppingCartComponent: "${item.nombre}" eliminado del carrito en Firebase.`);
        } catch (error) {
          console.error('ShoppingCartComponent: Error al eliminar ítem de Firebase:', error);
          alert('Error al eliminar el ítem del carrito. Por favor, inténtalo de nuevo.'); // Temporal, reemplazar con modal
        }
      // }
    }
  }

  async checkout(): Promise<void> {
    if (!this.userId) {
      alert('Debes iniciar sesión para completar la compra.');
      return;
    }

    // Asegurarse de que todas las cantidades editadas estén guardadas antes de proceder con la compra
    if (this.editedQuantities.size > 0) {
      alert('Por favor, guarda o descarta los cambios de cantidad antes de proceder con la compra.');
      return;
    }

    // Obtener los ítems actuales del BehaviorSubject para un total preciso
    const currentCartItems = this.cartItems$.getValue();
    const currentTotal = this.calculateTotal(currentCartItems);

    if (currentCartItems.length === 0) {
      alert('Tu carrito está vacío. Agrega productos antes de comprar.');
      return;
    }

    // NO USAR confirm(), reemplazar con un modal personalizado
    // if (confirm(`¿Confirmas la compra por un total de ${currentTotal?.toFixed(2)} Pesos Uruguayos?`)) {
      try {
        await this.cartService.recordPurchase(this.userId, currentCartItems, currentTotal);
        console.log('ShoppingCartComponent: Compra registrada exitosamente.');

        await this.cartService.clearCart(this.userId);
        alert('¡Compra realizada con éxito! Tu carrito ha sido vaciado.'); // Temporal, reemplazar con modal
        this.showPurchaseHistoryButton = true;
        console.log('ShoppingCartComponent: Carrito vaciado después de la compra.');

      } catch (error) {
        console.error('ShoppingCartComponent: Error al procesar la compra:', error);
        alert('Ocurrió un error al procesar tu compra. Por favor, inténtalo de nuevo.'); // Temporal, reemplazar con modal
      }
    // }
  }

  viewPurchaseHistory(): void {
    this.router.navigate(['/purchase-history']);
  }
}
