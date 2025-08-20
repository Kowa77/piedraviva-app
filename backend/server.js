// backend/server.js
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Inicialización de Firebase Admin SDK ---
let db;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  db = getDatabase();
  console.log('INFO: Firebase Admin SDK y Realtime Database inicializados correctamente.');
} catch (error) {
  console.error('ERROR: Fallo al inicializar Firebase Admin SDK.', error);
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error('ERROR: La variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY no está definida.');
  }
}

// --- Configuración de Mercado Pago y URLs ---
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.MERCADOPAGO_WEBHOOK_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!MERCADOPAGO_ACCESS_TOKEN || !WEBHOOK_URL || !FRONTEND_URL) {
  console.error('ERROR: Faltan variables de entorno cruciales (MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_URL, FRONTEND_URL).');
}

const client = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

// Configuración de CORS y JSON middleware
app.use(cors());
app.use(express.json());

// A simple GET endpoint to confirm the server is running
app.get('/', (req, res) => {
  res.status(200).send('Mercado Pago Backend is running!');
});

// --- ENDPOINT: Para crear la preferencia de pago ---
app.post('/create_preference', async (req, res) => {
  console.log('INFO: Solicitud recibida en /create_preference');
  try {
    const { items: cartItems, userId } = req.body;

    // Validaciones
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'El carrito de compras está vacío o no tiene el formato correcto.' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere un ID de usuario para crear la preferencia.' });
    }

    const formattedItems = cartItems.map(item => ({
      title: item.nombre,
      quantity: Number(item.cantidad),
      unit_price: Number(item.precio),
      currency_id: "UYU",
    }));

    const body = {
      items: formattedItems,
      back_urls: {
        success: `${FRONTEND_URL}/purchase-success`,
        failure: `${FRONTEND_URL}/purchase-failure`,
        pending: `${FRONTEND_URL}/purchase-pending`
      },
      auto_return: "approved",
      external_reference: userId,
      notification_url: `${WEBHOOK_URL}/webhook/mercadopago`,
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    console.log(`SUCCESS: Preferencia de Mercado Pago creada. ID: ${result.id}`);
    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error('ERROR: Fallo al crear la preferencia de Mercado Pago.', error);
    res.status(500).json({ error: 'Error interno del servidor al crear la preferencia.' });
  }
});

// --- ENDPOINT: Para recibir las notificaciones de pago (webhook) ---
app.post('/webhook/mercadopago', async (req, res) => {
  const { topic, id } = req.query;
  console.log(`INFO: Webhook recibido. Tópico: ${topic}, ID de notificación: ${id}`);

  if (topic === 'payment') {
    try {
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id });
      console.log(`INFO: Detalles del pago obtenidos. Estado: ${paymentDetails.status}, ID de pago: ${paymentDetails.id}`);

      if (paymentDetails.status === 'approved') {
        const userId = paymentDetails.external_reference;
        console.log(`SUCCESS: Pago aprobado para el usuario ${userId}. Guardando compra.`);

        // --- Guardar la compra en Realtime Database ---
        const purchaseData = {
          paymentId: paymentDetails.id,
          userId: userId,
          transactionAmount: paymentDetails.transaction_amount,
          status: paymentDetails.status,
          dateApproved: new Date(paymentDetails.date_approved).toISOString(),
          items: paymentDetails.additional_info.items || []
        };

        try {
          // El método .push() crea una nueva entrada con un ID único
          await db.ref(`purchases/${userId}`).push(purchaseData);
          console.log(`SUCCESS: Compra ${paymentDetails.id} guardada en Realtime Database.`);

          // --- Opcional: Vaciar el carrito en Realtime Database ---
          await db.ref(`carts/${userId}/items`).remove();
          console.log(`SUCCESS: Carrito del usuario ${userId} vaciado.`);
        } catch (rtdbError) {
          console.error('ERROR: Fallo al guardar en Realtime Database o vaciar el carrito.', rtdbError);
        }
      } else {
        console.log(`INFO: Pago no aprobado. Estado: ${paymentDetails.status}. No se realizarán acciones.`);
      }
      res.sendStatus(200);
    } catch (error) {
      console.error('ERROR: Fallo al procesar el webhook.', error);
      res.sendStatus(500);
    }
  } else {
    console.log(`INFO: Webhook de tipo ${topic} ignorado.`);
    res.sendStatus(200);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de backend ejecutándose en http://localhost:${PORT}`);
  console.log(`URL del webhook configurada: ${WEBHOOK_URL}`);
});
