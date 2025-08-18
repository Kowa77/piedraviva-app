import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import dotenv from 'dotenv';
import path from 'path'; // Necesitamos el módulo 'path' para resolver rutas de archivos
import { fileURLToPath } from 'url'; // Para obtener __dirname en módulos ES
import fs from 'fs'; // <-- ¡NUEVA IMPORTACIÓN! Módulo para trabajar con el sistema de archivos

// Importa las funciones modulares de Firebase Admin SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Obtener __dirname para módulos ES (necesario para path.resolve)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware para habilitar CORS (Cross-Origin Resource Sharing)
app.use(cors());
// Middleware para parsear el cuerpo de las solicitudes como JSON
app.use(express.json());

// --- Inicialización de Firebase Admin SDK ---
let authAdmin;
let db; // Variable para la instancia de Realtime Database
try {
  // 1. OBTENER LA CLAVE DEL ENTORNO
  const serviceAccountKeyString  = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKeyString ) {
        const serviceAccount = JSON.parse(serviceAccountKeyString);
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase Admin SDK inicializado con la clave de entorno.');

  }else {
     const serviceAccountFileName = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
    if (!serviceAccountFileName) {
      throw new Error('No se especificó un nombre de archivo para la clave de servicio en el .env');
    }
    const serviceAccountPath = path.resolve(__dirname, serviceAccountFileName);
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
    console.log('Firebase Admin SDK inicializado desde el archivo de clave.');
  }
  // Asignar las instancias de Firebase a las variables globales
  authAdmin = getAuth();
  db = getDatabase();


} catch (error) {
  console.error('Error al inicializar Firebase Admin SDK:', error);
  // No inicializar authAdmin y db para evitar errores posteriores
}


// --- Configuración de Mercado Pago ---
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Ruta para crear una preferencia de pago en Mercado Pago
app.post('/create_preference', async (req, res) => {
  try {
    const { items: cartItems, userId } = req.body; // userId es el UID del usuario logueado en Firebase Auth

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: 'El carrito de compras está vacío o no tiene el formato correcto.' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'Se requiere un ID de usuario para crear la preferencia.' });
    }

    // Mapeo de ítems del formato frontend al formato de Mercado Pago
    const formattedItems = cartItems.map(item => ({
      title: item.nombre, // Usar 'nombre' de tu modelo Product
      quantity: Number(item.cantidad),
      unit_price: Number(item.precio),
      currency_id: "UYU", // Moneda uruguaya
      picture_url: item.imagenUrl // URL de la imagen del producto
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
        success: `${process.env.FRONTEND_URL}/purchase-success`,
        failure: `${process.env.FRONTEND_URL}/purchase-failure`,
        pending: `${process.env.FRONTEND_URL}/purchase-pending`
      },
      auto_return: "approved", // Redirigir automáticamente si el pago es aprobado
      external_reference: userId, // Aquí guardamos el userId para recuperarlo en el webhook
      // URL a la que Mercado Pago enviará las notificaciones de eventos de pago (IPN)
      notification_url: `${process.env.BACKEND_URL}/webhook/mercadopago`, // Asegúrate que BACKEND_URL esté definido
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
  console.log('Query Params:', req.query);
  console.log('Body (puede estar vacío para IPN):', req.body);

  const { topic, id } = req.query;

  if (topic === 'payment') {
    try {
      const paymentInstance = new Payment(client);
      const paymentDetails = await paymentInstance.get({ id: id });

      console.log('Detalles del Pago Obtenidos:', paymentDetails);

      if (paymentDetails.status === 'approved') {
        const userId = paymentDetails.external_reference; // Recuperar el userId

        // Estructura de la compra a guardar en Realtime Database
        const purchaseData = {
          paymentId: paymentDetails.id,
          userId: userId,
          items: paymentDetails.additional_info.items, // Los ítems asociados al pago
          transactionAmount: paymentDetails.transaction_amount,
          status: paymentDetails.status,
          dateCreated: paymentDetails.date_created,
          dateApproved: paymentDetails.date_approved,
          preferenceId: paymentDetails.preference_id,
        };

        // Ruta de Realtime Database para guardar compras de usuarios:
        // /purchases/{userId}/{unique_purchase_id}
        await db.ref(`purchases/${userId}`).push(purchaseData);
        console.log(`Compra ${paymentDetails.id} guardada para el usuario ${userId} en Realtime Database.`);
      } else {
        console.log(`El pago ${paymentDetails.id} tiene estado ${paymentDetails.status}, no se guarda en el historial de compras.`);
      }
      res.sendStatus(200); // CRÍTICO responder con 200 OK para que Mercado Pago no reintente
    } catch (error) {
      console.error('Error al procesar el webhook de Mercado Pago:', error);
      res.sendStatus(500); // Responder con 500 si hay un error en el procesamiento
    }
  } else {
    console.log(`Tipo de webhook no manejado: ${topic}`);
    res.sendStatus(200);
  }
});

// Ruta para crear un token de autenticación de Firebase personalizado
app.post('/create-custom-token', async (req, res) => {
  const { uid } = req.body;

  if (!uid) {
    return res.status(400).json({ error: 'UID de usuario requerido.' });
  }

  try {
    if (!authAdmin) {
      throw new Error('Firebase Auth Admin no está inicializado.');
    }
    const customToken = await authAdmin.createCustomToken(uid);
    res.json({ customToken });
  } catch (error) {
    console.error('Error al crear el token personalizado de Firebase:', error);
    res.status(500).json({ error: 'Error al crear el token de autenticación.' });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`Servidor de backend ejecutándose en http://localhost:${PORT}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  console.log(`BACKEND_URL (para webhooks): ${process.env.BACKEND_URL}`);
});
