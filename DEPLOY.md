Despliegue en Render — Guía rápida

Resumen
- Este repo contiene una API en `api/` (Express + Firebase Admin) y un frontend Expo Web.
- `render.yaml` ya está configurado para crear dos servicios en Render: `habituate-api` y `habituate-web`.

Antes de empezar
1. Asegúrate de tener el código commiteado y subido a GitHub (o Git provider soportado por Render).
2. Revisa `api/.env.example` para ver las variables necesarias (credenciales de Firebase).

Pasos para desplegar

1) Push del repo a GitHub

```bash
git add .
git commit -m "Prepare render deployment"
# Crea y sube la rama de trabajo `Funcionalidades` (no uses `main`)
git checkout -b Funcionalidades
git push -u origin Funcionalidades
```

2) Conectar repo a Render
- Ve a https://dashboard.render.com y crea cuenta/ingresa.
- Haz click en "New +" → "Import from Git" → conecta tu cuenta de GitHub y selecciona el repo.
- En el paso de import, Render detectará `render.yaml` y propondrá crear los servicios descritos.

3) Configurar variables de entorno para `habituate-api`
- En Render → Services → `habituate-api` → Environment → Environment Variables, añade:
  - Opción A (recomendada): `FIREBASE_SERVICE_ACCOUNT_KEY` con el JSON del service account (reemplaza saltos de línea por `\n` o usa `base64:` prefijo).
  - Opción B: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (pega `private_key` con saltos de línea escapados: `\\n`).
  - `NODE_ENV=production` (opcional)
  - `PORT` si quieres forzar puerto (Render gestionará puerto internamente normalmente).
  - `CORS_ORIGINS` si quieres restringir los orígenes.

Formato recomendado para `FIREBASE_SERVICE_ACCOUNT_KEY`:
- Copia el JSON del service account y reemplaza los saltos de línea en `private_key` por `\\n`, por ejemplo:
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvg...\\n-----END PRIVATE KEY-----\\n"
- Alternativamente, guarda el JSON en base64 y pega `base64:<contenido_base64>`.

4) Despliegue
- Tras configurar las vars, inicia un deploy manual o haz otro push para que Render construya los servicios.
- Frontend ejecutará `npm run build:web` y publicará la carpeta `web-build`.
- API usará `npm start` dentro de `api/`.

5) Verificar
- Frontend: visita la URL pública del servicio `habituate-web`.
- API: visita `https://<habituate-api>.onrender.com/health` para comprobar estado.
- Revisa logs en Render si hay fallos.

Pruebas locales rápidas

1) Construir frontend web:
```bash
npm install
npm run build:web
# Resultado en `web-build`
```
2) Servir estático localmente:
```bash
npx serve web-build
# visitar http://localhost:3000
```
3) Ejecutar API en local:
```bash
npm --prefix api install
npm --prefix api run dev
# o
npm run api:dev
```

Deploy con EAS (opción de tu compañero)
--------------------------------------
Si prefieres usar EAS para desplegar la versión web, el flujo recomendado es:

- Exportar la app web con Expo:

```bash
npx expo export --platform web
```

- Desplegar con EAS:

```bash
npx eas-cli deploy --prod --non-interactive
```

Requisitos y secretos:
- Necesitas un `EXPO_TOKEN` (Access Token) generado desde tu cuenta en https://expo.dev → Account → Access Tokens.
- Guarda `EXPO_TOKEN` como secret en GitHub (Settings → Secrets → Actions).

El repositorio ya incluye un workflow `.github/workflows/eas-deploy.yml` que:
- Ejecuta `npx expo export --platform web` y luego `npx eas-cli deploy --prod` al hacer push a `Funcionalidades`.

Generar QR localmente
---------------------
Si quieres generar el QR de forma local (sin CI), ejecuta:

```bash
node ./scripts/generate-qr.js "https://tu-servicio.onrender.com"
```
El PNG se escribirá en `artifacts/qr.png`.

Automatizar los pasos 3 y 4 con la API de Render
-----------------------------------------------
El repo incluye `scripts/render-api-deploy.js` para configurar variables de entorno y disparar deploys desde tu terminal.

