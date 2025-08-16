// src/app/models/order.model.ts

import { Timestamp } from 'firebase/firestore'; // Import Timestamp for date

/**
 * Interface for an Order.
 * Represents a completed purchase, including details about the items, total, and date.
 */
export interface Order {
  id: string;             // Unique ID of the order document in Firestore
  userId: string;         // ID of the user who placed the order
  items: {                // Array of items included in this order
    productId: string;    // ID of the product
    nombre: string;       // Name of the product
    precio: number;       // Price of the product at the time of purchase
    cantidad: number;     // Quantity purchased
    imageUrl: string;     // Image URL of the product
  }[];
  total: number;          // Total price of the order
  date: Timestamp;        // Date and time the order was placed (using Firebase Timestamp)
  status: string;         // Current status of the order (e.g., 'completed', 'pending', 'shipped')
}
