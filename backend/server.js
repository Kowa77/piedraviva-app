// backend/server.js (o index.js)
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Acceder a las variables de entorno para las credenciales de Mercado Pago
// En producción en Render, estas variables serán inyectadas.
// En desarrollo local, usarán los valores por defecto (ej. para pruebas)
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TU_ACCESS_TOKEN_DE_DESARROLLO'; // Remplaza si lo necesitas para desarrollo local
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kowa77.github.io/piedraviva-app/'; // URL de tu frontend. En Render, será la URL de tu frontend.

const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });

const app = express();
const PORT = process.env.PORT || 3000; // Render asignará un puerto a través de process.env.PORT

app.use(cors({ origin: FRONTEND_URL })); // Permite solicitudes CORS solo desde tu frontend URL
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Mercado Pago Backend is running!');
});

app.post('/create_preference', async (req, res) => {
  try {
    const { items: cartItems } = req.body; // Esperamos un array de ítems del carrito

    // Mapea los ítems del carrito al formato que Mercado Pago espera
    const formattedItems = cartItems.map(item => ({
      title: item.nombre,
      quantity: Number(item.cantidad),
      unit_price: Number(item.precio),
      currency_id: "UYU", // Moneda uruguaya
    }));

    const body = {
      items: formattedItems,
      back_urls: {
        success: `${FRONTEND_URL}/purchase-success`, // URL a la que Mercado Pago redirigirá después de un pago exitoso
        failure: `${FRONTEND_URL}/purchase-failure`, // URL para pagos fallidos
        pending: `${FRONTEND_URL}/purchase-pending`  // URL para pagos pendientes
      },
      auto_return: "approved",
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    res.json({
      id: result.id,
      init_point: result.init_point // La URL para redirigir al usuario al checkout de MP
    });
  } catch (error) {
    console.error('Error creating preference:', error);
    res.status(500).json({ error: 'Error al crear la preferencia ;(' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
