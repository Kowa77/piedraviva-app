import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { ProductService } from '../../services/product.service'; // Importa el ProductService
import { CartService } from '../../services/cart.service'; // Importa el CartService
import { AuthService } from '../../services/auth.service'; // Importa el AuthService
import { Product } from '../../models/product.model'; // Importa el modelo Product
import { FormsModule } from '@angular/forms'; // Necesario para ngModel en el input de cantidad

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, FormsModule], // Asegura FormsModule
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product$: Observable<Product | undefined>;
  loading: boolean = true;
  errorMessage: string | null = null;
  selectedQuantity: number = 0; // Cantidad seleccionada para añadir al carrito
  userId: string | null = null;
  private userSubscription: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {
    this.product$ = of(undefined); // Inicializa a undefined
  }

  ngOnInit(): void {
    // Primero, obtenemos el ID del usuario
    this.userSubscription = this.authService.user$.pipe(
      switchMap(user => {
        this.userId = user ? user.uid : null;
        console.log('ProductDetailComponent: User ID after auth state change:', this.userId);
        // Luego, obtenemos el ID del producto de la ruta
        return this.route.paramMap;
      }),
      switchMap(params => {
        const id = params.get('id');
        if (id) {
          this.loading = true; // Empieza a cargar el producto
          return this.productService.getProductById(id).pipe(
            map(product => {
              this.loading = false; // Finaliza la carga
              if (product) {
                this.selectedQuantity = 1; // Inicializa la cantidad a 1 cuando se carga el producto
              }
              return product;
            }),
            catchError(error => {
              console.error('Error al cargar los detalles del producto:', error);
              this.loading = false;
              this.errorMessage = 'No se pudo cargar la información del producto.';
              return of(undefined); // Retorna undefined en caso de error
            })
          );
        } else {
          this.loading = false;
          this.errorMessage = 'ID de producto no proporcionado.';
          return of(undefined); // No hay ID, no hay producto
        }
      })
    ).subscribe(
      product => {
        // La asignación a this.product$ se hace en el pipe con el operador map,
        // esta suscripción es solo para activar el flujo y manejar el estado.
        // Si necesitas hacer algo con el producto aquí (ej. logs finales), puedes hacerlo.
        console.log('ProductDetailComponent: Producto cargado:', product);
      },
      error => {
        console.error('ProductDetailComponent: Error en la suscripción principal:', error);
      }
    );
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Incrementa la cantidad seleccionada para añadir al carrito.
   */
  incrementQuantity(): void {
    this.selectedQuantity++;
  }

  /**
   * Decrementa la cantidad seleccionada para añadir al carrito, sin ir por debajo de 1.
   */
  decrementQuantity(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity--;
    }
  }

  /**
   * Maneja el cambio directo en el input de cantidad.
   * Valida que la nueva cantidad sea un número válido y no menor que 0.
   * @param event El evento del input.
   */
  onQuantityInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      this.selectedQuantity = newQuantity;
    } else {
      this.selectedQuantity = 1; // Restablece a 1 si es inválido
      inputElement.value = '1';
    }
  }

  /**
   * Añade el producto al carrito.
   * @param product El producto a añadir.
   */
  async addToCart(product: Product): Promise<void> {
    if (!this.userId) {
      alert('Debes iniciar sesión para añadir productos al carrito.');
      return;
    }
    if (this.selectedQuantity <= 0) {
      alert('Por favor, selecciona una cantidad mayor que 0 para añadir al carrito.');
      return;
    }

    try {
      await this.cartService.addItemToCart(this.userId, product, this.selectedQuantity);
      alert(`"${product.nombre}" x${this.selectedQuantity} añadido(s) al carrito.`);
      this.selectedQuantity = 1; // Resetea la cantidad después de añadir
    } catch (error) {
      console.error('Error al añadir al carrito:', error);
      alert('Ocurrió un error al añadir al carrito. Por favor, inténtalo de nuevo.');
    }
  }

  /**
   * Helper para verificar si un producto es una pizza (tiene 'sabores').
   * Se utiliza para la visualización condicional en HTML.
   * @param product El producto a verificar.
   * @returns true si el producto tiene 'sabores', false en caso contrario.
   */
  isPizza(product: Product): product is (Product & { sabores: string[] }) {
    return product.tipo === 'pizza' || (product as any).sabores !== undefined;
  }

  /**
   * Función de ayuda para codificar componentes de URL.
   * Útil si los nombres de productos contienen caracteres especiales para URLs.
   * @param str La cadena a codificar.
   * @returns La cadena codificada.
   */
  encodeURIComponent(str: string): string {
    return encodeURIComponent(str);
  }
}
