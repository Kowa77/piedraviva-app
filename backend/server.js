// server.js (o index.js)
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Importa las variables de entorno si están en un archivo separado
// En un entorno de producción, las credenciales no deberían estar en el código fuente
// sino en variables de entorno del servidor (ej: process.env.MERCADOPAGO_ACCESS_TOKEN)
const environment = {
  production: true,
  mercadoPago: {
    PUBLIC_KEY: "APP_USR-9f65b76b-c25b-4e70-a855-1f41c9ada6a1",
    ACCESS_TOKEN: "APP_USR-5147269394129242-081117-37224fdb5e051c7998415bd5f81424a2-95355573",
    CLIENT_ID: "5147269394129242",
    CLIENT_SECRET: "r5aX8I8PuR4NYwPwXKmdLqTcoioWzyJc"
  }
};

// Agregando credenciales
// Usamos el ACCESS_TOKEN del objeto environment
const client = new MercadoPagoConfig({ accessToken: environment.mercadoPago.ACCESS_TOKEN });

const app = express();
const PORT = 3000; // El puerto de tu servidor backend

app.use(cors()); // Permite solicitudes CORS desde tu frontend Angular
app.use(express.json()); // Permite que el servidor entienda JSON en el cuerpo de las solicitudes

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
        success: "http://localhost:4200/purchase-success", // URL a la que Mercado Pago redirigirá después de un pago exitoso
        failure: "http://localhost:4200/purchase-failure", // URL para pagos fallidos
        pending: "http://localhost:4200/purchase-pending"  // URL para pagos pendientes
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