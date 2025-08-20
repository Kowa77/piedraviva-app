// backend/server.js
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'; // Import Payment
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore'; // Para Firestore
import { getDatabase } from 'firebase-admin/database'; // Para Realtime Database
import dotenv from 'dotenv'; // Para cargar variables de entorno desde .env local

dotenv.config(); // Cargar variables de entorno al inicio

// --- Inicialización de Firebase Admin SDK ---
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({
    credential: cert(serviceAccount),
    // Configura la URL de tu Realtime Database aquí si la usas
    databaseURL: process.env.FIREBASE_DATABASE_URL // Asegúrate de que esta variable de entorno esté configurada en Render
  });
  console.log('Firebase Admin SDK inicializado correctamente.');
} catch (error) {
  console.error('Error al inicializar Firebase Admin SDK. Asegúrate de que FIREBASE_SERVICE_ACCOUNT_KEY esté configurada correctamente:', error);
  // No salir aquí en desarrollo, pero en producción podrías quererlo.
}

const dbFirestore = getFirestore(); // Instancia de Firestore
const dbRealtime = getDatabase(); // Instancia de Realtime Database

// --- Credenciales y URLs ---
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });

// Define todos los orígenes (URLs) desde los cuales tu frontend puede acceder a este backend.
const ALLOWED_FRONTEND_URLS = [
  'https://kowa77.github.io',
  'https://kowa77.github.io/piedraviva-app',
  'http://localhost:4200' // ¡IMPORTANTE! Añade esta línea para desarrollo local
  // Añade otros dominios si tu frontend se aloja en múltiples lugares
];

// La URL de tu frontend para las redirecciones post-pago de Mercado Pago
const MERCADOPAGO_FRONTEND_REDIRECT_URL = process.env.FRONTEND_URL || 'https://kowa77.github.io/piedraviva-app/';

// La URL de tu backend para que Mercado Pago envíe las notificaciones (webhooks/IPN)
const BACKEND_PUBLIC_URL = process.env.BACKEND_URL || 'http://localhost:3000'; // Usa localhost para desarrollo

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({ origin: ALLOWED_FRONTEND_URLS }));
app.use(express.json()); // Middleware para parsear JSON en el body de las peticiones

// --- Rutas ---

app.get('/', (req, res) => {
  res.send('Mercado Pago Backend is running!');
});

