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
import { onSnapshot } from '@firebase/firestore'; // Asegúrate de que esto esté aquí si se usa

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  // CORRECCIÓN: product$ ahora se inicializa directamente en el constructor,
  // por lo que ya no necesita el operador de aserción '!'
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
    // CORRECCIÓN CLAVE: Inicializamos product$ en el constructor
    this.product$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      switchMap(id => {
        // Reiniciamos los estados de carga y error antes de cada nueva solicitud
        this.loading = true;
        this.errorMessage = null;

        if (!id) {
          this.loading = false;
          this.errorMessage = 'ID de producto no proporcionado.';
          return of(undefined);
        }

        return this.productService.getProductById(id).pipe(
          map(product => {
            this.loading = false;
            // Si se encuentra el producto, establece la cantidad inicial en 1
            if (product) {
              this.selectedQuantity = 1;
            }
            return product;
          }),
          catchError(error => {
            this.loading = false;
            this.errorMessage = 'Error al cargar el producto. Por favor, inténtelo de nuevo más tarde.';
            console.error('Error al cargar el producto:', error);
            return of(undefined);
          })
        );
      })
    );
  }

  ngOnInit(): void {
    // Suscribirse para obtener el ID del usuario
    this.userSubscription = this.authService.user$.subscribe(user => {
      this.userId = user ? user.uid : null;
    });
  }

  ngOnDestroy(): void {
    // Limpiar la suscripción para evitar fugas de memoria
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Maneja el cambio de cantidad desde el input del usuario.
   * @param event El evento de entrada.
   */
  onQuantityInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = parseInt(inputElement.value, 10);
    if (!isNaN(value) && value >= 0) {
      this.selectedQuantity = value;
    }
  }

  /**
   * Incrementa la cantidad seleccionada.
   */
  incrementQuantity(): void {
    this.selectedQuantity++;
  }

  /**
   * Decrementa la cantidad seleccionada, asegurándose de que no sea negativa.
   */
  decrementQuantity(): void {
    if (this.selectedQuantity > 0) {
      this.selectedQuantity--;
    }
  }

  /**
   * Añade el producto actual al carrito del usuario.
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
