import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { PizzaService } from '../../services/pizza.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { Pizza } from '../../models/pizza.model'; // Asegúrate de que Pizza tenga selectedQuantity?

@Component({
  selector: 'app-pizza-list',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  templateUrl: './pizza-list.component.html',
  styleUrl: './pizza-list.component.css'
})
export class PizzaListComponent implements OnInit, OnDestroy {
  pizzas$: Observable<Pizza[]>;
  private pizzasSubscription: Subscription | undefined; // Aunque no se usa directamente para suscribirse a pizzas$, se mantiene por si se añade lógica futura.
  private userSubscription: Subscription | undefined;
  userId: string | null = null;

  constructor(
    private pizzaService: PizzaService,
    private authService: AuthService,
    private cartService: CartService
  ) {
    this.pizzas$ = of([]); // Inicializa el observable a un array vacío
  }

  ngOnInit(): void {
    // Se suscribe al estado del usuario para obtener el userId,
    // y luego cambia a la obtención de pizzas.
    this.userSubscription = this.authService.user$.pipe(
      switchMap(user => {
        this.userId = user ? user.uid : null;
        console.log('User ID en PizzaList:', this.userId);
        // Una vez que tenemos el userId (o null), obtenemos las pizzas
        return this.pizzaService.getPizzas();
      }),
      map(pizzas => {
        console.log('Datos de pizzas recibidos:', pizzas);
        // Inicializa 'selectedQuantity' para cada pizza a 0.
        // Esto asegura que el input numérico comience en 0 y no en undefined.
        return pizzas.map(pizza => ({ ...pizza, selectedQuantity: 0 }));
      })
    ).subscribe(
      (pizzas) => {
        // Asigna el array de pizzas modificado (con selectedQuantity) a pizzas$.
        // El 'async' pipe en la plantilla se encargará de suscribirse a este Observable.
        this.pizzas$ = of(pizzas);
        if (pizzas.length > 0) {
          console.log('Primera pizza:', pizzas[0]);
          console.log('URL de imagen de la primera pizza:', pizzas[0].imagenUrl);
        }
      },
      (error) => {
        console.error('Error al cargar las pizzas:', error);
        // En caso de error, asegura que pizzas$ siga siendo un observable de un array vacío
        this.pizzas$ = of([]);
      }
    );
  }

  ngOnDestroy(): void {
    // Asegura la desuscripción para evitar fugas de memoria.
    if (this.pizzasSubscription) {
      this.pizzasSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Incrementa la cantidad seleccionada de una pizza.
   * Asegura que selectedQuantity esté inicializado.
   * @param pizza La pizza cuya cantidad se va a incrementar.
   */
  incrementQuantity(pizza: Pizza): void {
    if (pizza.selectedQuantity === undefined) {
      pizza.selectedQuantity = 0;
    }
    pizza.selectedQuantity++;
  }

  /**
   * Decrementa la cantidad seleccionada de una pizza, sin ir por debajo de 0.
   * Asegura que selectedQuantity esté inicializado.
   * @param pizza La pizza cuya cantidad se va a decrementar.
   */
  decrementQuantity(pizza: Pizza): void {
    if (pizza.selectedQuantity === undefined) {
      pizza.selectedQuantity = 0;
    }
    if (pizza.selectedQuantity > 0) {
      pizza.selectedQuantity--;
    }
  }

  /**
   * Maneja el cambio directo en el input de cantidad.
   * Valida que la nueva cantidad sea un número válido y no menor que 0.
   * @param pizza La pizza cuya cantidad se va a actualizar.
   * @param event El evento del input.
   */
  onQuantityInputChange(pizza: Pizza, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      pizza.selectedQuantity = newQuantity;
    } else {
      // Si el valor no es válido (ej. texto o negativo), restablece a 0
      pizza.selectedQuantity = 0;
      inputElement.value = '0'; // Asegura que el input visualmente también muestre 0
    }
  }

  /**
   * Añade una pizza al carrito.
   * Requiere que el usuario esté logueado y la cantidad sea mayor que 0.
   * @param pizza La pizza a añadir.
   * @param quantity La cantidad a añadir.
   */
  async addToCart(pizza: Pizza, quantity: number): Promise<void> {
    if (!this.userId) {
      alert('Debes iniciar sesión para añadir productos al carrito.');
      return;
    }
    if (quantity <= 0) {
      alert('Por favor, selecciona una cantidad mayor que 0 para añadir al carrito.');
      return;
    }

    try {
      await this.cartService.addItemToCart(this.userId, pizza, quantity);
      alert(`"${pizza.nombre}" x${quantity} añadido(s) al carrito.`);
      // Opcional: restablecer la cantidad a 0 después de añadir al carrito
      // Esto limpia el input para la siguiente adición.
      pizza.selectedQuantity = 0;
    } catch (error) {
      console.error('Error al añadir al carrito:', error);
      alert('Ocurrió un error al añadir al carrito. Por favor, inténtalo de nuevo.');
    }
  }

  /**
   * Función de ayuda para codificar componentes de URL.
   * Útil si los nombres de pizza contienen caracteres especiales para URLs.
   * @param str La cadena a codificar.
   * @returns La cadena codificada.
   */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }
}
