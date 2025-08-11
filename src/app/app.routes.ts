        import { Routes } from '@angular/router';
        import { ProductListComponent } from './components/product-list/product-list.component';
        import { ShoppingCartComponent } from './components/shopping-cart/shopping-cart.component';
        import { PurchaseHistoryComponent } from './components/purchase-history/purchase-history.component';
        import { ProductDetailComponent } from './components/product-detail/product-detail.component'; // Asegúrate de que esta línea esté presente y descomentada

        export const routes: Routes = [
          { path: '', component: ProductListComponent },
          { path: 'cart', component: ShoppingCartComponent },
          { path: 'purchase-history', component: PurchaseHistoryComponent },
          { path: 'product/:id', component: ProductDetailComponent }, // Asegúrate de que esta línea esté presente y descomentada
          // Si tuvieras un PizzaDetailComponent anterior y no lo usaras más, esta línea DEBERÍA estar comentada o eliminada:
          // { path: 'pizza/:id', component: PizzaDetailComponent },
          { path: '**', redirectTo: '' }
        ];
