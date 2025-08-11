import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard'; // Importa el guardia de ruta


export const routes: Routes = [
  // La página de inicio (ProductListComponent) se carga de forma perezosa
  // para seguir la consistencia de carga de componentes standalone.
  {
    path: '',
    loadComponent: () => import('./components/product-list/product-list.component').then(m => m.ProductListComponent),
    title: 'Menú Principal'
  },
  // Rutas con Lazy Loading para los demás componentes
  {
    path: 'product/:id',
    loadComponent: () => import('./components/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
    title: 'Detalle del Producto'
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/shopping-cart/shopping-cart.component').then(m => m.ShoppingCartComponent),
    title: 'Tu Carrito'
  },
  {
    path: 'purchase-history',
    loadComponent: () => import('./components/purchase-history/purchase-history.component').then(m => m.PurchaseHistoryComponent),
    canActivate: [AuthGuard], // Protege esta ruta con el AuthGuard
    title: 'Historial de Compras'
  },

  // Rutas para redirecciones de Mercado Pago (también Lazy Loaded)
  {
    path: 'purchase-success',
    loadComponent: () => import('./components/purchase-success/purchase-success.component').then(m => m.PurchaseSuccessComponent),
    title: 'Pago Exitoso'
  },
  {
    path: 'purchase-failure',
    loadComponent: () => import('./components/purchase-failure/purchase-failure.component').then(m => m.PurchaseFailureComponent),
    title: 'Pago Fallido'
  },
  {
    path: 'purchase-pending',
    loadComponent: () => import('./components/purchase-pending/purchase-pending.component').then(m => m.PurchasePendingComponent),
    title: 'Pago Pendiente'
  },

  // Ruta de fallback para cualquier otra ruta no definida
  { path: '**', redirectTo: '' }
];


// import { Routes } from '@angular/router';
// import { ProductListComponent } from './components/product-list/product-list.component';
// import { ProductDetailComponent } from './components/product-detail/product-detail.component';
// import { ShoppingCartComponent } from './components/shopping-cart/shopping-cart.component';
// import { PurchaseHistoryComponent } from './components/purchase-history/purchase-history.component';
// import { LoginRegisterModalComponent } from './components/login-register-modal/login-register-modal.component'; // Si es un componente standalone
// import { AuthGuard } from './guards/auth.guard'; // Si usas un guardia de ruta
// import { PurchaseSuccessComponent } from './components/purchase-success/purchase-success.component'; // Importa el componente faltante
// import { PurchaseFailureComponent } from './components/purchase-failure/purchase-failure.component'; // Importa el componente faltante
// import { PurchasePendingComponent } from './components/purchase-pending/purchase-pending.component'; // Importa el componente faltante

// export const routes: Routes = [
//   { path: '', component: ProductListComponent, title: 'Menú Principal' },
//   { path: 'product/:id', component: ProductDetailComponent, title: 'Detalle del Producto' },
//   { path: 'cart', component: ShoppingCartComponent, title: 'Tu Carrito' },
//   { path: 'purchase-history', component: PurchaseHistoryComponent, title: 'Historial de Compras', canActivate: [AuthGuard] }, // Protege esta ruta si es necesario

//   // Rutas para redirecciones de Mercado Pago
//   { path: 'purchase-success', component: PurchaseSuccessComponent, title: 'Pago Exitoso' }, // Necesitarás crear este componente
//   { path: 'purchase-failure', component: PurchaseFailureComponent, title: 'Pago Fallido' }, // Necesitarás crear este componente
//   { path: 'purchase-pending', component: PurchasePendingComponent, title: 'Pago Pendiente' }, // Necesitarás crear este componente

//   // Ruta de fallback para cualquier otra ruta no definida
//   { path: '**', redirectTo: '' }
// ];
