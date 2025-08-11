// src/app/models/cart-item.model.ts
import { Product } from './product.model'; // Importamos el modelo Product genérico

// CartItem ahora es esencialmente un Product con una cantidad seleccionada.
// Esto significa que hereda 'id', 'nombre', 'precio', 'imagenUrl', 'tipo' de Product.
export interface CartItem extends Product {
  cantidad: number;
  // 'productId' y 'productType' no son necesarios aquí ya que 'id' y 'tipo' de Product son suficientes.
}
