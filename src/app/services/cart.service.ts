import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { getDatabase, ref, onValue, set, push, remove, DataSnapshot, get, update } from 'firebase/database';
import { FirebaseApp } from '@angular/fire/app';
import { CartItem } from '../models/cart-item.model';
import { Pizza } from '../models/pizza.model';
import { Purchase } from '../models/purchase.model'; // Asegúrate de tener este modelo

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private db;

  constructor(private app: FirebaseApp) {
    this.db = getDatabase(this.app);
  }

  /**
   * Obtiene el carrito de un usuario específico en tiempo real.
   * @param userId El UID del usuario.
   * @returns Un Observable que emite un array de CartItem.
   */
  getCart(userId: string): Observable<CartItem[]> {
    if (!userId) {
      return of([]); // Si no hay userId, el carrito está vacío
    }
    const cartRef = ref(this.db, `carts/${userId}/items`);

    return new Observable<CartItem[]>(observer => {
      onValue(cartRef, (snapshot: DataSnapshot) => {
        const items: CartItem[] = [];
        snapshot.forEach(childSnapshot => {
          const itemData = childSnapshot.val();
          // Asegurarse de que todos los campos necesarios (nombre, precio, imagenUrl) estén presentes
          // y que el pizzaId sea la clave del childSnapshot.
          if (itemData && childSnapshot.key) {
            items.push({
              pizzaId: childSnapshot.key,
              nombre: itemData.nombre || 'Nombre Desconocido', // Fallback
              precio: itemData.precio || 0, // Fallback
              cantidad: itemData.cantidad || 0, // Fallback
              imagenUrl: itemData.imagenUrl || '' // Fallback
            } as CartItem);
          }
        });
        observer.next(items);
      }, (error) => {
        console.error('Error al obtener el carrito:', error);
        observer.error(error);
      });
    });
  }

  /**
   * Agrega o actualiza un ítem en el carrito del usuario.
   * @param userId El UID del usuario.
   * @param pizza La pizza a agregar.
   * @param quantity La cantidad a agregar.
   * @returns Una Promesa que se resuelve con la cantidad total del ítem en el carrito después de la operación.
   */
  async addItemToCart(userId: string, pizza: Pizza, quantity: number): Promise<number> {
    if (!userId) {
      throw new Error('No hay usuario logueado para agregar al carrito.');
    }

    const cartItemRef = ref(this.db, `carts/${userId}/items/${pizza.id}`);
    const snapshot = await get(cartItemRef);

    let finalQuantity: number;
    let itemToSave: CartItem;

    if (snapshot.exists()) {
      const currentItem = snapshot.val() as CartItem;
      finalQuantity = currentItem.cantidad + quantity;
      // Solo actualizamos la cantidad si el ítem ya existe
      itemToSave = { ...currentItem, cantidad: finalQuantity };
    } else {
      finalQuantity = quantity;
      itemToSave = {
        pizzaId: pizza.id,
        nombre: pizza.nombre,
        precio: pizza.precio,
        cantidad: finalQuantity,
        imagenUrl: pizza.imagenUrl
      };
    }
    await set(cartItemRef, itemToSave); // Usamos set para sobrescribir o crear el ítem completo
    return finalQuantity;
  }

  /**
   * Actualiza la cantidad de un ítem específico en el carrito.
   * @param userId El UID del usuario.
   * @param pizzaId El ID de la pizza en el carrito.
   * @param newQuantity La nueva cantidad.
   * @returns Una Promesa que se resuelve cuando la operación se completa.
   */
  async updateItemQuantity(userId: string, pizzaId: string, newQuantity: number): Promise<void> {
    if (!userId) {
      throw new Error('No hay usuario logueado para actualizar el carrito.');
    }
    if (newQuantity <= 0) {
      await this.removeItemFromCart(userId, pizzaId);
      return;
    }

    const cartItemRef = ref(this.db, `carts/${userId}/items/${pizzaId}`);
    const snapshot = await get(cartItemRef); // Obtenemos los datos actuales del ítem

    if (snapshot.exists()) {
      const currentItem = snapshot.val() as CartItem;
      // Creamos un nuevo objeto con la cantidad actualizada y todos los demás campos originales
      const updatedItem: CartItem = { ...currentItem, cantidad: newQuantity };
      await set(cartItemRef, updatedItem); // Usamos 'set' para escribir el ítem completo de vuelta
    } else {
      throw new Error(`El ítem con ID ${pizzaId} no se encontró en el carrito para actualizar.`);
    }
  }

  /**
   * Elimina un ítem del carrito del usuario.
   * @param userId El UID del usuario.
   * @param pizzaId El ID de la pizza a eliminar del carrito.
   * @returns Una Promesa que se resuelve cuando la operación se completa.
   */
  async removeItemFromCart(userId: string, pizzaId: string): Promise<void> {
    if (!userId) {
      throw new Error('No hay usuario logueado para modificar el carrito.');
    }
    const cartItemRef = ref(this.db, `carts/${userId}/items/${pizzaId}`);
    await remove(cartItemRef);
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
    await remove(cartRef);
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
    const purchasesRef = ref(this.db, `purchases/${userId}`);
    const purchaseId = push(purchasesRef).key;

    const purchaseData = {
      purchaseId: purchaseId,
      userId: userId,
      items: cartItems,
      total: total,
      timestamp: new Date().toISOString()
    };

    await set(ref(this.db, `purchases/${userId}/${purchaseId}`), purchaseData);
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
      onValue(purchasesRef, (snapshot: DataSnapshot) => {
        console.log('Snapshot de historial de compras (raw):', snapshot.val()); // LOG ADICIONAL
        const purchases: Purchase[] = [];
        snapshot.forEach(childSnapshot => {
          const purchaseData = childSnapshot.val();
          if (purchaseData) {
            purchases.push(purchaseData as Purchase);
          }
        });
        console.log('Historial de compras (parseado):', purchases); // LOG ADICIONAL
        observer.next(purchases);
      }, (error) => {
        console.error('Error al obtener el historial de compras:', error);
        observer.error(error);
      });
    });
  }
}
