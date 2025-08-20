// backend/server.js
import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import dotenv from 'dotenv';

dotenv.config();

// --- Inicialización de Firebase Admin SDK ---
try {
  console.log('INFO: Intentando inicializar Firebase Admin SDK...');
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log('INFO: Firebase Admin SDK inicializado correctamente.');
} catch (error) {
  console.error('ERROR: Fallo al inicializar Firebase Admin SDK.', error);
  // Aquí puedes agregar un log más detallado si la variable de entorno está mal
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error('ERROR: La variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY no está definida.');
  }
  if (!process.env.FIREBASE_DATABASE_URL) {
    console.error('ERROR: La variable de entorno FIREBASE_DATABASE_URL no está definida.');
  }
}

const dbFirestore = getFirestore();
const dbRealtime = getDatabase();

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const WEBHOOK_URL = process.env.MERCADOPAGO_WEBHOOK_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

if (!MERCADOPAGO_ACCESS_TOKEN) {
  console.error('ERROR: La variable MERCADOPAGO_ACCESS_TOKEN no se encontró.');
}
if (!WEBHOOK_URL) {
  console.error('ERROR: La variable MERCADOPAGO_WEBHOOK_URL no se encontró.');
}

const client = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000, idempotencyKey: 'abc' }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: FRONTEND_URL, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

// --- ENDPOINT: Para crear la preferencia de pago ---
app.post('/create_preference', async (req, res) => {
  console.log('INFO: Solicitud recibida en /create_preference');
  try {
    const { items, userId } = req.body;
    console.log(`INFO: Items a procesar: ${JSON.stringify(items)}`);
    console.log(`INFO: userId del cliente: ${userId}`);

    if (!items || items.length === 0) {
      console.warn('WARN: Carrito de compras vacío. Respondiendo con 400.');
      return res.status(400).json({ error: 'El carrito de compras está vacío.' });
    }

    const preference = new Preference(client);
    const result = await preference.create({ body: { items: items.map(item => ({ title: item.title, quantity: Number(item.quantity), unit_price: Number(item.unit_price) })), back_urls: { success: `${FRONTEND_URL}/success`, failure: `${FRONTEND_URL}/failure`, pending: `${FRONTEND_URL}/pending` }, notification_url: WEBHOOK_URL, metadata: { userId }, external_reference: userId, auto_return: "approved" } });

    console.log(`SUCCESS: Preferencia de Mercado Pago creada. ID: ${result.id}`);
    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error('ERROR: Fallo al crear la preferencia de Mercado Pago.', error);
    res.status(500).json({ error: 'Error interno del servidor al crear la preferencia.' });
  }
});

// --- ENDPOINT: Para recibir las notificaciones de pago (webhook) ---
app.post('/webhook', async (req, res) => {
  const { topic, id } = req.query;
  console.log(`INFO: Webhook recibido. Tópico: ${topic}, ID de notificación: ${id}`);

  if (topic === 'payment') {
    try {
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id });
      console.log(`INFO: Detalles del pago obtenidos. Estado: ${paymentDetails.status}, ID de pago: ${paymentDetails.id}`);

      if (paymentDetails.status === 'approved') {
        const userId = paymentDetails.metadata.userId || paymentDetails.external_reference;
        console.log(`SUCCESS: Pago aprobado para el usuario ${userId}. Guardando compra y vaciando carrito.`);

        // --- Guardar la compra en Firestore ---
        try {
          const docRef = dbFirestore.collection('artifacts').doc('piedraviva').collection('users').doc(userId).collection('purchaseHistory').doc(paymentDetails.id);
          await docRef.set({ /* ... purchaseData ... */ });
          console.log(`SUCCESS: Compra ${paymentDetails.id} guardada en Firestore.`);
        } catch (firestoreError) {
          console.error('ERROR: Fallo al guardar en Firestore.', firestoreError);
        }

        // --- Vaciar el carrito en Realtime Database ---
        try {
          const cartRef = dbRealtime.ref(`carts/${userId}/items`);
          await cartRef.remove();
          console.log(`SUCCESS: Carrito del usuario ${userId} vaciado en Realtime Database.`);
        } catch (rtdbError) {
          console.error('ERROR: Fallo al vaciar el carrito en Realtime Database.', rtdbError);
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
});
