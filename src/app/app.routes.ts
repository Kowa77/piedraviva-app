import { Routes } from '@angular/router';
import { PizzaListComponent } from './components/pizza-list/pizza-list.component';
import { ShoppingCartComponent } from './components/shopping-cart/shopping-cart.component';
import { PurchaseHistoryComponent } from './components/purchase-history/purchase-history.component'; // ¡NUEVA IMPORTACIÓN!

export const routes: Routes = [
  { path: '', component: PizzaListComponent },
  { path: 'cart', component: ShoppingCartComponent },
  { path: 'purchase-history', component: PurchaseHistoryComponent }, // ¡NUEVA RUTA!
  { path: '**', redirectTo: '' }
];
