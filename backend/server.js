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
const WEBHOOK_URL = process.env.MERCADOPAGO_WEBHOOK_URL;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

if (!MERCADOPAGO_ACCESS_TOKEN || !WEBHOOK_URL) {
  console.error('ERROR: No se encontraron las variables de entorno MERCADOPAGO_ACCESS_TOKEN o MERCADOPAGO_WEBHOOK_URL.');
  // Dependiendo del entorno, podrías querer terminar la aplicación aquí
}

const client = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000, idempotencyKey: 'abc' }
});

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({
  origin: FRONTEND_URL, // Permite solo solicitudes desde tu frontend de Angular
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Middleware para parsear JSON en el cuerpo de las solicitudes

// --- @NUEVO ENDPOINT: Para crear la preferencia de pago ---
app.post('/create_preference', async (req, res) => {
  try {
    const { items, userId } = req.body;
    console.log(`Solicitud de preferencia recibida para el usuario: ${userId}`);

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El carrito de compras está vacío.' });
    }

    // Valida los datos recibidos del frontend
    const validatedItems = items.map(item => {
        if (!item.title || !item.quantity || !item.unit_price) {
            throw new Error('Datos del ítem inválidos.');
        }
        return {
            title: item.title,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
        };
    });

    const body = {
      items: validatedItems,
      back_urls: {
        success: `${FRONTEND_URL}/success`,
        failure: `${FRONTEND_URL}/failure`,
        pending: `${FRONTEND_URL}/pending`
      },
      notification_url: WEBHOOK_URL,
      // Guarda el userId en los metadatos para recuperarlo en el webhook
      metadata: { userId: userId },
      external_reference: userId, // También se puede usar external_reference
      auto_return: "approved",
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });
    console.log(`Preferencia creada con éxito: ${result.id}`);

    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error('Error al crear la preferencia de Mercado Pago:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear la preferencia.' });
  }
});

// --- @NUEVO ENDPOINT: Para recibir las notificaciones de pago (webhook) ---
app.post('/webhook', async (req, res) => {
  const { topic, id } = req.query; // 'id' es el ID de la notificación

  // Se verifica que sea una notificación de pago
  if (topic === 'payment') {
    try {
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id });

      // Verificar que el pago fue aprobado
      if (paymentDetails.status === 'approved') {
        const userId = paymentDetails.metadata.userId || paymentDetails.external_reference;
        console.log(`Webhook recibido: Pago ${paymentDetails.id} aprobado para el usuario ${userId}`);

        // --- Guardar la compra en Firestore ---
        const purchaseData = {
          purchaseId: paymentDetails.id,
          userId: userId,
          items: paymentDetails.additional_info.items,
          total: paymentDetails.transaction_amount,
          timestamp: new Date().toISOString(),
          paymentStatus: paymentDetails.status,
        };

        const docRef = dbFirestore.collection('artifacts').doc('piedraviva').collection('users').doc(userId).collection('purchaseHistory').doc(paymentDetails.id);
        await docRef.set(purchaseData);
        console.log(`Compra ${paymentDetails.id} guardada para el usuario ${userId} en Firestore.`);

        // --- Vaciar el carrito del usuario en Realtime Database ---
        const cartRef = dbRealtime.ref(`carts/${userId}/items`);
        await cartRef.remove();
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
  console.log(`URL del webhook configurada: ${WEBHOOK_URL}`);
});
