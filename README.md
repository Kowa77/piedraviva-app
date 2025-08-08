🍕 Menú Piedraviva
¡Bienvenido al proyecto Menú Piedraviva! Esta es una aplicación web de Angular para un menú de pizzas, que permite a los usuarios ver las pizzas disponibles, gestionar un carrito de compras y registrar sus pedidos, todo con el respaldo de Firebase como backend.

🚀 ¡Comencemos!
Sigue estos pasos para tener la aplicación funcionando en tu entorno local.

Paso 1: Requisitos Previos
Antes de empezar, asegúrate de tener instalado lo siguiente:

Node.js & npm:

Descarga e instala la última versión LTS desde nodejs.org.

Verifica la instalación abriendo tu terminal y ejecutando:

node -v
npm -v

Angular CLI:

Una vez que tengas npm, instala Angular CLI globalmente:

npm install -g @angular/cli

Verifica la instalación:

ng v

Paso 2: Clonar el Repositorio
Abre tu terminal y clona el proyecto desde GitHub:

git clone https://github.com/Kowa77/piedraviva-app.git
cd piedraviva-app

Paso 3: Instalar Dependencias del Proyecto
Dentro de la carpeta del proyecto, instala todas las dependencias necesarias:

npm install

Paso 4: Configurar Firebase
Tu aplicación utiliza Firebase Realtime Database y Firebase Authentication para la gestión de datos y usuarios. Necesitarás crear un proyecto de Firebase y obtener tus credenciales.

4.1. Crear un Proyecto Firebase ➕
Ve a la Consola de Firebase.

Haz clic en "Agregar proyecto" y sigue los pasos para crear uno nuevo.

Una vez creado, haz clic en "Agregar una aplicación" y selecciona el icono de "Web" (</>).

Registra la aplicación y copia el objeto firebaseConfig. Lo necesitarás en el siguiente paso.

4.2. Habilitar Servicios Firebase ✅
En tu proyecto de Firebase, habilita los siguientes servicios:

Realtime Database:

En el menú de la izquierda, ve a "Build" > "Realtime Database".

Haz clic en "Crear base de datos".

Selecciona una ubicación de servidor cercana a tus usuarios.

Selecciona "Comenzar en modo de prueba" (para desarrollo) o "Comenzar en modo bloqueado" (y luego configura las reglas).

Authentication:

En el menú de la izquierda, ve a "Build" > "Authentication".

Haz clic en "Comenzar".

Ve a la pestaña "Método de inicio de sesión".

Habilita el método "Correo electrónico/Contraseña" y haz clic en "Guardar".

4.3. Configurar Reglas de Seguridad de Realtime Database 🛡️
Para que tu aplicación pueda leer y escribir datos, necesitas configurar las reglas de seguridad de tu Realtime Database.

En la consola de Firebase, ve a "Build" > "Realtime Database".

Haz clic en la pestaña "Reglas".

Reemplaza las reglas existentes con las siguientes para permitir el acceso a usuarios autenticados:

{
  "rules": {
    "pizzas": {
      ".read": true,
      ".write": false
    },
    "carts": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    },
    "purchases": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    },
    // Opcional: Para otros datos públicos si los hubiera
    ".read": false,
    ".write": false
  }
}

Explicación de las reglas:

pizzas: Cualquiera puede leer (tu menú), pero solo tú (desde la consola o funciones de backend) puedes escribir.
carts/$userId: Solo el usuario autenticado (auth.uid) puede leer y escribir en su propio carrito.
purchases/$userId: Solo el usuario autenticado puede leer y escribir en su propio historial de compras.

Haz clic en "Publicar".

4.4. Actualizar la Configuración Local 📝
Abre el archivo src/environments/environment.ts en tu proyecto.

Reemplaza el objeto firebaseConfig existente con la configuración que copiaste de la Consola de Firebase en el Paso 4.1.

// src/environments/environment.ts
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "TU_AUTH_DOMAIN_AQUI",
    projectId: "TU_PROJECT_ID_AQUI",
    storageBucket: "TU_STORAGE_BUCKET_AQUI",
    messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
    appId: "TU_APP_ID_AQUI",
    measurementId: "TU_MEASUREMENT_ID_AQUI" // Opcional
  }
};

¡Importante! Si tienes un archivo src/environments/environment.prod.ts, asegúrate de actualizarlo también con la misma configuración de Firebase (o una configuración específica para producción si usas un proyecto Firebase diferente para ello), y con production: true.

Paso 5: Ejecutar la Aplicación Angular ▶️
Una vez que todas las dependencias estén instaladas y Firebase esté configurado, puedes iniciar el servidor de desarrollo de Angular:

ng serve --open

Esto compilará tu aplicación y la abrirá automáticamente en tu navegador predeterminado (normalmente http://localhost:4200/).

Paso 6: Despliegue (Opcional) 🌐
Para desplegar tu aplicación en un servicio de alojamiento como Render (que es muy recomendado para sitios estáticos de Angular), considera los siguientes puntos:

Construcción para Producción: Siempre compila tu aplicación para producción antes de desplegar:

ng build --configuration production --base-href /

Esto creará la carpeta dist/piedraviva (o el nombre de tu proyecto) con los archivos optimizados.

Configuración del Hosting: En tu servicio de hosting (ej. Render):

Build Command: npm install && npm run build -- --configuration production --base-href /

Publish Directory: dist/piedraviva

¡Eso es todo! Ahora deberías tener tu aplicación de Menú Piedraviva funcionando localmente y lista para futuras mejoras o despliegues. ¡Disfruta!
