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
          const itemData = childSnapshot.val();
          items.push({
            id: childSnapshot.key || '',
            ...itemData
          } as CartItem);
        });
        observer.next(items);
      }, (error) => {
        observer.error(error);
      });
    });
  }

  /**
   * Agrega o actualiza un ítem (producto) en el carrito del usuario.
   * El parámetro 'product' ahora es de tipo Product, no Pizza.
   * @param userId El UID del usuario.
   * @param product El producto (pizza o bebida) a agregar.
   * @param quantity La cantidad a agregar.
   * @returns Una Promesa que se resuelve con la cantidad total del ítem en el carrito después de la operación.
   */
  async addItemToCart(userId: string, product: Product, quantity: number): Promise<number> {
    if (!userId) {
      throw new Error('No hay usuario logueado para agregar al carrito.');
    }

    const itemRef = ref(this.db, `carts/${userId}/items/${product.id}`);
    const snapshot = await get(itemRef); // Usamos 'get' para una lectura única

    let finalQuantity: number;
    let itemToSave: CartItem;

    if (snapshot.exists()) {
      const currentItem = snapshot.val();
      finalQuantity = currentItem!.cantidad + quantity;
      // Actualiza solo la cantidad; las otras propiedades ya están en el carrito
      itemToSave = { ...currentItem!, cantidad: finalQuantity } as CartItem;
    } else {
      finalQuantity = quantity;
      itemToSave = {
        id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad: finalQuantity,
        imagenUrl: product.imagenUrl,
        descripcion: product.descripcion,
        tipo: product.tipo
      } as CartItem;
    }
    await set(itemRef, itemToSave); // Usamos 'set' para establecer o sobrescribir el ítem
    return finalQuantity;
  }

  /**
   * Actualiza la cantidad de un ítem específico en el carrito.
   * @param userId El UID del usuario.
   * @param itemId El ID del ítem en el carrito (que es el ID del producto).
   * @param newQuantity La nueva cantidad.
   * @returns Una Promesa que se resuelve cuando la operación se completa.
   */
  async updateItemQuantity(userId: string, itemId: string, newQuantity: number): Promise<void> {
    if (!userId) {
      throw new Error('No hay usuario logueado para actualizar el carrito.');
    }
    if (newQuantity <= 0) {
      await this.removeItemFromCart(userId, itemId); // Si la cantidad es 0 o menos, elimina el ítem
      return;
    }

    const itemRef = ref(this.db, `carts/${userId}/items/${itemId}`);
    await update(itemRef, { cantidad: newQuantity }); // Usamos 'update'
  }

  /**
   * Elimina un ítem del carrito del usuario.
   * @param userId El UID del usuario.
   * @param itemId El ID del ítem a eliminar del carrito.
   * @returns Una Promesa que se resuelve cuando la operación se completa.
   */
  async removeItemFromCart(userId: string, itemId: string): Promise<void> {
    if (!userId) {
      throw new Error('No hay usuario logueado para modificar el carrito.');
    }
    const itemRef = ref(this.db, `carts/${userId}/items/${itemId}`);
    await remove(itemRef); // Usamos 'remove'
  }

  /**
   * Vacía el carrito del usuario.
   * @param userId El UID del usuario.
   * @returns Una Promesa que se resuelve cuando la operación se completa.
   */
  async clearCart(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('No hay usuario logueado para vaciar el carrito.');
    }
    const cartRef = ref(this.db, `carts/${userId}/items`);
    await remove(cartRef); // Usamos 'remove'
  }

  /**
   * Registra una compra en la base de datos.
   * @param userId El UID del usuario que realiza la compra.
   * @param cartItems Los ítems del carrito en el momento de la compra.
   * @param total El total de la compra.
   * @returns Una Promesa que se resuelve al registrar la compra.
   */
  async recordPurchase(userId: string, cartItems: CartItem[], total: number): Promise<any> {
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

    await set(newPurchaseRef, purchaseData); // Usamos 'set'
    return purchaseData;
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
      onValue(purchasesRef, (snapshot) => {
        const purchases: Purchase[] = [];
        snapshot.forEach(childSnapshot => {
          const purchaseData = childSnapshot.val();
          purchases.push({
            purchaseId: childSnapshot.key || '',
            ...purchaseData
          } as Purchase);
        });
        observer.next(purchases);
      }, (error) => {
        observer.error(error);
      });
    });
  }
}
