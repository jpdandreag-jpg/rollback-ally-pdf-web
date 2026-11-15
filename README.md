# Rollback Ally PDF — Web

Aplicación web instalable para abrir, editar, firmar, guardar y compartir PDFs desde iPhone, Android y computadoras.

- **Sin Apple Developer Program ni suscripciones de Adobe** para estas funciones básicas.
- Procesamiento del PDF **en el dispositivo**; no se envían documentos a servidores de la aplicación.
- Biblioteca PDF.js (Apache 2.0) y PDF-lib (MIT).
- Aplicación web pública; no subir documentos privados a este repositorio.

## Instalación

Una vez desplegada y verificada:

[Rollback Ally PDF Web](https://jpdandreag-jpg.github.io/rollback-ally-pdf-web/)

**iPhone:** Safari → Compartir → Añadir a pantalla de inicio → Añadir.

**Android:** Chrome → Menú → Instalar aplicación / Añadir a pantalla principal.

## Compilación local

```sh
npm install
npm test
npm run build
npm run dev
```

La publicación se automatiza con `.github/workflows/deploy-pages.yml`.
En **Settings → Pages** debe elegirse la fuente **GitHub Actions**.

## Limitaciones

Versión preliminar. No incluye firma digital criptográfica, OCR o edición completa de texto existente, y algunos formularios complejos o PDFs protegidos pueden fallar. La firma manuscrita es una imagen insertada. Probar con documentos ficticios antes de usar archivos laborales confidenciales.
