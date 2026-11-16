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

La publicación se automatiza con `.github/workflows/publish-gh-pages-branch.yml`:
cada cambio en `src/` o `index.html` compila la app, pasa las pruebas y
actualiza la rama `gh-pages`. En **Settings → Pages**, configurar
**Deploy from a branch → gh-pages → /(root)**.

## Firma manuscrita guardada
- Abre un PDF y toca **Firmar**.
- Dibuja la firma y marca **Guardar esta firma en este dispositivo**.
- Toca **Usar firma nueva** y luego la página para colocarla.
- En documentos posteriores, pulsa **Firmar → Usar firma guardada**.
- Para retirar la copia local, pulsa **Firmar → Eliminar firma**.

La firma guardada es una imagen local (no un certificado digital), accesible
a quien utilice el mismo navegador/perfil. En equipos compartidos, **no**
activar el guardado. Borrar los datos de Safari/Chrome puede eliminarla.

## Limitaciones

Versión preliminar. No incluye firma digital criptográfica, OCR o edición completa de texto existente, y algunos formularios complejos o PDFs protegidos pueden fallar. La firma manuscrita es una imagen insertada. Probar con documentos ficticios antes de usar archivos laborales confidenciales.

## Ajustar tamaño de firma
- Firma o usa una firma guardada y toca la página para colocarla.
- Toca la firma ya colocada para seleccionarla.
- Usa **Tamaño** (barra deslizante de 8% a 70% del ancho de página), o los botones **−** y **+**.
- Arrastra la firma para moverla. El timestamp permanece junto a ella.
- Guarda o comparte: se exporta la firma en su tamaño ajustado.

El cambio afecta solo esa firma del documento, no la imagen guardada para otros PDFs.
