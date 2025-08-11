// src/app/models/product.model.ts
export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  // Propiedad para la cantidad seleccionada localmente en el componente de lista.
  // Es opcional porque no viene de la base de datos directamente, se añade en el frontend.
  selectedQuantity?: number;
  // Puede ser 'pizza', 'Refresco Pequeño', 'Cerveza', 'Refresco Grande', etc.
  // Ahora es opcional ya que no todos los productos tienen un tipo estricto en el modelo base.
  tipo?: string;
  // Propiedad opcional para los sabores de las pizzas. No todos los productos la tendrán.
  sabores?: string[];
}