// Endpoint para crear la preferencia de pago en Mercado Pago
app.post('/create_preference', async (req, res) => {
  try {
    // Esperamos un array de ítems del carrito y un userId (ID del usuario autenticado)
    const { items: cartItems, userId } = req.body;

    // Validaciones iniciales
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'El carrito de compras está vacío o no tiene el formato correcto.' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere un ID de usuario para crear la preferencia.' });
    }

    // Mapeo de ítems del formato frontend al formato de Mercado Pago
    const formattedItems = cartItems.map(item => ({
      title: item.nombre, // Asegurarse que el nombre del item se mapee a 'title'
      quantity: Number(item.cantidad), // Asegurarse que la cantidad sea Number
      unit_price: Number(item.precio), // Asegurarse que el precio sea Number
      currency_id: "UYU", // Moneda uruguaya
      // Agrega aquí otras propiedades si Mercado Pago las soporta o si son útiles para el webhook
      // Por ejemplo, el ID del producto original si lo necesitas en el webhook
      // id: item.id, // ID del producto del frontend
      // picture_url: item.imagenUrl // URL de la imagen si Mercado Pago lo permite
    }));

    // Validación de datos numéricos y de texto de los ítems
    const invalidItems = formattedItems.filter(item =>
      !item.title || isNaN(item.quantity) || item.quantity <= 0 || isNaN(item.unit_price) || item.unit_price <= 0
    );

    if (invalidItems.length > 0) {
      return res.status(400).json({ error: 'Algunos ítems del carrito tienen datos inválidos (nombre, cantidad o precio).' });
    }

    const body = {
      items: formattedItems,
      back_urls: { // URLs a las que el usuario es redirigido después de la compra
        success: `${MERCADOPAGO_FRONTEND_REDIRECT_URL}/purchase-success`,
        failure: `${MERCADOPAGO_FRONTEND_REDIRECT_URL}/purchase-failure`,
        pending: `${MERCADOPAGO_FRONTEND_REDIRECT_URL}/purchase-pending`
      },
      auto_return: "approved", // Redirigir automáticamente si el pago es aprobado
      external_reference: userId, // Aquí guardamos el userId para recuperarlo en el webhook
      // URL a la que Mercado Pago enviará las notificaciones de eventos de pago (IPN)
      notification_url: `${BACKEND_PUBLIC_URL}/webhook/mercadopago`,
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    res.json({
      id: result.id,
      init_point: result.init_point // URL a la que el frontend redirigirá al usuario
    });

  } catch (error) {
    console.error('Error creando preferencia de pago:', error);

    let errorMessage = 'Error al crear la preferencia de pago.';
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

// Endpoint para recibir las notificaciones de Mercado Pago (Webhooks/IPN)
app.post('/webhook/mercadopago', async (req, res) => {
  console.log('--- Notificación de Mercado Pago (Webhook) Recibida ---');
  console.log('Query Params:', req.query); // Contiene 'topic' y 'id'
  console.log('Body (puede estar vacío para IPN):', req.body); // El cuerpo puede no ser relevante para IPN v1

  const { topic, id } = req.query; // Para IPN v1, los parámetros clave están en la query

  if (topic === 'payment') {
    try {
      // Usar el SDK de Mercado Pago para obtener los detalles completos del pago
      const paymentInstance = new Payment(client);
      const paymentDetails = await paymentInstance.get({ id: id });

      console.log('Detalles del Pago Obtenidos:', paymentDetails);

      if (paymentDetails.status === 'approved') {
        const userId = paymentDetails.external_reference; // Recuperar el userId del pago
        const appId = process.env.APP_ID || 'default-app-id'; // Obtener el ID de la aplicación

        // Mapea los ítems de Mercado Pago al formato de tu CartItem/Product
        // Mercado Pago puede devolver los ítems en 'additional_info.items' o 'items' de la preferencia original
        // Es crucial que esta transformación coincida con tu modelo CartItem en el frontend
        const purchasedItems = paymentDetails.additional_info.items.map(mpItem => ({
            id: mpItem.id || 'N/A', // O el ID que enviaste en el item de Mercado Pago
            nombre: mpItem.title,
            cantidad: mpItem.quantity,
            precio: mpItem.unit_price,
            imagenUrl: mpItem.picture_url || 'https://placehold.co/100x100/FF5733/FFFFFF?text=Producto', // Usar una URL por defecto si no hay
            // Añade otras propiedades que necesites de tu modelo CartItem, por ejemplo 'tipo'
            // tipo: mpItem.category_id || 'producto' // Si Mercado Pago devuelve la categoría
        }));

        // Calcula el total de la compra. Aunque Mercado Pago da transaction_amount,
        // es bueno reconfirmarlo con los items si es posible.
        const totalAmount = paymentDetails.transaction_amount;

        // Estructura de la compra a guardar en Firestore
        const purchaseData = {
          purchaseId: paymentDetails.id, // ID del pago de Mercado Pago como purchaseId
          userId: userId,
          items: purchasedItems, // ¡Aquí usamos los ítems mapeados!
          total: totalAmount,
          timestamp: new Date().toISOString(), // Fecha de la compra
          status: paymentDetails.status, // 'approved'
          paymentMethod: paymentDetails.payment_type_id, // e.g., 'credit_card'
          installments: paymentDetails.installments // Cantidad de cuotas
        };

        // --- Guardar en Firestore ---
        // Ruta de Firestore para guardar compras de usuarios:
        // /artifacts/{appId}/users/{userId}/purchases/{documentId}
        const userPurchasesCollectionRef = dbFirestore.collection(`artifacts/${appId}/users/${userId}/purchases`);
        await userPurchasesCollectionRef.add(purchaseData); // Añadir un nuevo documento a la colección
        console.log(`Compra ${paymentDetails.id} guardada para el usuario ${userId} en Firestore.`);

        // --- Vaciar el carrito del usuario en Realtime Database ---
        const cartRef = dbRealtime.ref(`carts/${userId}/items`);
        await cartRef.remove(); // Elimina todos los ítems del carrito del usuario
        console.log(`Carrito del usuario ${userId} vaciado en Realtime Database.`);

      } else {
        console.log(`El pago ${paymentDetails.id} tiene estado ${paymentDetails.status}, no se guarda en el historial de compras ni se vacía el carrito.`);
      }
      res.sendStatus(200); // ES CRÍTICO responder con 200 OK para que Mercado Pago no reintente la notificación
    } catch (error) {
      console.error('Error al procesar el webhook de Mercado Pago:', error);
      res.sendStatus(500); // Responder con 500 si hay un error en el procesamiento
    }
  } else {
    // Manejar otros tipos de notificaciones si es necesario (ej: 'merchant_order')
    console.log(`Tipo de webhook no manejado: ${topic}`);
    res.sendStatus(200); // Responder 200 para tipos no manejados para evitar reintentos innecesarios
  }
});


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor de backend ejecutándose en http://localhost:${PORT}`);
  console.log(`FRONTEND_URL: ${MERCADOPAGO_FRONTEND_REDIRECT_URL}`);
  console.log(`BACKEND_URL (para webhooks): ${BACKEND_PUBLIC_URL}`);
});
