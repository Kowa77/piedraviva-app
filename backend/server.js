// backend/server.js (o index.js)
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Acceder a las variables de entorno para las credenciales de Mercado Pago
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TU_ACCESS_TOKEN_DE_DESARROLLO'; // Remplaza si lo necesitas para desarrollo local

// Define todos los orígenes (URLs) desde los cuales tu frontend puede acceder a este backend.
const ALLOWED_FRONTEND_URLS = [
  'https://kowa77.github.io', // Agrega el dominio base de GitHub Pages
  'https://kowa77.github.io/piedraviva-app', // Agrega la URL específica de tu aplicación en GitHub Pages
  'https://piedraviva-app-front.onrender.com' // Mantén esta si tu frontend también se despliega o desplegó en Render
];

// Corregido: La variable para las back_urls de Mercado Pago, ahora con el nombre correcto.
const MERCADOPAGO_FRONTEND_REDIRECT_URL = process.env.FRONTEND_URL || 'https://kowa77.github.io/piedraviva-app/';

const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: ALLOWED_FRONTEND_URLS }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Mercado Pago Backend is running!');
});

app.post('/create_preference', async (req, res) => {
  try {
    const { items: cartItems } = req.body; // Esperamos un array de ítems del carrito

    // AGREGAR VALIDACIÓN DE ENTRADA AQUI
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.status(400).json({ error: 'El carrito de compras está vacío o no tiene el formato correcto.' });
    }

    // Mapea los ítems del carrito al formato que Mercado Pago espera
    const formattedItems = cartItems.map(item => ({
      title: item.nombre,
      quantity: Number(item.cantidad),
      unit_price: Number(item.precio),
      currency_id: "UYU", // Moneda uruguaya
    }));

    // Otra validación: asegurar que los números son válidos
    const invalidItems = formattedItems.filter(item =>
        !item.title || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unit_price) || item.unit_price <= 0
    );

    if (invalidItems.length > 0) {
        return res.status(400).json({ error: 'Algunos ítems del carrito tienen datos inválidos (nombre, cantidad o precio).' });
    }

    const body = {
      items: formattedItems,
      back_urls: {
        // Corregido: Usando la variable con el nombre correcto aquí
        success: `${MERCADOPAGO_FRONTEND_REDIRECT_URL}/purchase-success`,
        failure: `${MERCADOPAGO_FRONTEND_REDIRECT_URL}/purchase-failure`,
        pending: `${MERCADOPAGO_FRONTEND_REDIRECT_URL}/purchase-pending`
      },
      auto_return: "approved",
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    res.json({
      id: result.id,
      init_point: result.init_point
    });
  } catch (error) {
    console.error('Error creating preference:', error);

    let errorMessage = 'Error al crear la preferencia;(';
    let statusCode = 500;

    if (error.status && error.message) {
      errorMessage = `Error de Mercado Pago (${error.status}): ${error.message}`;
      statusCode = error.status;
    } else if (error.message) {
      errorMessage = `Error interno del servidor: ${error.message}`;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
