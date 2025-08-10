import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, of, BehaviorSubject } from 'rxjs';
import { switchMap, map, first, take } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem } from '../../models/cart-item.model';
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
        return; // Exit, do not update editedQuantities or BehaviorSubject for an invalid entry
      }
      newQuantityForMap = parsedQuantity;
    }

    // Store the edited quantity in the local map for later saving.
    this.editedQuantities.set(item.pizzaId, newQuantityForMap);

    console.log(`ShoppingCartComponent: Quantity of "${item.nombre}" edited to ${newQuantityForMap} (locally).`);

    // Update the item's quantity directly in the BehaviorSubject.
    // This is KEY for the [value]="item.cantidad === 0 ? '' : item.cantidad" binding
    // in the HTML to react and visually update the input (to empty if newQuantityForMap is 0).
    const currentItems = this.cartItems$.getValue();
    const itemToUpdateIndex = currentItems.findIndex(i => i.pizzaId === item.pizzaId);
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
    if (this.hasEditedQuantity(item)) {
      console.log(`ShoppingCartComponent: onQuantityBlur triggered for "${item.nombre}". Saving quantity.`);
      this.saveQuantity(item);
    }
  }

  /**
   * Increments the quantity of an item in the cart.
   * Updates the BehaviorSubject and the edited quantities map.
   * @param item The cart item to increment.
   */
  incrementQuantity(item: CartItem): void {
    // Get the current quantity from the BehaviorSubject or the edited map
    let currentQuantity = this.editedQuantities.get(item.pizzaId);
    if (currentQuantity === undefined) { // If not in edited map, use current item quantity
        currentQuantity = item.cantidad;
    }

    const newQuantity = currentQuantity + 1;
    this.editedQuantities.set(item.pizzaId, newQuantity);

    const currentItems = this.cartItems$.getValue();
    const itemToUpdateIndex = currentItems.findIndex(i => i.pizzaId === item.pizzaId);
    if (itemToUpdateIndex > -1) {
      const updatedItems = [...currentItems];
      updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: newQuantity };
      this.cartItems$.next(updatedItems);
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
    let currentQuantity = this.editedQuantities.get(item.pizzaId);
    if (currentQuantity === undefined) { // If not in edited map, use current item quantity
        currentQuantity = item.cantidad;
    }

    if (currentQuantity > 0) { // Ensure quantity does not go below 0
      const newQuantity = currentQuantity - 1;
      this.editedQuantities.set(item.pizzaId, newQuantity);

      const currentItems = this.cartItems$.getValue();
      const itemToUpdateIndex = currentItems.findIndex(i => i.pizzaId === item.pizzaId);
      if (itemToUpdateIndex > -1) {
        const updatedItems = [...currentItems];
        updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: newQuantity };
        this.cartItems$.next(updatedItems);
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
    const editedValue = this.editedQuantities.get(item.pizzaId); // Use pizzaId
    // Consider it edited if the value in the map exists and is different from the original quantity
    return editedValue !== undefined && editedValue !== item.cantidad;
  }

  /**
   * Saves the quantity edited for an item to the database.
   * @param item The cart item to save.
   */
  async saveQuantity(item: CartItem): Promise<void> {
    if (!this.userId || !item.pizzaId) { // Use pizzaId
      alert('Error: Could not identify user or pizza.');
      return;
    }

    const newQuantity = this.editedQuantities.get(item.pizzaId); // Use pizzaId

    // If the quantity is 0, ask the user if they want to remove the item.
    if (newQuantity === 0) {
      // Replace the alert/confirm with a custom modal if needed
      if (confirm(`Are you sure you want to remove "${item.nombre}" from the cart?`)) {
        await this.removeItem(item);
      } else {
        // If the user cancels the deletion, restore the quantity to 1 visually and in the map.
        this.editedQuantities.set(item.pizzaId, 1);
        const currentItems = this.cartItems$.getValue();
        const itemToUpdateIndex = currentItems.findIndex(i => i.pizzaId === item.pizzaId);
        if (itemToUpdateIndex > -1) {
          const updatedItems = [...currentItems];
          updatedItems[itemToUpdateIndex] = { ...updatedItems[itemToUpdateIndex], cantidad: 1 };
          this.cartItems$.next(updatedItems);
        }
      }
      // Remove the entry from the edited map as the quantity of 0 has been handled.
      this.editedQuantities.delete(item.pizzaId);
      return; // Exit after handling quantity 0
    }

    if (newQuantity === undefined || isNaN(newQuantity) || newQuantity < 0) {
      alert('Please enter a valid quantity (greater than zero).');
      // At this point, if the value is invalid, `onQuantityChange` would have already handled it visually.
      // We should remove the entry from `editedQuantities` to avoid an invalid "pending change."
      this.editedQuantities.delete(item.pizzaId);
      return;
    }

    try {
      await this.cartService.updateItemQuantity(this.userId, item.pizzaId, newQuantity); // Use pizzaId
      alert(`Quantity of "${item.nombre}" updated to ${newQuantity}.`);
      console.log(`ShoppingCartComponent: Quantity of "${item.nombre}" updated to ${newQuantity} in Firebase.`);
      this.editedQuantities.delete(item.pizzaId); // Remove the entry from the edited map
    } catch (error) {
      console.error('ShoppingCartComponent: Error updating quantity in Firebase:', error);
      alert('Error updating quantity. Please try again.');
    }
  }

  /**
   * Removes an item from the cart.
   * @param item The cart item to remove.
   */
  async removeItem(item: CartItem): Promise<void> {
    if (this.userId && item.pizzaId) { // Use pizzaId
        try {
          await this.cartService.removeItemFromCart(this.userId, item.pizzaId); // Use pizzaId
          alert(`"${item.nombre}" removed from cart.`);
          console.log(`ShoppingCartComponent: "${item.nombre}" removed from cart in Firebase.`);
        } catch (error) {
          console.error('ShoppingCartComponent: Error removing item from Firebase:', error);
          alert('Error removing item from cart. Please try again.');
        }
    }
  }

  /**
   * Proceeds to the checkout process.
   */
  async checkout(): Promise<void> {
    if (!this.userId) {
      alert('You must be logged in to complete the purchase.');
      return;
    }

    // REMOVED: The pending quantities check, as they are saved on blur.
    // if (this.editedQuantities.size > 0) {
    //   alert('Please save or discard quantity changes before proceeding with the purchase.');
    //   return;
    // }

    const currentCartItems = this.cartItems$.getValue();
    const currentTotal = this.calculateTotal(currentCartItems);

    if (currentCartItems.length === 0) {
      alert('Your cart is empty. Add products before purchasing.');
      return;
    }

      try {
        // Record the purchase in the database
        await this.cartService.recordPurchase(this.userId, currentCartItems, currentTotal);
        console.log('ShoppingCartComponent: Purchase recorded successfully.');

        // Clear the cart after a successful purchase
        await this.cartService.clearCart(this.userId);
        alert('Purchase successful! Your cart has been emptied.');
        this.showPurchaseHistoryButton = true; // Ensure the button is shown after the first purchase
        console.log('ShoppingCartComponent: Cart emptied after purchase.');

      } catch (error) {
        console.error('ShoppingCartComponent: Error processing purchase:', error);
        alert('An error occurred while processing your purchase. Please try again.');
      }
  }

  /**
   * Navigates to the purchase history page.
   */
  viewPurchaseHistory(): void {
    this.router.navigate(['/purchase-history']); // Make sure the '/purchase-history' route is configured
  }
}
