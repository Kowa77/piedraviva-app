import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
// Importamos las funciones modulares de Firebase Realtime Database
import { getDatabase, ref, onValue, push, get, child, Database } from 'firebase/database';
import { FirebaseApp } from '@angular/fire/app'; // Importamos FirebaseApp
import { Product } from '../models/product.model'; // Importa el modelo Product genérico
import { Reserva } from '../models/reserva.model'; // Mantén si sigue siendo relevante para las reservas

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private db: Database; // Declaramos la propiedad db con el tipo correcto 'Database'

  // Inyectamos FirebaseApp en el constructor
  constructor(private app: FirebaseApp) {
    this.db = getDatabase(this.app); // Obtenemos la instancia de la base de datos modular dentro del constructor
  }

  /**
   * Obtiene una lista de pizzas desde el nodo 'pizzas' de Realtime Database.
   * Retorna un Observable que emite un array de objetos Product (pero que son pizzas).
   * @returns Un Observable que emite un array de objetos Product.
   */
  getPizzasFromDb(): Observable<Product[]> {
    const pizzasRef = ref(this.db, 'pizzas'); // Obtenemos una referencia al nodo 'pizzas'

    // Usamos onValue para escuchar cambios en tiempo real
    return new Observable<Product[]>(observer => {
      const unsubscribe = onValue(pizzasRef, (snapshot) => {
        const pizzas: Product[] = [];
        snapshot.forEach(childSnapshot => {
          const pizzaData = childSnapshot.val();
          pizzas.push({
            id: childSnapshot.key || '',
            ...pizzaData,
            tipo: 'pizza' // Aseguramos el tipo 'pizza' para las pizzas
          } as Product); // Casteamos a Product
        });
        observer.next(pizzas);
      }, (error) => {
        observer.error(error);
      });
      // Devolvemos una función de limpieza para desuscribirse cuando el Observable se desuscriba
      return () => unsubscribe();
    });
  }

  /**
   * Obtiene una lista de bebidas desde el nodo 'bebidas' de Realtime Database.
   * Retorna un Observable que emite un array de objetos Product (pero que son bebidas).
   * @returns Un Observable que emite un array de objetos Product.
   */
  getBebidasFromDb(): Observable<Product[]> {
    const bebidasRef = ref(this.db, 'bebidas'); // Obtenemos una referencia al nodo 'bebidas'

    // Usamos onValue para escuchar cambios en tiempo real
    return new Observable<Product[]>(observer => {
      const unsubscribe = onValue(bebidasRef, (snapshot) => {
        const bebidas: Product[] = [];
        snapshot.forEach(childSnapshot => {
          const bebidaData = childSnapshot.val();
          bebidas.push({
            id: childSnapshot.key || '',
            ...bebidaData
          } as Product); // Casteamos a Product
        });
        observer.next(bebidas);
      }, (error) => {
        observer.error(error);
      });
      // Devolvemos una función de limpieza para desuscribirse cuando el Observable se desuscriba
      return () => unsubscribe();
    });
  }

  /**
   * Obtiene una lista combinada de todos los productos (pizzas y bebidas).
   * @returns Un Observable que emite un array de objetos Product.
   */
  getProducts(): Observable<Product[]> {
    return combineLatest([
      this.getPizzasFromDb(), // Obtiene pizzas mapeadas como Product
      this.getBebidasFromDb() // Obtiene bebidas mapeadas como Product
    ]).pipe(
      map(([pizzas, bebidas]) => {
        return [...pizzas, ...bebidas]; // Combina todos los productos en un solo array
      })
    );
  }

  /**
   * Obtiene los datos de un producto específico por su ID.
   * Intenta buscar primero en pizzas, luego en bebidas.
   * Usa onValue para escuchar cambios en tiempo real y emitir undefined si no se encuentra.
   * @param id El ID del producto a buscar.
   * @returns Un Observable que emite los datos del producto o undefined si no se encuentra.
   */
  getProductById(id: string): Observable<Product | undefined> {
    const pizzaRef = ref(this.db, `pizzas/${id}`);
    const bebidaRef = ref(this.db, `bebidas/${id}`);

    const pizza$ = new Observable<Product | undefined>(observer => {
      const unsubscribe = onValue(pizzaRef, (snapshot) => {
        const pizzaData = snapshot.val();
        if (pizzaData) {
          observer.next({ ...pizzaData, id: snapshot.key || '', tipo: 'pizza' } as Product);
        } else {
          observer.next(undefined); // Emite undefined si no se encuentra la pizza
        }
      }, (error) => {
        observer.error(error);
      });
      return () => unsubscribe();
    });

    const bebida$ = new Observable<Product | undefined>(observer => {
      const unsubscribe = onValue(bebidaRef, (snapshot) => {
        const bebidaData = snapshot.val();
        if (bebidaData) {
          observer.next({ ...bebidaData, id: snapshot.key || '' } as Product);
        } else {
          observer.next(undefined); // Emite undefined si no se encuentra la bebida
        }
      }, (error) => {
        observer.error(error);
      });
      return () => unsubscribe();
    });

    // Combina los resultados de ambos observables y retorna el primero que exista y no sea undefined
    return combineLatest([pizza$, bebida$]).pipe(
      map(([pizza, bebida]) => pizza || bebida), // Retorna pizza si existe, de lo contrario bebida
      map(product => {
        // Si ambos observables emitieron undefined, el resultado combinado también será undefined
        if (product === undefined) {
          console.log(`Producto con ID ${id} no encontrado en pizzas ni bebidas.`);
        } else {
          console.log(`Producto con ID ${id} encontrado:`, product);
        }
        return product;
      })
    );
  }

  /**
   * Agrega una nueva reserva a la colección 'reservas' de Realtime Database.
   * @param reserva El objeto Reserva a guardar.
   * @returns Una promesa que se resuelve cuando la reserva ha sido agregada.
   */
  addReserva(reserva: Reserva): Promise<any> {
    const reservasRef = ref(this.db, 'reservas');
    return Promise.resolve(push(reservasRef, reserva));
  }
}
