# JR Consulting — Salones de Belleza

PWA (Progressive Web App) para la administración de citas, productos y gastos de salones de belleza.

## Funcionalidades

- **Autenticación por PIN** — Cada salón tiene su propio PIN de 6 dígitos con sesión de 8 horas
- **Registrar Citas** — Flujo de hasta 7 pasos:
  1. Nombre de la clienta
  2. Selección múltiple de servicios (opcional si solo llevó producto)
  3. Selección múltiple de productos (opcional; debe haber al menos un servicio o producto)
  4. Precio individual por cada servicio/producto
  5. Comisiones: elegir trabajadora y escribir el % de cada servicio/producto (opcional, se salta si no hay trabajadoras configuradas)
  6. Método de pago (Efectivo, Tarjeta, Transferencia)
  7. Confirmación con desglose, comisiones y total automático
- **Comisiones** — Al registrar la cita eliges la trabajadora y escribes el % por cada servicio/producto; la app calcula el monto. Se registran en hoja separada "Comisiones" para fácil reporteo
- **Registrar Gastos** — Registro de gastos operativos del salón
- **Ver Registros del Día** — Resumen de ingresos vs gastos con desglose detallado
- **Eliminar Registros** — Eliminar citas o gastos con confirmación
- **Configuración** — Administrar catálogo de servicios, productos y trabajadoras con porcentajes de comisión
- **PWA** — Instalable en celular, funciona offline para assets estáticos

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vanilla JavaScript (ES6 Modules) |
| Estilos | CSS3 con Custom Properties |
| Backend | Vercel Serverless Functions (Node.js) |
| Base de datos | Google Sheets API v4 |
| Autenticación | PIN + localStorage (8h) |
| PWA | Service Worker + Web App Manifest |

## Estructura del Proyecto

```
├── api/                    # Serverless functions (Vercel)
│   ├── citas.js            # GET/POST/DELETE citas
│   ├── config.js           # GET/POST configuración
│   ├── gastos.js           # GET/POST/DELETE gastos
│   ├── login.js            # POST autenticación por PIN
│   └── salones.js          # GET lista de salones
├── lib/
│   └── sheets.js           # Cliente Google Sheets API
├── public/                 # Archivos estáticos
│   ├── index.html          # Entry point
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker
│   ├── css/
│   │   └── styles.css      # Design system completo
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── js/
│       ├── app.js          # Router SPA (hash-based)
│       ├── api.js          # Cliente HTTP
│       ├── auth.js         # Manejo de sesión
│       ├── utils.js        # Utilidades compartidas
│       └── views/
│           ├── login.js    # Pantalla de login
│           ├── home.js     # Menú principal
│           ├── cita.js     # Flujo registrar cita
│           ├── gasto.js    # Flujo registrar gasto
│           ├── registros.js # Ver registros del día
│           └── config.js   # Configuración de servicios/productos
├── package.json
├── vercel.json             # Configuración de Vercel
└── .env.example            # Variables de entorno requeridas
```

## Google Sheets — Estructura

### Hoja Maestra (MASTER_SHEET_ID)
| Columna | Campo |
|---------|-------|
| A | salon_id |
| B | salon_nombre |
| C | sheet_id |

### Hoja "Config" (por salón)
| Columna | Campo |
|---------|-------|
| A | salon_nombre |
| B | logo_url |
| C | pin_hash |
| D | servicios (JSON array) |
| E | productos (JSON array) |
| F | trabajadoras (JSON array) |

**Formato de trabajadoras:**
```json
[
  {"nombre": "Ana"}
]
```
El porcentaje de comisión ya no se guarda por trabajadora; se escribe por item
al registrar cada cita. (Se siguen leyendo salones con el formato viejo
`{"nombre":"Ana","pct_servicio":10,"pct_producto":5}` sin problema.)

### Hoja "Citas" (por salón)
| Columna | Campo |
|---------|-------|
| A | fecha |
| B | timestamp |
| C | clienta |
| D | items (JSON array) |
| E | total |
| F | metodo_pago |

**Formato de items:**
```json
[
  {"tipo": "servicio", "nombre": "Corte", "costo": 200},
  {"tipo": "producto", "nombre": "Shampoo", "costo": 150}
]
```

### Hoja "Comisiones" (por salón)
| Columna | Campo |
|---------|-------|
| A | fecha |
| B | timestamp |
| C | clienta |
| D | trabajadora |
| E | item |
| F | tipo |
| G | costo |
| H | pct |
| I | comision |

### Hoja "Gastos" (por salón)
| Columna | Campo |
|---------|-------|
| A | fecha |
| B | timestamp |
| C | descripcion |
| D | monto |
| E | metodo_pago |

## Crear un nuevo salón

La app **no** tiene una pantalla para dar de alta salones ni para asignar PINs
(eso se hace directamente en Google Sheets). Para simplificarlo hay un script:

```bash
# Salón nuevo con catálogo vacío, sin PIN
npm run crear-salon -- --nombre "Testing"

# Salón con PIN listo para entrar
npm run crear-salon -- --nombre "Testing" --pin 123456

# Salón que copia servicios/productos/trabajadoras de un salón existente
npm run crear-salon -- --nombre "Testing" --pin 123456 --plantilla salon_001

# Además compartirlo con tu cuenta de Google para verlo en tu Drive
npm run crear-salon -- --nombre "Testing" --pin 123456 --plantilla salon_001 --compartir tucorreo@gmail.com
```

El script:
1. Crea un Google Sheet con las hojas `Config`, `Citas`, `Comisiones` y `Gastos` (con sus encabezados).
2. Rellena `Config` con el nombre, el PIN (hasheado con SHA-256, igual que el frontend) y los catálogos.
3. Lo registra en la hoja maestra (`Salones`) con el siguiente `salon_id` disponible.

Requiere las mismas variables de entorno que la app (ver abajo). El PIN se puede
cambiar después volviendo a correr el script o editando la celda `Config!C2`
con el hash SHA-256 del nuevo PIN.

## Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-service-account@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
MASTER_SHEET_ID=1ABC...
```

### Requisitos

- Node.js >= 18.0.0
- Cuenta de Google Cloud con Sheets API habilitada
- Service Account con acceso a los spreadsheets
- Cuenta de Vercel para deploy

### Desarrollo Local

```bash
npm install
npm run dev
```

### Deploy

El proyecto se despliega automáticamente en Vercel. Asegúrate de configurar las variables de entorno en el dashboard de Vercel.

## Licencia

Proyecto privado — JR Consulting.
