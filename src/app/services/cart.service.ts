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
      const unsubscribe = onValue(cartItemsRef, (snapshot) => {
        const items: CartItem[] = [];
        snapshot.forEach(childSnapshot => {
          items.push(childSnapshot.val() as CartItem);
        });
        observer.next(items);
      }, (error) => {
        observer.error(error);
      });
      // Devolvemos la función de limpieza para la desuscripción
      return { unsubscribe: unsubscribe };
    });
  }

  /**
   * Agrega un ítem al carrito o actualiza su cantidad si ya existe.
   * @param userId El UID del usuario.
   * @param product El producto a añadir.
   * @param quantity La cantidad a añadir.
   */
  addItemToCart(userId: string, product: Product, quantity: number): Promise<void> {
    const itemRef = ref(this.db, `carts/${userId}/items/${product.id}`);

    // Usamos 'get' para una lectura única del ítem actual
    return get(itemRef).then(snapshot => {
      const currentItem = snapshot.val();
      const newQuantity = currentItem ? currentItem.cantidad + quantity : quantity;
      const cartItem: CartItem = {
        ...product,
        cantidad: newQuantity
      };
      // Usamos 'set' para guardar el objeto completo con la nueva cantidad
      return set(itemRef, cartItem);
    });
  }

  /**
   * Actualiza la cantidad de un ítem específico en el carrito.
   * @param userId El UID del usuario.
   * @param itemId El ID del ítem.
   * @param newQuantity La nueva cantidad.
   */
  updateItemQuantity(userId: string, itemId: string, newQuantity: number): Promise<void> {
    const itemRef = ref(this.db, `carts/${userId}/items/${itemId}`);
    // Usamos 'update' para actualizar solo la propiedad 'cantidad'
    return update(itemRef, { cantidad: newQuantity });
  }

  /**
   * Elimina un ítem específico del carrito.
   * @param userId El UID del usuario.
   * @param itemId El ID del ítem.
   */
  removeItemFromCart(userId: string, itemId: string): Promise<void> {
    const itemRef = ref(this.db, `carts/${userId}/items/${itemId}`);
    // Usamos 'remove' para eliminar el nodo completo del ítem
    return remove(itemRef);
  }

  /**
   * Registra una compra en la base de datos de compras.
   * @param userId El UID del usuario.
   * @param cartItems Los ítems del carrito en el momento de la compra.
   * @param total El monto total de la compra.
   * @returns Una promesa que se resuelve con los datos de la compra registrada.
   * @deprecated Esta función es una alternativa a Firestore y se mantendrá solo por referencia.
   */
  registerPurchase(userId: string, cartItems: CartItem[], total: number): Promise<any> {
    if (!userId) {
      throw new Error('No hay usuario logueado para registrar la compra.');
    }
    const purchasesListRef = ref(this.db, `purchases/${userId}`);
    const newPurchaseRef = push(purchasesListRef); // Usamos 'push' para obtener una nueva clave

    const purchaseData: Purchase = {
      purchaseId: newPurchaseRef.key || '',
      userId: userId,
      items: cartItems,
      total: total,
      timestamp: new Date().toISOString()
    };

    return set(newPurchaseRef, purchaseData); // Usamos 'set'
  }

  /**
   * Obtiene el historial de compras de un usuario específico.
   * @param userId El UID del usuario.
   * @returns Un Observable que emite un array de objetos Purchase.
   */
  getPurchaseHistory(userId: string): Observable<Purchase[]> {
    if (!userId) {
      return of([]);
    }
    const purchasesRef = ref(this.db, `purchases/${userId}`);

    return new Observable<Purchase[]>(observer => {
      const unsubscribe = onValue(purchasesRef, (snapshot) => {
        const purchases: Purchase[] = [];
        snapshot.forEach(childSnapshot => {
          const purchaseData = childSnapshot.val();
          purchases.push({
            purchaseId: childSnapshot.key || '',
            ...purchaseData
          });
        });
        observer.next(purchases);
      }, (error) => {
        observer.error(error);
      });
      return { unsubscribe: unsubscribe };
    });
  }
}
