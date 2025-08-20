import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, take } from 'rxjs/operators';
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
  private editedQuantities: Map<string, number> = new Map();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
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
      switchMap(user => {
        this.userId = user ? user.uid : null;
        console.log('ShoppingCartComponent: User ID after auth state change:', this.userId);

        if (this.userId) {
          this.checkPurchaseHistory(this.userId);
          return this.cartService.getCart(this.userId);
        } else {
          this.showPurchaseHistoryButton = false;
          return of([]);
        }
      }),
      map((items: CartItem[]) => {
        this.cart = items;
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

  hasEditedQuantity(item: CartItem): boolean {
    const editedValue = this.editedQuantities.get(item.id);
    return editedValue !== undefined && editedValue !== item.cantidad;
  }

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

  viewPurchaseHistory(): void {
    this.router.navigate(['/purchase-history']);
  }

  /**
   * Initiates the payment process with Mercado Pago.
   * Ensures data is valid and correctly formatted before sending to the backend.
   */
  payWithMercadoPago(): void {
    if (!this.userId) {
      alert('Debes iniciar sesión para completar la compra.');
      this.router.navigate(['/login']);
      return;
    }

    // Use this.cart to ensure we have the latest state from ngOnInit
    if (!this.cart || this.cart.length === 0) {
      alert('Tu carrito está vacío. Agrega productos para continuar.');
      return;
    }

    // Validate cart items before sending them
    const validItems = this.cart.map(item => {
        // Ensure name is a string, quantity is a positive number, and price is a positive number
        const quantity = Number(item.cantidad);
        const price = Number(item.precio);

        if (!item.nombre || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
            console.error('Error de validación en el frontend: ', item);
            return null; // Return null for invalid items
        }

        return {
            title: item.nombre,
            quantity: quantity,
            unit_price: price,
        };
    }).filter(item => item !== null); // Filter out any invalid items

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
            alert('Ocurrió un error al procesar tu pago con Mercado Pago. Por favor, inténtalo de nuevo.');
        }
      }
    });
  }
}
