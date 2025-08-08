// src/app/models/pizza.model.ts
export interface Pizza {
  id: string; // ¡CORRECCIÓN AQUÍ! Cambiado de 'number' a 'string'
  nombre: string;
  descripcion: string;
  precio: number;
  sabores: string[];
  imagenUrl: string;
  selectedQuantity?: number; // ¡NUEVA PROPIEDAD AÑADIDA! Es opcional (?), ya que no viene de Firebase directamente.
}

