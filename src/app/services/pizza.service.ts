import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
// Importamos las funciones modulares de Firebase Realtime Database
import { getDatabase, ref, onValue, push, get, child, Database } from 'firebase/database'; // Importamos Database para el tipo
import { FirebaseApp } from '@angular/fire/app'; // Importamos FirebaseApp
import { Pizza } from '../models/pizza.model';
import { Reserva } from '../models/reserva.model';

@Injectable({
  providedIn: 'root'
})
export class PizzaService {
  private db: Database; // Declaramos la propiedad db con el tipo correcto 'Database'

  // Inyectamos FirebaseApp en el constructor
  constructor(private app: FirebaseApp) {
    this.db = getDatabase(this.app); // Obtenemos la instancia de la base de datos modular dentro del constructor
  }

  /**
   * Obtiene una lista de todas las pizzas desde la colección 'pizzas' de Realtime Database.
   * Retorna un Observable para que el componente pueda reaccionar a los cambios en tiempo real.
   * @returns Un Observable que emite un array de objetos Pizza.
   */
  getPizzas(): Observable<Pizza[]> {
    const pizzasRef = ref(this.db, 'pizzas'); // Obtenemos una referencia al nodo 'pizzas'

    // Usamos onValue para escuchar cambios en tiempo real
    return new Observable<Pizza[]>(observer => {
      onValue(pizzasRef, (snapshot) => {
        const pizzas: Pizza[] = [];
        snapshot.forEach(childSnapshot => {
          // Obtenemos los datos y los casteamos a Omit<Pizza, 'id'>
          const pizzaData = childSnapshot.val() as Omit<Pizza, 'id'>;
          pizzas.push({
            // Convertimos childSnapshot.key (string) a number para que coincida con la interfaz Pizza.
            // Asumimos que los IDs en la base de datos son strings convertibles a números.
            id: childSnapshot.key || '', // Aseguramos que el ID sea string, como en CartItem
            ...pizzaData
          });
        });
        observer.next(pizzas);
      }, (error) => {
        observer.error(error);
      });
    });
  }

  /**
   * Obtiene los datos de una pizza específica por su ID.
   * @param id El ID de la pizza a buscar.
   * @returns Un Observable que emite los datos de la pizza o undefined si no se encuentra.
   */
  getPizzaById(id: string): Observable<Pizza | undefined> {
    const pizzaRef = ref(this.db, `pizzas/${id}`);

    return new Observable<Pizza | undefined>(observer => {
      onValue(pizzaRef, (snapshot) => {
        const pizzaData = snapshot.val();
        if (pizzaData) {
          // Casteamos los datos y añadimos el ID
          observer.next({ id: snapshot.key || '', ...pizzaData } as Pizza); // Aseguramos que el ID sea string
        } else {
          observer.next(undefined); // Si no se encuentra, emitimos undefined
        }
      }, (error) => {
        observer.error(error);
      });
    });
  }

  /**
   * Agrega una nueva reserva a la colección 'reservas' de Realtime Database.
   * @param reserva El objeto Reserva a guardar.
   * @returns Una promesa que se resuelve cuando la reserva ha sido agregada.
   */
  addReserva(reserva: Reserva): Promise<any> {
    const reservasRef = ref(this.db, 'reservas');
    // Envolvemos el resultado de 'push' en Promise.resolve() para asegurar el tipo Promise<any>
    return Promise.resolve(push(reservasRef, reserva));
  }
}
