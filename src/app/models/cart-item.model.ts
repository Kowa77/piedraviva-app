// src/app/models/cart-item.model.ts
export interface CartItem {
  pizzaId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagenUrl: string;
  // Puedes añadir más detalles de la pizza si los necesitas en el carrito
}
