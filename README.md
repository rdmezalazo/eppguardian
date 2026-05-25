# EPPGuardian

Sistema moderno de gestión y control de Equipos de Protección Personal (EPP) desarrollado para optimizar la administración de inventario, asignación de equipos, seguimiento de entregas y control de cumplimiento de seguridad ocupacional.

---

## 🌐 Demo en Producción

El sistema se encuentra desplegado en Vercel:

https://ticket-desk-ufzd.vercel.app/

---

## 🚀 Características Principales

### 🦺 Gestión de Equipos de Protección Personal
- Registro de EPPs
- Control de inventario
- Seguimiento de stock
- Asignación de equipos
- Historial de entregas
- Control de vencimientos
- Gestión de reposiciones

### 👷 Gestión de Personal
- Registro de colaboradores
- Asignación de EPP por trabajador
- Historial de entregas y devoluciones
- Seguimiento de cumplimiento
- Gestión de áreas y puestos

### 📋 Gestión Operativa
- Control de almacén
- Gestión de movimientos
- Registro de incidencias
- Seguimiento de inspecciones
- Administración de proveedores

### 📊 Dashboard y Reportes
- Indicadores operativos
- Reportes de stock
- Alertas de vencimiento
- Estadísticas de entrega
- Métricas de cumplimiento
- Visualización de datos en tiempo real

### 🔔 Alertas y Notificaciones
- Alertas de bajo stock
- Notificaciones de vencimiento
- Seguimiento de renovaciones
- Recordatorios automáticos

---

## 🛠️ Tecnologías Utilizadas

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend & Servicios
- Supabase
- PostgreSQL
- API REST

### Librerías Principales
- React Router
- React Query
- React Hook Form
- date-fns
- Lucide React

---

## 📂 Estructura del Proyecto

```bash
src/
├── components/
├── pages/
├── hooks/
├── services/
├── integrations/
├── lib/
├── utils/
└── assets/
```

---

## ⚙️ Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/rdmezalazo/eppguardian.git
```

### 2. Ingresar al proyecto

```bash
cd eppguardian
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar variables de entorno

Crear archivo `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

---

## 🏗️ Build de Producción

```bash
npm run build
```

Vista previa local:

```bash
npm run preview
```

---

## ☁️ Despliegue

El proyecto se encuentra preparado para despliegue en:

- Vercel
- Netlify
- Render

### Variables necesarias en producción

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 🔐 Seguridad

- Gestión de autenticación
- Roles y permisos
- Protección de rutas
- Variables de entorno seguras
- Integración con Supabase Auth

---

## 📈 Funcionalidades del Sistema

| Módulo | Estado |
|---|---|
| Gestión de EPP | ✅ |
| Gestión de Inventario | ✅ |
| Gestión de Personal | ✅ |
| Dashboard Operativo | ✅ |
| Reportes | ✅ |
| Alertas Automáticas | ✅ |
| Configuración del Sistema | ✅ |

---

## 📌 Scripts Disponibles

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## 🔄 Flujo de Trabajo Git

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

---

## 📄 Licencia

Este proyecto es de uso privado y confidencial.

---

## 👨‍💻 Autor

**Ronald Meza Lazo**

- GitHub: https://github.com/rdmezalazo
- LinkedIn: https://www.linkedin.com/in/ronald-meza-lazo-2791a155/

---

## ⭐ Estado del Proyecto

Proyecto en desarrollo activo orientado a la gestión eficiente de Equipos de Protección Personal (EPP), control operativo y fortalecimiento de la seguridad ocupacional mediante herramientas digitales modernas.

Repositorio oficial:

https://github.com/rdmezalazo/eppguardian
