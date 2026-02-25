# JR Consulting — Salones de Belleza

PWA (Progressive Web App) para la administración de citas, productos y gastos de salones de belleza.

## Funcionalidades

- **Autenticación por PIN** — Cada salón tiene su propio PIN de 6 dígitos con sesión de 8 horas
- **Registrar Citas** — Flujo de 6 pasos:
  1. Nombre de la clienta
  2. Selección múltiple de servicios
  3. Selección múltiple de productos (opcional)
  4. Precio individual por cada servicio/producto
  5. Método de pago (Efectivo, Tarjeta, Transferencia)
  6. Confirmación con desglose y total automático
- **Registrar Gastos** — Registro de gastos operativos del salón
- **Ver Registros del Día** — Resumen de ingresos vs gastos con desglose detallado
- **Eliminar Registros** — Eliminar citas o gastos con confirmación
- **Configuración** — Administrar catálogo de servicios y productos
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

### Hoja "Gastos" (por salón)
| Columna | Campo |
|---------|-------|
| A | fecha |
| B | timestamp |
| C | descripcion |
| D | monto |
| E | metodo_pago |

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
