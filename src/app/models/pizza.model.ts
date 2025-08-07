// src/app/models/pizza.model.ts
export interface Pizza {
  id: string; // ¡CORRECCIÓN AQUÍ! Cambiado de 'number' a 'string'
  nombre: string;
  descripcion: string;
  precio: number;
  sabores: string[];
  imagenUrl: string;
}
