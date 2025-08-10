// src/app/models/product.model.ts
// Define una interfaz genérica para cualquier producto que pueda ser añadido al menú.
export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  tipo?: string; // Opcional: Para categorizar el tipo de producto (ej. 'pizza', 'Refresco Pequeño')
}
