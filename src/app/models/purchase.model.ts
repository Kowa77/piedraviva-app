    // src/app/models/purchase.model.ts
    import { CartItem } from './cart-item.model';

    export interface Purchase {
      purchaseId: string;
      userId: string;
      items: CartItem[];
      total: number;
      timestamp: string; // ISO string de la fecha de compra
    }
