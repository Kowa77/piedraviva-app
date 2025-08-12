// backend/server.js (o index.js)
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Acceder a las variables de entorno para las credenciales de Mercado Pago
// En producción en Render, estas variables serán inyectadas.
// En desarrollo local, usarán los valores por defecto (ej. para pruebas)
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'TU_ACCESS_TOKEN_DE_DESARROLLO'; // Remplaza si lo necesitas para desarrollo local

// --- INICIO DE LOS CAMBIOS PARA CORS ---
// Define todos los orígenes (URLs) desde los cuales tu frontend puede acceder a este backend.
// IMPORTANTE: Asegúrate de que estas URLs sean exactamente como aparecen en la barra de direcciones del navegador
// cuando accedes a tu frontend.
const ALLOWED_FRONTEND_URLS = [
  'https://kowa77.github.io', // Agrega el dominio base de GitHub Pages
  'https://kowa77.github.io/piedraviva-app', // Agrega la URL específica de tu aplicación en GitHub Pages
  'https://piedraviva-app-front.onrender.com' // Mantén esta si tu frontend también se despliega o desplegó en Render
  // Si tienes otras URLs de frontend, añádelas aquí también.
];

// Opcional: Para las back_urls de Mercado Pago, puedes seguir usando una variable de entorno
// o definirla directamente si solo tienes una. Aquí mantenemos la lógica actual pero con un nombre más claro.
const MERCADOPAGO_FRONTEND_REDIRECT_URL = process.env.FRONTEND_URL || 'https://kowa77.github.io/piedraviva-app/';
// --- FIN DE LOS CAMBIOS PARA CORS ---


const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });

const app = express();
const PORT = process.env.PORT || 3000; // Render asignará un puerto a través de process.env.PORT

// Configura CORS para permitir múltiples orígenes.
// El middleware 'cors' ahora aceptará cualquier URL dentro de ALLOWED_FRONTEND_URLS.
app.use(cors({ origin: ALLOWED_FRONTEND_URLS }));
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
        // Usa la variable para redirigir a Mercado Pago
        success: `${MERCADOPAGO_FRONTEND_REDIRECT_URL}/purchase-success`, // URL a la que Mercado Pago redirigirá después de un pago exitoso
        failure: `${MERCADAPAGO_FRONTEND_REDIRECT_URL}/purchase-failure`, // URL para pagos fallidos
        pending: `${MERCADAPAGO_FRONTEND_REDIRECT_URL}/purchase-pending`  // URL para pagos pendientes
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
