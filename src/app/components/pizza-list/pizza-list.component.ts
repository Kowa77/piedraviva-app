import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators'; // Importamos map
import { PizzaService } from '../../services/pizza.service';
import { Pizza } from '../../models/pizza.model';
import { AuthService } from '../../services/auth.service'; // Importamos AuthService
import { CartService } from '../../services/cart.service'; // Importamos CartService

// Extendemos la interfaz Pizza para incluir la cantidad seleccionada en el frontend
interface PizzaWithQuantity extends Pizza {
  selectedQuantity?: number;
}

@Component({
  selector: 'app-pizza-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pizza-list.component.html',
  styleUrl: './pizza-list.component.css'
})
export class PizzaListComponent implements OnInit, OnDestroy {
  pizzas$!: Observable<PizzaWithQuantity[]>; // Usamos la interfaz extendida
  private pizzasSubscription: Subscription | undefined;

  constructor(
    private pizzaService: PizzaService,
    private authService: AuthService, // Inyectamos AuthService
    private cartService: CartService // Inyectamos CartService
  ) { }

  ngOnInit(): void {
    this.pizzas$ = this.pizzaService.getPizzas().pipe(
      // Inicializamos selectedQuantity a 1 para cada pizza
      map(pizzas => pizzas.map(pizza => ({ ...pizza, selectedQuantity: 1 })))
    );

    this.pizzasSubscription = this.pizzas$.subscribe(
      (pizzas) => {
        console.log('Datos de pizzas recibidos:', pizzas);
        if (pizzas && pizzas.length > 0) {
          console.log('Primera pizza:', pizzas[0]);
          console.log('URL de imagen de la primera pizza:', pizzas[0].imagenUrl);
        }
      },
      (error) => {
        console.error('Error al obtener pizzas:', error);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.pizzasSubscription) {
      this.pizzasSubscription.unsubscribe();
    }
  }

  /**
   * Agrega la pizza al carrito del usuario logueado con la cantidad especificada.
   * @param pizza La pizza a agregar.
   * @param quantity La cantidad a agregar.
   */
  addToCart(pizza: PizzaWithQuantity, quantity: number): void {
    this.authService.user$.subscribe(user => {
      if (user && user.uid) {
        // Aseguramos que la cantidad sea al menos 1
        const finalQuantity = Math.max(1, quantity);
        this.cartService.addItemToCart(user.uid, pizza, finalQuantity)
          .then((currentCartQuantity: number) => { // Capturamos la cantidad devuelta
            alert(`"${pizza.nombre}" tiene ahora ${currentCartQuantity} unidades en tu carrito.`);
            console.log(`Pizza "${pizza.nombre}" tiene ahora ${currentCartQuantity} unidades en el carrito del usuario ${user.uid}`);
          })
          .catch(error => {
            console.error('Error al agregar pizza al carrito:', error);
            alert('Error al agregar pizza al carrito. Por favor, inténtalo de nuevo.');
          });
      } else {
        alert('Debes iniciar sesión para agregar productos al carrito.');
        console.log('Usuario no logueado. No se puede agregar al carrito.');
      }
    });
  }

  // Expone la función global encodeURIComponent al template
  encodeURIComponent(uriComponent: string): string {
    return encodeURIComponent(uriComponent);
  }
}
