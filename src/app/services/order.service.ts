// src/app/services/order.service.ts

import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore'; // Correct Firebase import path
import { initializeApp } from 'firebase/app'; // Correct Firebase import path
import { getAuth } from 'firebase/auth'; // Correct Firebase import path

import { Order } from '../models/order.model';
import { CartItem } from '../models/cart-item.model';

// Declare global variables provided by the Canvas environment
declare const __app_id: string;
declare const __firebase_config: string;

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private db: any;
  private auth: any;

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Initializes Firebase app, authentication, and Firestore.
   */
  private initializeFirebase(): void {
    try {
      const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
      const app = initializeApp(firebaseConfig); // Corrected to use initializeApp directly
      this.db = getFirestore(app);
      this.auth = getAuth(app);
      console.log('OrderService: Firebase initialized.');
    } catch (error) {
      console.error('OrderService: Failed to initialize Firebase:', error);
    }
  }

  /**
   * Places a new order with the given cart items and total.
   * @param userId The ID of the user placing the order.
   * @param cartItems The items in the cart.
   * @param total The total amount of the order.
   * @returns An Observable that completes upon order placement or emits an error.
   */
  placeOrder(userId: string, cartItems: CartItem[], total: number): Observable<void> {
    if (!this.db) {
      return of(undefined).pipe(tap(() => console.error('Firestore not initialized.')), map(() => { throw new Error('Firestore not initialized'); }));
    }
    if (!userId) {
      return of(undefined).pipe(tap(() => console.error('User not authenticated.')), map(() => { throw new Error('User not authenticated'); }));
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const ordersCollectionRef = collection(this.db, `artifacts/${appId}/users/${userId}/orders`);

    const orderData = {
      userId: userId,
      items: cartItems.map(item => ({
        productId: item.productId,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        imageUrl: item.imageUrl
      })),
      total: total,
      date: Timestamp.now(),
      status: 'completed'
    };

    return from(addDoc(ordersCollectionRef, orderData)).pipe(
      map(() => console.log('Order placed successfully.')),
      catchError((error: any) => { // Explicitly type error
        console.error('Error placing order:', error);
        throw error;
      })
    );
  }

  /**
   * Retrieves the purchase history for a given user.
   * @param userId The ID of the user whose purchase history to retrieve.
   * @returns An Observable of an array of Order objects.
   */
  getPurchaseHistory(userId: string): Observable<Order[]> {
    if (!this.db) {
      return of([]);
    }
    if (!userId) {
      return of([]);
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const ordersCollectionRef = collection(this.db, `artifacts/${appId}/users/${userId}/orders`);
    const q = query(ordersCollectionRef);

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        const history: Order[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          history.push({
            id: doc.id,
            userId: data['userId'],
            items: data['items'],
            total: data['total'],
            date: data['date'] instanceof Timestamp ? data['date'] : Timestamp.now(), // Ensure it's a Timestamp
            status: data['status']
          });
        });
        history.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        return history;
      }),
      catchError((error: any) => {
        console.error('Error fetching purchase history:', error);
        return of([]);
      })
    );
  }

  /**
   * Checks if a user has any purchase history.
   * @param userId The ID of the user to check.
   * @returns An Observable that emits true if the user has a history, false otherwise.
   */
  checkPurchaseHistory(userId: string): Observable<boolean> {
    if (!this.db) {
      return of(false);
    }
    if (!userId) {
      return of(false);
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const ordersCollectionRef = collection(this.db, `artifacts/${appId}/users/${userId}/orders`);
    const q = query(ordersCollectionRef);

    return from(getDocs(q)).pipe(
      map(snapshot => {
        const hasHistory = !snapshot.empty;
        console.log(`User ${userId} has purchase history: ${hasHistory}`);
        return hasHistory;
      }),
      catchError((error: any) => {
        console.error('Error checking purchase history:', error);
        return of(false);
      })
    );
  }
}
