        /****************************************************************************************************
         * Este archivo incluye polyfills necesarios para Angular y se carga antes de la aplicación.
         * Puedes añadir tus propios polyfills adicionales a este archivo.
         *
         * Este archivo se divide en 2 secciones:
         * 1. Polyfills del navegador. Son requeridos por Angular para ejecutarse en el navegador.
         * 2. Polyfills específicos de la aplicación. Son opcionales y pueden eliminarse.
         *
         * Consulta https://angular.io/guide/browser-support para más información.
         ***************************************************************************************************/

        /****************************************************************************************************
         * POLYFILLS DEL NAVEGADOR
         ***************************************************************************************************/

        /**
         * Web Animations `@angular/platform-browser/animations`
         * Requerido para el soporte de animaciones en Angular.
         */
        // import 'web-animations-js';  // Ejecuta `npm install --save web-animations-js`.

        /**
         * Por defecto, Angular CLI incluye un polyfill para la librería `zone.js` que proporciona
         * APIs conscientes de la zona para la detección de cambios. Si estás usando `@angular/compiler-cli` con
         * `strictTemplates` habilitado, o si estás experimentando problemas con la detección de cambios,
         * asegúrate de que `zone.js` esté importado.
         *
         * Si quieres deshabilitarlo, comenta esta línea:
         */
        import 'zone.js';  // Incluido con Angular CLI.

        /****************************************************************************************************
         * IMPORTACIONES DE LA APLICACIÓN
         ***************************************************************************************************/

        // Añade aquí tus polyfills personalizados.
        // Por ejemplo, para polyfill `Object.assign` para IE:
        // import 'core-js/es/object/assign';
