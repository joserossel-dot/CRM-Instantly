# Instantly Mini-CRM

Un Mini-CRM completo y minimalista creado para conectar con webhooks de Instantly.
Construido con **Node.js (Express) + SQLite3** para el backend y **React (Vite) + Tailwind CSS** para el frontend.

## Estructura del Proyecto

- `/backend`: API REST y Base de Datos (SQLite).
- `/frontend`: SPA en React (Vite) para el Dashboard interactivo.

## 1. Requisitos Previos

- [Node.js](https://nodejs.org/en/) (v16 o superior)
- npm o yarn

## 2. Instalación y Configuración

### Backend

1. Entra a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Verifica el archivo `.env` en la carpeta `backend` o créalo con el siguiente contenido:
   ```env
   PORT=3001
   ```
   
### Frontend

1. Entra a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Verifica el archivo `.env` en la carpeta `frontend` o créalo con el siguiente contenido:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

## 3. Ejecución Local

Necesitarás ejecutar ambos servidores simultáneamente (puedes usar dos pestañas de terminal).

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```
El backend estará corriendo en `http://localhost:3001`.

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
El frontend estará corriendo en la dirección que te indique Vite (usualmente `http://localhost:5173`).

## 4. Uso del Webhook de Instantly

Para enviar leads desde Instantly, configura un Webhook en tu campaña apuntando a la URL del backend (si estás en local, puedes usar ngrok para exponer el puerto 3001, por ejemplo: `https://tu-ngrok.app/api/webhook/instantly`).

**Endpoint:** `POST /api/webhook/instantly`

El backend intentará extraer automáticamente los campos `email`, `name` (o `first_name`, `last_name`), `company` (o `companyName`) y `message` (o `content`, `text`).

## 5. Pruebas Rápidas (Simular un Lead)

Puedes simular un lead ingresando el siguiente comando en otra terminal mientras tu backend está corriendo:

```bash
curl -X POST http://localhost:3001/api/webhook/instantly \\
-H "Content-Type: application/json" \\
-d '{
  "email": "lead@ejemplo.com",
  "first_name": "Juan",
  "last_name": "Pérez",
  "company": "Empresa Ficticia SA",
  "message": "Hola, estoy muy interesado en sus servicios. ¿Podemos agendar una reunión?"
}'
```

Luego, abre el Dashboard del frontend y verás al nuevo lead en la sección "Nuevo".
