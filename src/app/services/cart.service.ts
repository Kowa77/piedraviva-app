import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, first } from 'rxjs/operators';
// Importamos las funciones modulares de Firebase Realtime Database
import { getDatabase, ref, onValue, push, get, child, Database, set, update, remove } from 'firebase/database';
import { FirebaseApp } from '@angular/fire/app'; // Importamos FirebaseApp
import { CartItem } from '../models/cart-item.model';
import { Purchase } from '../models/purchase.model';
import { Product } from '../models/product.model'; // Importa el modelo Product

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private db: Database; // Cambiado de dbRef a db y de tipo AngularFireDatabase a Database
  userId: string | null = null;

  constructor(private app: FirebaseApp) { // Inyectamos FirebaseApp
    this.db = getDatabase(this.app); // Obtenemos la instancia de la base de datos modular
  }

  /**
   * Obtiene el carrito de un usuario específico en tiempo real.
   * @param userId El UID del usuario.
   * @returns Un Observable que emite un array de CartItem.
   */
  getCart(userId: string): Observable<CartItem[]> {
    if (!userId) {
      return of([]);
    }
    const cartItemsRef = ref(this.db, `carts/${userId}/items`);

    return new Observable<CartItem[]>(observer => {
      onValue(cartItemsRef, (snapshot) => {
        const items: CartItem[] = [];
        snapshot.forEach(childSnapshot => {
          items.push({ ...childSnapshot.val(), id: childSnapshot.key || '' } as CartItem);
        });
        observer.next(items);
      }, (error) => {
        observer.error(error);
      });
    });
  }

  // Corregimos los nombres de los métodos para que coincidan con el componente.
  // También usamos las funciones modulares de Realtime Database.

  /**
   * Agrega un item al carrito o incrementa su cantidad.
   * @param userId El UID del usuario.
   * @param item El item del carrito a agregar o modificar.
   */
  addItem(userId: string, item: CartItem): void {
    if (!userId) { return; }
    const itemRef = ref(this.db, `carts/${userId}/items/${item.id}`);
    onValue(itemRef, (snapshot) => {
      const currentItem = snapshot.val() as CartItem;
      const newQuantity = currentItem ? currentItem.cantidad + item.cantidad : item.cantidad;
      set(itemRef, { ...item, cantidad: newQuantity });
    }, { onlyOnce: true });
  }

  /**
   * Incrementa la cantidad de un item en el carrito.
   * @param userId El UID del usuario.
   * @param item El item del carrito a incrementar.
   */
  incrementQuantity(userId: string, item: CartItem): void {
    if (!userId) { return; }
    const itemRef = ref(this.db, `carts/${userId}/items/${item.id}`);
    onValue(itemRef, (snapshot) => {
      const currentItem = snapshot.val() as CartItem;
      if (currentItem) {
        update(itemRef, { cantidad: currentItem.cantidad + 1 });
      }
    }, { onlyOnce: true });
  }

  /**
   * Decrementa la cantidad de un item en el carrito.
   * @param userId El UID del usuario.
   * @param item El item del carrito a decrementar.
   */
  decrementQuantity(userId: string, item: CartItem): void {
    if (!userId) { return; }
    const itemRef = ref(this.db, `carts/${userId}/items/${item.id}`);
    onValue(itemRef, (snapshot) => {
      const currentItem = snapshot.val() as CartItem;
      if (currentItem && currentItem.cantidad > 1) {
        update(itemRef, { cantidad: currentItem.cantidad - 1 });
      } else if (currentItem && currentItem.cantidad === 1) {
        remove(itemRef);
      }
    }, { onlyOnce: true });
  }

  /**
   * Elimina un item del carrito.
   * @param userId El UID del usuario.
   * @param item El item del carrito a eliminar.
   */
  removeItem(userId: string, item: CartItem): void {
    if (!userId) { return; }
    const itemRef = ref(this.db, `carts/${userId}/items/${item.id}`);
    remove(itemRef);
  }

  /**
   * Vacía el carrito del usuario.
   * @param userId El UID del usuario.
   */
  clearCart(userId: string): void {
    if (!userId) { return; }
    const cartRef = ref(this.db, `carts/${userId}/items`);
    remove(cartRef);
  }

  /**
   * Agrega una nueva compra a la colección 'purchases' de Firestore.
   * @param userId El UID del usuario.
   * @param cartItems Los items del carrito en el momento de la compra.
   * @param total El monto total de la compra.
   * @returns Una promesa que se resuelve al guardar la compra.
   */
  recordPurchase(userId: string, cartItems: CartItem[], total: number): Promise<any> {
    // Este método ya no es necesario aquí porque el backend lo maneja.
    // Lo mantengo solo si decides usarlo para otra cosa en el frontend.
    if (!userId) {
      throw new Error('No hay usuario logueado para registrar la compra.');
    }
    const purchasesListRef = ref(this.db, `purchases/${userId}`);
    const newPurchaseRef = push(purchasesListRef);

    const purchaseData: Purchase = {
      purchaseId: newPurchaseRef.key || '',
      userId: userId,
      items: cartItems,
      total: total,
      timestamp: new Date().toISOString()
    };

    return set(newPurchaseRef, purchaseData);
  }
}
