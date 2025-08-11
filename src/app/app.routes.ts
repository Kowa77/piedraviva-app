import { Routes } from '@angular/router';
import { ProductListComponent } from './components/product-list/product-list.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { ShoppingCartComponent } from './components/shopping-cart/shopping-cart.component';
import { PurchaseHistoryComponent } from './components/purchase-history/purchase-history.component';
import { LoginRegisterModalComponent } from './components/login-register-modal/login-register-modal.component'; // Si es un componente standalone
import { AuthGuard } from './guards/auth.guard'; // Si usas un guardia de ruta
import { PurchaseSuccessComponent } from './components/purchase-success/purchase-success-component'; // Importa el componente faltante
import { PurchaseFailureComponent } from './components/purchase-failure/purchase-failure.component'; // Importa el componente faltante
import { PurchasePendingComponent } from './components/purchase-pending/purchase-pending.component'; // Importa el componente faltante

export const routes: Routes = [
  { path: '', component: ProductListComponent, title: 'Menú Principal' },
  { path: 'product/:id', component: ProductDetailComponent, title: 'Detalle del Producto' },
  { path: 'cart', component: ShoppingCartComponent, title: 'Tu Carrito' },
  { path: 'purchase-history', component: PurchaseHistoryComponent, title: 'Historial de Compras', canActivate: [AuthGuard] }, // Protege esta ruta si es necesario

  // Rutas para redirecciones de Mercado Pago
  { path: 'purchase-success', component: PurchaseSuccessComponent, title: 'Pago Exitoso' }, // Necesitarás crear este componente
  { path: 'purchase-failure', component: PurchaseFailureComponent, title: 'Pago Fallido' }, // Necesitarás crear este componente
  { path: 'purchase-pending', component: PurchasePendingComponent, title: 'Pago Pendiente' }, // Necesitarás crear este componente

  // Ruta de fallback para cualquier otra ruta no definida
  { path: '**', redirectTo: '' }
];
