import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common'; // Añadir CurrencyPipe
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, switchMap, of, forkJoin } from 'rxjs'; // Importar forkJoin
import { map } from 'rxjs/operators'; // AÑADIDO: Importa el operador map
import { PizzaService } from '../../services/product.service'; // Este servicio ahora maneja Productos
import { Product } from '../../models/product.model'; // Importar Product

@Component({
  selector: 'app-pizza-detail', // Renombrar a app-product-detail en el futuro si se vuelve genérico
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe], // CommonModule para *ngIf y *ngFor, RouterLink para enlaces, CurrencyPipe
  templateUrl: './pizza-detail.component.html',
  styleUrl: './pizza-detail.component.css'
})
export class PizzaDetailComponent implements OnInit {
  product$!: Observable<Product | undefined>; // Observable para el producto seleccionado
  isLoading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private pizzaService: PizzaService // Ahora maneja productos genéricos
  ) { }

  ngOnInit(): void {
    this.product$ = this.route.paramMap.pipe(
      switchMap(params => {
        const productId = params.get('id');
        if (productId) {
          this.isLoading = true;
          // Intentar buscar el producto primero en pizzas, luego en bebidas
          return forkJoin([
            this.pizzaService.getProductById('pizzas', productId),
            this.pizzaService.getProductById('bebidas', productId)
          ]).pipe(
            map(([pizza, bebida]): Product | undefined => { // AÑADIDO: Tipado explícito de retorno del map
              this.isLoading = false;
              if (pizza) {
                // Asegurar el tipo para pizzas, devolver como Product
                // El servicio ya asigna 'tipo: "pizza"', pero la interfaz Product genérica no fuerza 'sabores'.
                // Nos basaremos en la función isPizza para la verificación de 'sabores'.
                return { ...pizza, tipo: 'pizza' } as Product;
              } else if (bebida) {
                return bebida; // Ya es de tipo Product con su tipo específico
              } else {
                this.errorMessage = 'Producto no encontrado.';
                return undefined;
              }
            })
          );
        }
        this.isLoading = false;
        this.errorMessage = 'ID de producto no proporcionado.';
        return of(undefined);
      })
    );

    this.product$.subscribe({
      error: (err) => {
        console.error('Error al cargar detalle del producto:', err);
        this.errorMessage = 'Ocurrió un error al cargar los detalles del producto.';
        this.isLoading = false;
      }
    });
  }

  // Método para manejar el clic en el botón "Pagar"
  payProduct(product: Product): void {
    console.log('Procediendo al pago del producto:', product.nombre);
    // Aquí puedes añadir la lógica real de pago
    alert(`Simulando pago de: ${product.nombre}. ¡Gracias por tu compra!`);
  }

  // Expone la función global encodeURIComponent al template (si se necesita para placeholders)
  encodeURIComponent(uriComponent: string): string {
    return encodeURIComponent(uriComponent);
  }

  /**
   * Helper para verificar si un producto es una pizza y, por lo tanto, tiene la propiedad 'sabores'.
   * Usa un predicado de tipo para informar a TypeScript.
   * @param product El producto a verificar.
   * @returns true si el producto es una pizza, false en caso contrario.
   */
  isPizza(product: Product): product is (Product & { sabores: string[] }) {
    return product.tipo === 'pizza';
  }
}
