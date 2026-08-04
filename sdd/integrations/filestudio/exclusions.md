# Exclusiones — fuera del alcance de la integración

## yt-dlp / descarga de contenido de terceros

FileStudio incluye yt-dlp entre sus motores Desktop. **La descarga de contenido
de terceros (YouTube u otras plataformas) NO forma parte de la integración
Talent ↔ FileStudio**, en ninguno de los tres modos de procesamiento.

Consecuencias:

- Ninguna operación del contrato (`api-flow.md`) invoca capacidades de
  descarga de contenido externo.
- Ninguna cadena de UI, copy, mensaje de error ni documentación de producto de
  Talent menciona descarga de vídeo/audio de plataformas de terceros.
- El audio/vídeo ligero delegado a FileStudio (`overview.md`) se limita a
  material que el usuario ya posee y sube a Talent (cursos): extracción de
  audio, normalización, recorte y thumbnails vía FFmpeg.

Motivo: riesgo legal (términos de servicio de plataformas, derechos de autor)
y de marca. Si en el futuro se reconsidera, requiere decisión explícita del
dueño del producto y revisión legal previa — nunca se habilita por defecto.
