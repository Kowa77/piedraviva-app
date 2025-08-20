import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators'; // Elimina 'first' si no lo usas
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem } from '../../models/cart-item.model';
import { Purchase } from '../../models/purchase.model';
import { User } from '@angular/fire/auth'; // Asegúrate de que User esté importado
import { environment } from '../../../environments/environment'; // Importa el archivo de entorno
import { HttpClient } from '@angular/common/http'; // Importa HttpClient

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
  // user: User | null = null; // Puedes quitar esta propiedad si solo usas userId para la lógica
  userId: string | null = null; // Mantén userId para las llamadas a servicios
  showPurchaseHistoryButton: boolean = false;

  // ¡IMPORTANTE! Declara la propiedad 'cart' aquí
  cart: CartItem[] = [];

  private editedQuantities: Map<string, number> = new Map();

  constructor(
    private cartService: CartService,
    private authService: AuthService, // Inyecta AuthService
    private router: Router,
    private http: HttpClient // Inyecta HttpClient
  ) {
    this.totalAmount$ = this.cartItems$.pipe(
      map(items => {
        const calculatedTotal = this.calculateTotal(items);
        console.log('ShoppingCartComponent: Items being passed to calculateTotal (from totalAmount$ pipe):', items);
        console.log('ShoppingCartComponent: Calculated total (from totalAmount$ pipe):', calculatedTotal);
        return calculatedTotal;
      })
    );
  }

  ngOnInit(): void {
    this.currentUserSubscription = this.authService.user$.pipe(
      // Utilizamos un observable para manejar el estado del carrito
      switchMap(user => {
        this.userId = user ? user.uid : null; // Asigna el UID del usuario
        // Ya no asignamos this.user = user aquí, si no lo necesitas para otras lógicas
        console.log('ShoppingCartComponent: User ID after auth state change:', this.userId);

        if (this.userId) {
          this.checkPurchaseHistory(this.userId);
          return this.cartService.getCart(this.userId);
        } else {
          this.showPurchaseHistoryButton = false;
          return of([]); // Si no hay usuario, el carrito está vacío
        }
      }),
      map((items: CartItem[]) => {
        // Asegúrate de que 'cartItems$' emite los ítems y también actualiza 'this.cart'
        // para que la función payWithMercadoPago tenga la data más reciente.
        this.cart = items; // <-- Importante: Actualiza la propiedad 'cart'
        this.editedQuantities.clear();
        console.log('ShoppingCartComponent: Cart received (raw items) from service and processed:', items);
        return items;
      })
    ).subscribe(items => {
      this.cartItems$.next(items);
    });
  }

  ngOnDestroy(): void {
    if (this.currentUserSubscription) {
      this.currentUserSubscription.unsubscribe();
    }
    this.cartItems$.complete();
  }

  /**
   * Checks if the user has a purchase history to show the button.
   * @param userId The user's UID.
   */
  private checkPurchaseHistory(userId: string): void {
    this.cartService.getPurchaseHistory(userId).pipe(
      take(1),
      map((purchases: Purchase[]) => {
        console.log('ShoppingCartComponent: Purchase history for checkPurchaseHistory:', purchases);
        return purchases.length > 0;
      })
    ).subscribe((hasHistory: boolean) => {
      this.showPurchaseHistoryButton = hasHistory;
      console.log('ShoppingCartComponent: Has purchase history?', hasHistory);
    });
  }

  /**
   * Calculates the total amount of the cart.
   * @param items Current items in the cart.
   * @returns The total amount.
   */
  private calculateTotal(items: CartItem[]): number {
    console.log('calculateTotal: Receiving items to sum:', items);
    return items.reduce((sum, item) => {
      console.log(`calculateTotal: Summing item: ${item.nombre}, Price: ${item.precio}, Quantity: ${item.cantidad}`);
      const itemPrice = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio as any) || 0;
      const itemQuantity = typeof item.cantidad === 'number' ? item.cantidad : parseInt(item.cantidad as any, 10) || 0;

      const itemTotal = itemPrice * itemQuantity;
      console.log(`calculateTotal: Subtotal for ${item.nombre}: ${itemTotal}`);
      return sum + itemTotal;
    }, 0);
  }

  /**
   * Handles the change in the quantity input for a cart item.
   * Stores the edited value temporarily and updates the input visually.
   * @param item The cart item being edited.
   * @param event The input change event.
   */
  onQuantityChange(item: CartItem, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const nuevoValorString = inputElement.value.trim();

    let newQuantityForMap: number;

    if (nuevoValorString === '') {
      newQuantityForMap = 0;
    } else {
      const parsedQuantity = parseInt(nuevoValorString, 10);
      if (isNaN(parsedQuantity) || parsedQuantity < 0) {
        console.warn(`ShoppingCartComponent: Invalid entry for "${item.nombre}". Restored to ${item.cantidad}.`);
        inputElement.value = String(item.cantidad);
        return;
      }
      newQuantityForMap = parsedQuantity;
    }

    this.editedQuantities.set(item.id, newQuantityForMap);

    const currentItems = this.cartItems$.getValue();
    const itemToUpdateIndex = currentItems.findIndex(i => i.id === item.id);
    if (itemToUpdateIndex > -1) {
      const updatedItems = [...currentItems];
      updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: newQuantityForMap };
      this.cartItems$.next(updatedItems);
    }
  }

  /**
   * Handles the blur event of the quantity input, saving changes if they exist.
   * @param item The cart item that lost focus.
   * @param event The blur event.
   */
  onQuantityBlur(item: CartItem, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value.trim();
    let finalQuantity = parseInt(value, 10);

    if (isNaN(finalQuantity) || finalQuantity < 0) {
      finalQuantity = 1;
      this.editedQuantities.set(item.id, finalQuantity);
      inputElement.value = String(finalQuantity);
      console.log(`ShoppingCartComponent: Invalid input for "${item.nombre}" on blur. Restored to 1.`);
    } else if (finalQuantity === 0) {
      this.removeItem(item);
      this.editedQuantities.delete(item.id);
      return;
    }

    if (this.hasEditedQuantity(item)) {
      console.log(`ShoppingCartComponent: onQuantityBlur triggered for "${item.nombre}". Saving quantity.`);
      this.saveQuantity(item);
    } else if (finalQuantity === item.cantidad && this.editedQuantities.has(item.id)) {
      this.editedQuantities.delete(item.id);
    }
  }

  /**
   * Increments the quantity of an item in the cart.
   * Updates the BehaviorSubject and the edited quantities map.
   * @param item The cart item to increment.
   */
  incrementQuantity(item: CartItem): void {
    let currentQuantity = this.editedQuantities.get(item.id);
    if (currentQuantity === undefined) {
      currentQuantity = item.cantidad;
    }

    const newQuantity = currentQuantity + 1;
    this.editedQuantities.set(item.id, newQuantity);

    const currentItems = this.cartItems$.getValue();
    const itemToUpdateIndex = currentItems.findIndex(i => i.id === item.id);
    if (itemToUpdateIndex > -1) {
      const updatedItems = [...currentItems];
      updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: newQuantity };
      this.cartItems$.next(updatedItems);
      this.saveQuantity(updatedItems[itemToUpdateIndex]);
    }
    console.log(`ShoppingCartComponent: Quantity of "${item.nombre}" incremented to ${newQuantity} (locally).`);
  }

  /**
   * Decrements the quantity of an item in the cart.
   * Updates the BehaviorSubject and the edited quantities map.
   * @param item The cart item to decrement.
   */
  decrementQuantity(item: CartItem): void {
    let currentQuantity = this.editedQuantities.get(item.id);
    if (currentQuantity === undefined) {
      currentQuantity = item.cantidad;
    }

    if (currentQuantity > 0) {
      const newQuantity = currentQuantity - 1;
      this.editedQuantities.set(item.id, newQuantity);

      const currentItems = this.cartItems$.getValue();
      const itemToUpdateIndex = currentItems.findIndex(i => i.id === item.id);
      if (itemToUpdateIndex > -1) {
        const updatedItems = [...currentItems];
        updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: newQuantity };
        this.cartItems$.next(updatedItems);
        if (newQuantity === 0) {
          this.removeItem(updatedItems[itemToUpdateIndex]);
        } else {
          this.saveQuantity(updatedItems[itemToUpdateIndex]);
        }
      }
      console.log(`ShoppingCartComponent: Quantity of "${item.nombre}" decremented to ${newQuantity} (locally).`);
    } else {
      console.log(`ShoppingCartComponent: Quantity of "${item.nombre}" is already 0, cannot decrement further.`);
    }
  }

  /**
   * Checks if a cart item has an edited quantity (pending save).
   * @param item The cart item.
   * @returns True if the quantity has been edited, false otherwise.
   */
  hasEditedQuantity(item: CartItem): boolean {
    const editedValue = this.editedQuantities.get(item.id);
    return editedValue !== undefined && editedValue !== item.cantidad;
  }

  /**
   * Saves the quantity edited for an item to the database.
   * @param item The cart item to save.
   */
  async saveQuantity(item: CartItem): Promise<void> {
    if (!this.userId || !item.id) {
      alert('Error: No se pudo identificar al usuario o al producto.');
      return;
    }

    const newQuantity = this.editedQuantities.get(item.id);

    if (newQuantity === undefined) {
      console.log(`ShoppingCartComponent: No quantity change for "${item.nombre}" to save.`);
      return;
    }

    if (newQuantity === 0) {
      this.removeItem(item);
      this.editedQuantities.delete(item.id);
      return;
    }

    if (isNaN(newQuantity) || newQuantity < 0) {
      alert('Por favor, ingresa una cantidad válida (mayor o igual a cero).');
      this.editedQuantities.delete(item.id);
      const currentItems = this.cartItems$.getValue();
      const itemToRestore = currentItems.find(i => i.id === item.id);
      if (itemToRestore) {
        const updatedItems = currentItems.map(i => i.id === item.id ? { ...i, cantidad: itemToRestore.cantidad } : i);
        this.cartItems$.next(updatedItems);
      }
      return;
    }

    try {
      await this.cartService.updateItemQuantity(this.userId, item.id, newQuantity);
      console.log(`ShoppingCartComponent: Cantidad de "${item.nombre}" actualizada a ${newQuantity} en Firebase.`);
      this.editedQuantities.delete(item.id);
    } catch (error) {
      console.error('ShoppingCartComponent: Error al actualizar la cantidad en Firebase:', error);
      alert('Error al actualizar la cantidad. Por favor, inténtalo de nuevo.');
    }
  }

  /**
   * Removes an item from the cart.
   * @param item The cart item to remove.
   */
  async removeItem(item: CartItem): Promise<void> {
    if (!this.userId || !item.id) {
      alert('Error: No se pudo identificar al usuario o al producto para eliminar.');
      return;
    }

    try {
      await this.cartService.removeItemFromCart(this.userId, item.id);
      alert(`"${item.nombre}" eliminado del carrito.`);
      console.log(`ShoppingCartComponent: "${item.nombre}" eliminado del carrito en Firebase.`);
      this.editedQuantities.delete(item.id);
    } catch (error) {
      console.error('ShoppingCartComponent: Error al eliminar el item del carrito en Firebase:', error);
      alert('Error al eliminar el item del carrito. Por favor, inténtalo de nuevo.');
    }
  }

  /**
   * Proceeds to the checkout process.
   */
  async checkout(): Promise<void> {
    if (!this.userId) {
      alert('Debes iniciar sesión para completar la compra.');
      return;
    }

    const currentCartItems = this.cartItems$.getValue();
    const currentTotal = this.calculateTotal(currentCartItems);

    if (currentCartItems.length === 0) {
      alert('Tu carrito está vacío. Agrega productos antes de comprar.');
      return;
    }

    try {
      await this.cartService.recordPurchase(this.userId, currentCartItems, currentTotal);
      console.log('ShoppingCartComponent: Compra registrada exitosamente.');

      await this.cartService.clearCart(this.userId);
      alert('¡Compra exitosa! Tu carrito ha sido vaciado.');
      this.showPurchaseHistoryButton = true;
      console.log('ShoppingCartComponent: Carrito vaciado después de la compra.');

    } catch (error) {
      console.error('ShoppingCartComponent: Error al procesar la compra:', error);
      alert('Ocurrió un error al procesar tu compra. Por favor, inténtalo de nuevo.');
    }
  }

  /**
   * Navigates to the purchase history page.
   */
  viewPurchaseHistory(): void {
    this.router.navigate(['/purchase-history']);
  }

  /**
   * Initiates the payment process with Mercado Pago.
   */
  payWithMercadoPago(): void {
    // La validación debería usar this.userId en lugar de this.user directamente.
    // Además, 'this.cart' se actualiza en el subscribe del ngOnInit
    if (!this.userId || this.cart.length === 0) {
      console.error('El usuario no está autenticado o el carrito está vacío.');
      // Opcional: Podrías redirigir al login si !this.userId
      if (!this.userId) {
        alert('Debes iniciar sesión para completar la compra.');
        this.router.navigate(['/login']); // Redirige al login si no hay userId
      } else {
        alert('Tu carrito está vacío. Agrega productos para continuar.');
      }
      return;
    }

    const body = {
      items: this.cart.map(item => ({
        title: item.nombre,
        quantity: item.cantidad,
        unit_price: item.precio
      })),
      userId: this.userId, // Usa this.userId que ya está actualizado
    };

    const backendUrl = environment.backendUrl;

    this.http.post<{ id: string, init_point: string }>(`${backendUrl}/create_preference`, body).subscribe({
      next: (response) => {
        if (response && response.init_point) {
          window.location.href = response.init_point;
        } else {
          console.error('No se recibió la URL de pago de Mercado Pago.');
        }
      },
      error: (error) => {
        console.error('Error al crear la preferencia de pago:', error);
        alert('Ocurrió un error al procesar tu pago con Mercado Pago. Por favor, inténtalo de nuevo.');
      }
    });
  }
}

