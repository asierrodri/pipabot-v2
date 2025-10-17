# 🤖 PipaBot v2

PipaBot es una aplicación web desarrollada en **Node.js + Express** que integra inteligencia artificial (DeepSeek y Gemini) con control remoto de una **mesa Behringer X32** mediante el protocolo **OSC (Open Sound Control)**.

Este proyecto se desarrolló durante el periodo de prácticas en entorno real, con el objetivo de unificar **asistencia conversacional**, **control técnico** y **gestión de salas y usuarios** en un único sistema completo.

---

## 🚀 Tecnologías principales

- **Backend:** Node.js (Express)
- **Base de datos:** MySQL
- **IA:** DeepSeek API + Google Gemini API
- **Protocolo de comunicación:** OSC (Behringer X32)
- **Frontend:** HTML, CSS y JavaScript puro
- **Autenticación:** express-session + bcrypt
- **Subida de archivos:** multer (en memoria)
- **ReCAPTCHA v3** en el registro de usuarios

---

## 🧩 Funcionalidades principales

### 💬 Chat inteligente
- Comunicación directa con el modelo DeepSeek (modo manual o automático).
- En modo automático, la IA puede **generar comandos OSC** para ejecutar directamente en la mesa.
- En modo manual, responde solo con texto sin ejecutar nada.

### 🎚 Control de mesa Behringer X32
- Envío y lectura de comandos OSC individuales o por lotes.
- Actualización en tiempo real de niveles (meters).
- Gestión por salas: cada sala tiene su propia conexión a la mesa.

### 👥 Usuarios y salas
- Registro con **modo “unirse a sala”** o **“crear nueva sala”**.
- Creación automática de mesa asociada y prompts base al crear una sala nueva.
- Roles: `admin` (gestiona usuarios y prompts) / `user` (acceso al chat).

### 🧠 Prompts configurables
- Sistema de **secciones**: modo, espacio, material, normas y mesa.
- Versionado automático de cada sección (historial de versiones con restauración).
- Integrado con el panel admin.

### 💾 Historial de conversaciones
- Guardado automático de chats.
- Edición y eliminación de historiales.
- Generación automática de títulos usando Gemini.

---

## 🗂 Estructura del proyecto

```bash
pipabot-v2/
│
├── app.js                  # Configuración principal de Express
├── index.js                # Lanzador del servidor
├── .env.example            # Plantilla de variables de entorno
├── package.json
├── pipabot.sql             # Script de creación de la base de datos
│
├── routes/                 # Definición de rutas del backend
│   ├── adminRoutes.js      # Rutas de administración (usuarios, prompts, inventario)
│   ├── authRoutes.js       # Autenticación, registro y gestión de historiales
│   ├── mesaRoutes.js       # Comunicación OSC con la mesa
│   ├── promptRoutes.js     # Rutas de interacción con la IA
│
├── controllers/            # Controladores del backend
│   ├── authController.js
│   ├── promptController.js
│
├── services/               # Servicios auxiliares
│   ├── mesaOSC.js          # Comunicación OSC con la mesa X32
│   ├── deepseekService.js  # Integración con DeepSeek API
│   ├── geminiService.js    # Integración con Gemini API
│   ├── geminiConfig.js     # Configuración de endpoint Gemini
│
├── public/                 # Archivos accesibles desde el navegador
│   ├── index.html, login.html, registro.html, admin.html, controlMesa.html
│   ├── js/ (index.js, login.js, registro.js, prompt.js, admin.js...)
│   └── img/
│
└── utils/
    ├── hash.js             # Utilidad temporal para generar hashes bcrypt
    └── x32-mock.js         # Simulador local de la mesa para pruebas
```
## ⚙️ Instalación y configuración
### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/asierrodri/pipabot-v2.git
cd pipabot-v2
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Crear base de datos
En MySQL:

```sql
CREATE DATABASE pipabot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Luego importar:

```bash
mysql -u root -p pipabot < pipabot.sql
```

### 4️⃣ Configurar variables de entorno
Crea un archivo .env en la raíz del proyecto (no se sube al repo) con tus claves y datos locales:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=pipabot

DEEPSEEK_API_KEY=tu_clave
GEMINI_API_KEY=tu_clave
RECAPTCHA_SECRET_KEY=tu_clave

MESA_IP=192.168.1.100
MESA_PORT=10023
```

O usa el ejemplo:

```bash
cp .env.example .env
```

### 5️⃣ Ejecutar el servidor

```bash
node index.js
```

Por defecto escuchará en:

```arduino
http://localhost:3000
```

## 🧑‍💼 Roles y acceso
Rol	Permisos
Admin	Gestiona usuarios, prompts y puede cambiar el modo OSC.
User	Usa el chat, ve historiales, interactúa con la IA.

🧪 Modo de pruebas
Para probar la interfaz de control sin una mesa física, usa el simulador local:

bash
Copiar código
node x32-mock.js
Esto crea un servidor OSC ficticio que responde a las peticiones del cliente.

🧠 IA y procesamiento de prompts
DeepSeek (modelo principal)
Procesa las conversaciones del chat.

En modo automático, devuelve arrays JSON con rutas y valores OSC.

En modo manual, responde solo en texto.

Gemini (Google)
Se usa para generar títulos automáticos de historiales y prompts base.

Endpoint configurado en geminiConfig.js.

🔒 Seguridad
Contraseñas encriptadas con bcrypt.

Sesiones persistentes gestionadas por express-session.

ReCAPTCHA v3 en el registro.

.env protegido mediante .gitignore.

🧰 Utilidades de desarrollo
hash.js: genera un hash bcrypt manualmente.

bash
Copiar código
node hash.js
x32-mock.js: simula una mesa Behringer X32 local.

🧾 Licencia
Este proyecto se publica con fines educativos y de prácticas profesionales.
© 2025 – Desarrollado por Asier Rodríguez Murua

💬 Contacto
🌐 https://github.com/asierrodri

📧 contacto: (puedes añadir tu correo o portfolio personal)