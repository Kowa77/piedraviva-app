import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, Subscription, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators'; // Import catchError
import { ProductService } from '../../services/product.service'; // Usando ProductService
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model'; // Usando el modelo Product
import { FormsModule } from '@angular/forms'; // Ensure FormsModule is here

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, FormsModule], // Ensure FormsModule is here
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css'
})
export class ProductListComponent implements OnInit, OnDestroy {
  products$!: Observable<Product[]>; // Observable de productos (genérico)
  private userSubscription: Subscription | undefined;
  userId: string | null = null;
  loading: boolean = true; // Añadido estado de carga
  errorMessage: string | null = null; // Añadido estado de mensaje de error

  constructor(
    private productService: ProductService, // Inyecta ProductService
    private authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // Se suscribe al estado del usuario para obtener el userId,
    // y luego cambia a la obtención de productos.
    // Toda la cadena Observable se asigna a products$.
    this.products$ = this.authService.user$.pipe(
      switchMap(user => {
        this.userId = user ? user.uid : null;
        console.log('User ID en ProductList:', this.userId);
        this.loading = true; // Establece loading a true antes de la búsqueda
        return this.productService.getProducts(); // Obtiene productos usando ProductService
      }),
      map(products => {
        console.log('Datos de productos recibidos:', products);
        this.loading = false; // Establece loading a false después de recibir los datos
        // Inicializa 'selectedQuantity' para cada producto a 0.
        // Esto asegura que el input numérico comience en 0 y no en undefined.
        return products.map(product => ({ ...product, selectedQuantity: 0 }));
      }),
      catchError(error => {
        console.error('Error al cargar los productos:', error);
        this.loading = false; // Establece loading a false en caso de error
        this.errorMessage = 'No se pudieron cargar los productos. Por favor, intenta de nuevo más tarde.';
        return of([]); // Retorna un observable vacío en caso de error
      })
    );

    // Esta suscripción es solo para activar la cadena observable y manejar efectos secundarios
    // como actualizar `loading` y `errorMessage`. La plantilla usa `products$ | async`.
    this.userSubscription = this.products$.subscribe();
  }

  ngOnDestroy(): void {
    // Asegura la desuscripción para evitar fugas de memoria.
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Incrementa la cantidad seleccionada de un producto.
   * Asegura que selectedQuantity esté inicializado.
   * @param product El producto cuya cantidad se va a incrementar.
   */
  incrementQuantity(product: Product): void {
    if (product.selectedQuantity === undefined) {
      product.selectedQuantity = 0;
    }
    product.selectedQuantity++;
  }

  /**
   * Decrementa la cantidad seleccionada de un producto, sin ir por debajo de 0.
   * Asegura que selectedQuantity esté inicializado.
   * @param product El producto cuya cantidad se va a decrementar.
   */
  decrementQuantity(product: Product): void {
    if (product.selectedQuantity === undefined) {
      product.selectedQuantity = 0;
    }
    if (product.selectedQuantity > 0) {
      product.selectedQuantity--;
    }
  }

  /**
   * Maneja el cambio directo en el input de cantidad.
   * Valida que la nueva cantidad sea un número válido y no menor que 0.
   * @param product El producto cuya cantidad se va a actualizar.
   * @param event El evento del input.
   */
  onQuantityInputChange(product: Product, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      product.selectedQuantity = newQuantity;
    } else {
      // Si el valor no es válido (ej. texto o negativo), restablece a 0
      product.selectedQuantity = 0;
      inputElement.value = '0'; // Asegura que el input visualmente también muestre 0
    }
  }

  /**
   * Añade un producto al carrito.
   * Requiere que el usuario esté logueado y la cantidad sea mayor que 0.
   * @param product El producto a añadir.
   * @param quantity La cantidad a añadir.
   */
  async addToCart(product: Product, quantity: number): Promise<void> {
    if (!this.userId) {
      alert('Debes iniciar sesión para añadir productos al carrito.');
      return;
    }
    if (quantity <= 0) {
      alert('Por favor, selecciona una cantidad mayor que 0 para añadir al carrito.');
      return;
    }

    try {
      await this.cartService.addItemToCart(this.userId, product, quantity);
      alert(`"${product.nombre}" x${quantity} añadido(s) al carrito.`);
      // Opcional: restablecer la cantidad seleccionada a 0 después de añadir al carrito
      product.selectedQuantity = 0;
    } catch (error) {
      console.error('Error al añadir al carrito:', error);
      alert('Ocurrió un error al añadir al carrito. Por favor, inténtalo de nuevo.');
    }
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

  /**
   * Helper para verificar si un producto es una pizza (tiene 'sabores').
   * Se utiliza para la visualización condicional en HTML.
   * @param product El producto a verificar.
   * @returns true si el producto tiene 'sabores', false en caso contrario.
   */
  isPizza(product: Product): product is (Product & { sabores: string[] }) {
    // Si la propiedad 'tipo' existe y es 'pizza', o si tiene la propiedad 'sabores' (aunque opcional en Product)
    return product.tipo === 'pizza' || (product as any).sabores !== undefined;
  }
}
