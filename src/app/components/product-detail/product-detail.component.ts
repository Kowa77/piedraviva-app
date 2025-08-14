import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subscription, of, EMPTY } from 'rxjs';
import { switchMap, map, catchError, shareReplay, tap, finalize } from 'rxjs/operators';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product } from '../../models/product.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  // Observable para el producto, emitirá undefined si no se encuentra o hay un error.
  product$: Observable<Product | undefined>;
  // Bandera para indicar si se está cargando el producto.
  loading: boolean = true;
  // Mensaje de error a mostrar si algo falla.
  errorMessage: string | null = null;
  // Cantidad seleccionada para añadir al carrito.
  selectedQuantity: number = 0;
  // ID del usuario autenticado.
  userId: string | null = null;

  constructor(
    private route: ActivatedRoute, // Para acceder a los parámetros de la ruta.
    private productService: ProductService, // Servicio para obtener los productos.
    private cartService: CartService, // Servicio para gestionar el carrito de compras.
    private authService: AuthService // Servicio para gestionar la autenticación del usuario.
  ) {
    // Inicializa product$ con 'undefined' para evitar errores antes de que se carguen los datos.
    this.product$ = of(undefined);
  }

  ngOnInit(): void {
    console.log('NGONINIT: Inicializando ProductDetailComponent...');

    // Combina la escucha del estado de autenticación con la obtención del producto.
    this.product$ = this.authService.user$.pipe(
      // Actualiza el userId cuando el estado de autenticación cambia.
      tap(user => {
        this.userId = user ? user.uid : null;
        console.log('TAP (AuthService.user$): User ID después del cambio de estado de autenticación:', this.userId);
      }),
      // Cambia al observable de los parámetros de la ruta.
      switchMap(() => {
        console.log('SWITCHMAP (paramMap): Preparando para obtener parámetros de ruta.');
        return this.route.paramMap;
      }),
      // Una vez que los parámetros están disponibles, obtiene el ID del producto.
      switchMap(params => {
        const id = params.get('id');
        this.loading = true; // Reinicia el estado de carga al inicio de una nueva búsqueda de producto.
        this.errorMessage = null; // Limpia cualquier mensaje de error anterior.
        console.log('SWITCHMAP (params): ID de producto detectado:', id);
        console.log('SWITCHMAP (params): loading establecido a TRUE. errorMessage limpiado.');

        if (id) {
          // Si hay un ID, llama al servicio para obtener el producto.
          return this.productService.getProductById(id).pipe(
            // Procesa el producto recibido.
            tap(product => {
              console.log('TAP (getProductById SUCCESS): Producto recibido del servicio:', product);
              this.loading = false; // La carga ha finalizado.
              console.log('TAP (getProductById SUCCESS): loading establecido a FALSE.');

              if (product) {
                // Si el producto existe, inicializa la cantidad seleccionada a 1.
                this.selectedQuantity = 1;
                console.log('TAP (getProductById SUCCESS): Cantidad seleccionada inicializada a 1.');
              } else {
                // Si no se encuentra el producto, establece un mensaje de error.
                this.errorMessage = 'Producto no encontrado. El ID podría ser inválido o el producto fue eliminado.';
                console.warn('TAP (getProductById SUCCESS): Producto no encontrado para ID:', id, 'Estableciendo errorMessage.');
              }
            }),
            // Maneja cualquier error que ocurra durante la carga del producto.
            catchError(error => {
              console.error('CATCHERROR (getProductById ERROR): Error al cargar los detalles del producto:', error);
              this.loading = false; // La carga ha finalizado con error.
              this.errorMessage = 'No se pudo cargar la información del producto. Error de red o servidor.';
              console.log('CATCHERROR (getProductById ERROR): loading establecido a FALSE. Estableciendo errorMessage.');
              return of(undefined); // Emite 'undefined' para que el async pipe no falle.
            }),
            // finalize(() => {
            //   console.log('FINALIZE (getProductById): Observable de producto completado o con error.');
            //   // No tocamos loading aquí ya que tap/catchError ya lo manejan para evitar destellos
            // })
          );
        } else {
          // Si no se proporciona un ID en la URL, la carga termina inmediatamente con un error.
          console.log('ELSE (paramMap): ID de producto no proporcionado. Finalizando carga.');
          this.loading = false;
          this.errorMessage = 'ID de producto no proporcionado en la URL.';
          return of(undefined); // No hay ID, no hay producto.
        }
      }),
      // shareReplay(1) asegura que el observable sea "caliente" y comparta el último valor
      // con múltiples suscriptores (incluyendo el async pipe), evitando múltiples llamadas al servicio.
      shareReplay(1)
    );
  }

  ngOnDestroy(): void {
    console.log('NGONDESTROY: Destruyendo ProductDetailComponent.');
  }

  /**
   * Incrementa la cantidad seleccionada para añadir al carrito.
   */
  incrementQuantity(): void {
    this.selectedQuantity++;
    console.log('incrementQuantity: Cantidad actual:', this.selectedQuantity);
  }

  /**
   * Decrementa la cantidad seleccionada para añadir al carrito, sin ir por debajo de 1.
   */
  decrementQuantity(): void {
    if (this.selectedQuantity > 1) {
      this.selectedQuantity--;
    }
    console.log('decrementQuantity: Cantidad actual:', this.selectedQuantity);
  }

  /**
   * Maneja el cambio directo en el input de cantidad.
   * Valida que la nueva cantidad sea un número válido y no menor que 0.
   * @param event El evento del input.
   */
  onQuantityInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const newQuantity = parseInt(inputElement.value, 10);
    console.log('onQuantityInputChange: Nueva cantidad ingresada:', newQuantity);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      this.selectedQuantity = newQuantity;
    } else {
      this.selectedQuantity = 1; // Restablece a 1 si es inválido.
      inputElement.value = '1';
      console.warn('onQuantityInputChange: Cantidad inválida, restableciendo a 1.');
    }
  }

  /**
   * Añade el producto al carrito.
   * @param product El producto a añadir.
   */
  async addToCart(product: Product): Promise<void> {
    console.log('addToCart: Intentando añadir al carrito el producto:', product);
    if (!this.userId) {
      console.warn('addToCart: Debes iniciar sesión para añadir productos al carrito.');
      // Aquí podrías integrar un modal personalizado o un snackbar para el usuario.
      return;
    }
    if (this.selectedQuantity <= 0) {
      console.warn('addToCart: Por favor, selecciona una cantidad mayor que 0 para añadir al carrito.');
      // Aquí podrías integrar un modal personalizado o un snackbar para el usuario.
      return;
    }

    try {
      await this.cartService.addItemToCart(this.userId, product, this.selectedQuantity);
      console.log(`addToCart: "${product.nombre}" x${this.selectedQuantity} añadido(s) al carrito.`);
      // Aquí podrías integrar un modal personalizado o un snackbar para confirmar al usuario.
      this.selectedQuantity = 1; // Resetea la cantidad después de añadir.
      console.log('addToCart: Cantidad seleccionada reiniciada a 1.');
    } catch (error) {
      console.error('addToCart: Error al añadir al carrito:', error);
      this.errorMessage = 'Ocurrió un error al añadir al carrito. Por favor, inténtalo de nuevo.';
      // Aquí podrías integrar un modal personalizado o un snackbar para el usuario.
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
