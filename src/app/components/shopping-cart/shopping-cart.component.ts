import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, first, take } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem } from '../../models/cart-item.model'; // Asegúrate de que esta interfaz tenga 'pizzaId'
import { Purchase } from '../../models/purchase.model';

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

  private editedQuantities: Map<string, number> = new Map();

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
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
          // Check purchase history when the cart loads if a user is logged in
          this.checkPurchaseHistory(this.userId);
          return this.cartService.getCart(this.userId);
        } else {
          this.showPurchaseHistoryButton = false; // No user, no history to show
          return of([]); // If no user, cart is empty
        }
      }),
      map((items: CartItem[]) => { // Explicitly type 'items'
        this.editedQuantities.clear(); // Clear edited quantities when new items are loaded
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
    this.cartItems$.complete(); // Complete the BehaviorSubject when the component is destroyed
  }

  /**
   * Checks if the user has a purchase history to show the button.
   * @param userId The user's UID.
   */
  private checkPurchaseHistory(userId: string): void {
    this.cartService.getPurchaseHistory(userId).pipe(
      take(1), // Only need the first value to decide whether to show the button
      map((purchases: Purchase[]) => { // Explicitly type 'purchases'
        console.log('ShoppingCartComponent: Purchase history for checkPurchaseHistory:', purchases);
        return purchases.length > 0; // Return true if there's at least one purchase
      })
    ).subscribe((hasHistory: boolean) => { // Explicitly type 'hasHistory'
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
      // If the field is completely empty, represent it internally as 0.
      newQuantityForMap = 0;
    } else {
      const parsedQuantity = parseInt(nuevoValorString, 10);
      if (isNaN(parsedQuantity) || parsedQuantity < 0) {
        // If it's not a valid number or is negative,
        // restore the input visually to the item's current quantity (what's already in the BehaviorSubject)
        // and do not update the edited quantities map.
        console.warn(`ShoppingCartComponent: Invalid entry for "${item.nombre}". Restored to ${item.cantidad}.`);
        inputElement.value = String(item.cantidad); // Restore visual input
        return; // Exit, do not update editedQuantities or BehaviorSubject for an invalid entry
      }
      newQuantityForMap = parsedQuantity;
    }

    // Store the edited quantity in the local map for later saving.
    this.editedQuantities.set(item.id, newQuantityForMap); // Cambiado de item.pizzaId a item.id

    console.log(`ShoppingCartComponent: Quantity of "${item.nombre}" edited to ${newQuantityForMap} (locally).`);

    // Update the item's quantity directly in the BehaviorSubject.
    // This is KEY for the [value]="item.cantidad === 0 ? '' : item.cantidad" binding
    // in the HTML to react and visually update the input (to empty if newQuantityForMap is 0).
    const currentItems = this.cartItems$.getValue();
    const itemToUpdateIndex = currentItems.findIndex(i => i.id === item.id); // Cambiado de item.pizzaId a item.id
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
    // If the input is empty or invalid after blur, set quantity to 0 and remove if 0, otherwise set to 1.
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value.trim();
    let finalQuantity = parseInt(value, 10);

    if (isNaN(finalQuantity) || finalQuantity < 0) {
      finalQuantity = 1; // Default to 1 if invalid or empty on blur
      this.editedQuantities.set(item.id, finalQuantity); // Cambiado de item.pizzaId a item.id
      inputElement.value = String(finalQuantity); // Update input visually
      console.log(`ShoppingCartComponent: Invalid input for "${item.nombre}" on blur. Restored to 1.`);
    } else if (finalQuantity === 0) {
      // If the final quantity is 0, attempt to remove the item
      this.removeItem(item); // This will handle confirmation internally.
      this.editedQuantities.delete(item.id); // Cambiado de item.pizzaId a item.id
      return; // Exit, as removeItem will handle further state updates
    }

    // Only save if the quantity has actually changed from the original item.cantidad
    // AND if it's different from the value in the map (which might be the same if it was just a valid number entered)
    if (this.hasEditedQuantity(item)) {
      console.log(`ShoppingCartComponent: onQuantityBlur triggered for "${item.nombre}". Saving quantity.`);
      this.saveQuantity(item);
    } else if (finalQuantity === item.cantidad && this.editedQuantities.has(item.id)) { // Cambiado de item.pizzaId a item.id
        // If the quantity on blur is the same as original and it was somehow in editedQuantities, clean up.
        this.editedQuantities.delete(item.id); // Cambiado de item.pizzaId a item.id
    }
  }


  /**
   * Increments the quantity of an item in the cart.
   * Updates the BehaviorSubject and the edited quantities map.
   * @param item The cart item to increment.
   */
  incrementQuantity(item: CartItem): void {
    // Get the current quantity from the BehaviorSubject or the edited map
    let currentQuantity = this.editedQuantities.get(item.id); // Cambiado de item.pizzaId a item.id
    if (currentQuantity === undefined) { // If not in edited map, use current item quantity from BehaviorSubject
        currentQuantity = item.cantidad;
    }

    const newQuantity = currentQuantity + 1;
    this.editedQuantities.set(item.id, newQuantity); // Cambiado de item.pizzaId a item.id

    const currentItems = this.cartItems$.getValue();
    const itemToUpdateIndex = currentItems.findIndex(i => i.id === item.id); // Cambiado de item.pizzaId a item.id
    if (itemToUpdateIndex > -1) {
      const updatedItems = [...currentItems];
      updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: newQuantity };
      this.cartItems$.next(updatedItems);
      this.saveQuantity(updatedItems[itemToUpdateIndex]); // Guarda automáticamente al incrementar/decrementar
    }
    console.log(`ShoppingCartComponent: Quantity of "${item.nombre}" incremented to ${newQuantity} (locally).`);
  }

  /**
   * Decrements the quantity of an item in the cart.
   * Updates the BehaviorSubject and the edited quantities map.
   * @param item The cart item to decrement.
   */
  decrementQuantity(item: CartItem): void {
    // Get the current quantity from the BehaviorSubject or the edited map
    let currentQuantity = this.editedQuantities.get(item.id); // Cambiado de item.pizzaId a item.id
    if (currentQuantity === undefined) { // If not in edited map, use current item quantity from BehaviorSubject
        currentQuantity = item.cantidad;
    }

    if (currentQuantity > 0) { // Ensure quantity does not go below 0
      const newQuantity = currentQuantity - 1;
      this.editedQuantities.set(item.id, newQuantity); // Cambiado de item.pizzaId a item.id

      const currentItems = this.cartItems$.getValue();
      const itemToUpdateIndex = currentItems.findIndex(i => i.id === item.id); // Cambiado de item.pizzaId a item.id
      if (itemToUpdateIndex > -1) {
        const updatedItems = [...currentItems];
        updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: newQuantity };
        this.cartItems$.next(updatedItems);
        // Save automatically, or remove if quantity becomes 0
        if (newQuantity === 0) {
            this.removeItem(updatedItems[itemToUpdateIndex]); // Handles confirmation and removal
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
    const editedValue = this.editedQuantities.get(item.id); // Cambiado de item.pizzaId a item.id
    // Consider it edited if the value in the map exists and is different from the original quantity
    return editedValue !== undefined && editedValue !== item.cantidad;
  }

  /**
   * Saves the quantity edited for an item to the database.
   * @param item The cart item to save.
   */
  async saveQuantity(item: CartItem): Promise<void> {
    if (!this.userId || !item.id) { // Cambiado de item.pizzaId a item.id
      alert('Error: No se pudo identificar al usuario o al producto.');
      return;
    }

    const newQuantity = this.editedQuantities.get(item.id); // Cambiado de item.pizzaId a item.id

    // If newQuantity is undefined, it means no actual edit was made, or it was already handled.
    if (newQuantity === undefined) {
        console.log(`ShoppingCartComponent: No quantity change for "${item.nombre}" to save.`);
        return;
    }

    // If the quantity is 0, ask the user if they want to remove the item.
    if (newQuantity === 0) {
      // NOTA: Se debe usar un modal personalizado en lugar de `confirm()`
      // if (confirm(`¿Estás seguro de que quieres eliminar "${item.nombre}" del carrito?`)) {
      //   await this.removeItem(item);
      // } else {
      //   // Si el usuario cancela la eliminación, restaurar la cantidad a 1
      //   this.editedQuantities.set(item.id, 1); // Cambiado de item.pizzaId a item.id
      //   const currentItems = this.cartItems$.getValue();
      //   const itemToUpdateIndex = currentItems.findIndex(i => i.id === item.id); // Cambiado de item.pizzaId a item.id
      //   if (itemToUpdateIndex > -1) {
      //     const updatedItems = [...currentItems];
      //     updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: 1 };
      //     this.cartItems$.next(updatedItems);
      //   }
      // }
      // Directamente llama a removeItem si la cantidad es 0, que ya tiene su propio manejo.
      this.removeItem(item);
      this.editedQuantities.delete(item.id); // Cambiado de item.pizzaId a item.id // Clear from map as it's being handled
      return;
    }

    if (isNaN(newQuantity) || newQuantity < 0) {
      alert('Por favor, ingresa una cantidad válida (mayor o igual a cero).');
      this.editedQuantities.delete(item.id); // Cambiado de item.pizzaId a item.id // Clear invalid entry from map
      // Restore the visual input to the actual item.cantidad
      const currentItems = this.cartItems$.getValue();
      const itemToRestore = currentItems.find(i => i.id === item.id); // Cambiado de item.pizzaId a item.id
      if (itemToRestore) {
        const updatedItems = currentItems.map(i => i.id === item.id ? { ...i, cantidad: itemToRestore.cantidad } : i); // Cambiado de item.pizzaId a item.id
        this.cartItems$.next(updatedItems);
      }
      return;
    }

    try {
      await this.cartService.updateItemQuantity(this.userId, item.id, newQuantity); // Cambiado de item.pizzaId a item.id
      console.log(`ShoppingCartComponent: Cantidad de "${item.nombre}" actualizada a ${newQuantity} en Firebase.`);
      this.editedQuantities.delete(item.id); // Cambiado de item.pizzaId a item.id // Remove the entry from the edited map
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
    if (!this.userId || !item.id) { // Cambiado de item.pizzaId a item.id
      alert('Error: No se pudo identificar al usuario o al producto para eliminar.');
      return;
    }

    // NOTA: Se debe usar un modal personalizado en lugar de `confirm()`
    // if (!confirm(`¿Estás seguro de que quieres eliminar "${item.nombre}" del carrito?`)) {
    //   return;
    // }

    try {
      await this.cartService.removeItemFromCart(this.userId, item.id); // Cambiado de item.pizzaId a item.id
      alert(`"${item.nombre}" eliminado del carrito.`);
      console.log(`ShoppingCartComponent: "${item.nombre}" eliminado del carrito en Firebase.`);
      // Elimina de las cantidades editadas si existía
      this.editedQuantities.delete(item.id); // Cambiado de item.pizzaId a item.id
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
        // Record the purchase in the database
        await this.cartService.recordPurchase(this.userId, currentCartItems, currentTotal);
        console.log('ShoppingCartComponent: Compra registrada exitosamente.');

        // Clear the cart after a successful purchase
        await this.cartService.clearCart(this.userId);
        alert('¡Compra exitosa! Tu carrito ha sido vaciado.');
        this.showPurchaseHistoryButton = true; // Ensure the button is shown after the first purchase
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
    this.router.navigate(['/purchase-history']); // Make sure the '/purchase-history' route is configured
  }
}