Ejemplo usando variables de entorno:
```powershell
$env:RENDER_API_KEY = 'tu_api_key'
$env:RENDER_SERVICE_ID_API = 'service_id_api'
$env:RENDER_SERVICE_ID_WEB = 'service_id_web'
$env:FIREBASE_SERVICE_ACCOUNT_KEY = '...json o base64...'
$env:RENDER_WEB_URL = 'https://tu-servicio.onrender.com'
node ./scripts/render-api-deploy.js
```

O con campos separados de Firebase:
```powershell
$env:RENDER_API_KEY = 'tu_api_key'
$env:RENDER_SERVICE_ID_API = 'service_id_api'
$env:RENDER_SERVICE_ID_WEB = 'service_id_web'
$env:FIREBASE_PROJECT_ID = 'tu-project-id'
$env:FIREBASE_CLIENT_EMAIL = 'service-account@tu-project-id.iam.gserviceaccount.com'
$env:FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
node ./scripts/render-api-deploy.js
```

Este script:
- Crea/actualiza las variables de entorno del servicio API en Render.
- Lanza deploy del API y del frontend.
- Genera `artifacts/qr.png` si pasas `RENDER_WEB_URL`.

Mostrar QR persistente al arrancar `npm start`
------------------------------------------------
Si quieres que al ejecutar `npm start` se muestre un QR persistente que apunte a la URL pública del hosting, exporta la variable `RENDER_WEB_URL` antes de iniciar. Ejemplos:

PowerShell (Windows):
```powershell
$env:RENDER_WEB_URL = 'https://mi-servicio.onrender.com'
npm start
```

CMD (Windows):
```cmd
set RENDER_WEB_URL=https://mi-servicio.onrender.com
npm start
```

macOS / Linux:
```bash
export RENDER_WEB_URL=https://mi-servicio.onrender.com
npm start
```

El script imprimirá un QR en la terminal apuntando a la URL pública y después arrancará `expo start`.

Cómo crear `EXPO_TOKEN` (CLI):
```bash
# Inicia sesión localmente
npx expo login
# Crea un token (si tu CLI lo soporta) o cópialo desde https://expo.dev/account/tokens
npx expo token:create
```

O crea y copia el token desde la interfaz web en https://expo.dev/account/tokens y pégalo en GitHub Secrets.

Problemas comunes
- `FIREBASE_PRIVATE_KEY` mal formateada: usa `replace(/\\n/g, '\\n')` o pega con `\\n` en las variables de Render.
- `expo build:web` genera otra carpeta: actualiza `render.yaml`'s `publishDir` al directorio correcto.
- Errores de permisos de Firebase: asegúrate de que la cuenta de servicio tenga acceso a Firestore.

¿Quieres que haga alguno de estos pasos por ti? Para continuar puedo:
- Crear el deploy en Render automáticamente (necesito acceso a tu cuenta Render/GitHub).
- Preparar un GitHub Action para desplegar (requiere token Render).
- O guiarte en cada paso mientras lo haces (paso a paso interactivo). 

CI/CD con GitHub Actions (opcional, recomendado)
-------------------------------------------------
He añadido un workflow de GitHub Actions en `.github/workflows/render-deploy.yml` que:
 - Ejecuta `npm run build:web` en la rama `Funcionalidades`.
- Llama a la API de Render para desencadenar deploys de los servicios `habituate-api` y `habituate-web`.

Para que funcione, añade estos secrets en tu repo GitHub (Settings → Secrets → Actions):
- `RENDER_API_KEY` — tu API Key de Render (crear en Render dashboard → Account → API Keys).
- `RENDER_SERVICE_ID_API` — Service ID del servicio `habituate-api` (ver Render service settings → General).
- `RENDER_SERVICE_ID_WEB` — Service ID del servicio `habituate-web`.

Opcional (para generar QR automáticamente):
- `RENDER_WEB_URL` — la URL pública de tu servicio web en Render (ej: https://mi-servicio.onrender.com). Si la configuras, el workflow generará un `qr.png` y lo subirá como artifact.

Con esos secrets el workflow se encargará de compilar y pedir a Render que despliegue automáticamente en cada push a `Funcionalidades`.
