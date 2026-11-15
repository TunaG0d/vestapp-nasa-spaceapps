# VestApp — NASA Space Apps Challenge 2026

[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue.svg)](https://www.spaceappschallenge.org/)
[![Challenge](https://img.shields.io/badge/Challenge-Harmonization%20MODIS%20%26%20VIIRS-red.svg)](https://www.spaceappschallenge.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Accessibility](https://img.shields.io/badge/WCAG%202.1-AAA%20Compliant-emerald.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2F%20Python%203.12-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2F%20TypeScript%20%2F%20Vite-61DAFB.svg)](https://react.dev/)

**VestApp** (*Valuación, Evaluación Satelital y Temprana de Alertas Preventivas*) es una plataforma geoespacial de código abierto que resuelve la fragmentación y el sesgo de doble conteo de datos satelitales de incendios forestales (**MODIS** y **VIIRS**), integrando dos décadas y media de historia satelital (**2000–2026**), modelos de predicción táctica y estacional (**IA a 72 semanas**), alertas físicas automáticas por correo (**SMTP**) y estándares universales de accesibilidad (**WCAG 2.1 AAA**).

---

## 🚀 Problema Crítico y Solución de VestApp

| Desafío Satelital Tradicional | Solución Implementada en VestApp |
| :--- | :--- |
| **Doble Conteo:** MODIS (1 km) y VIIRS (375 m) detectan el mismo incendio con desfase temporal y angular, inflando las alertas en un 40%–65%. | **Grilla Armonizada de 1 km²:** Fusión espacio-temporal ($\Delta t \le 3\text{h}$) que elimina un **56.60% de duplicados**. |
| **Incompatibilidad Histórica:** MODIS data del 2000 (26 años), pero VIIRS inició en 2012. No se podían comparar directamente. | **Normalización de Superficie:** Convierte detecciones a área activa de 1 km², generando una serie homogénea ininterrumpida 2000–2026. |
| **Alertas Alarmistas o Incomprensibles:** Alertas crudas en FRP (MW) sin contexto físico ni recomendaciones según rol. | **Despacho Multi-Rol Físico:** Notificaciones por perfil (Bomberos, Agricultores, Vecinos) con la regla 30-30-30 y conos de viento. |
| **Barreras de Accesibilidad:** Mapas de calor rojos inaccesibles para el 8% de personas con daltonismo y jerga técnica compleja. | **Inclusión WCAG AAA:** Paleta Okabe-Ito, formas geométricas dobles (`▲`, `◆`, `●`, `■`) y switch instantáneo de **Lenguaje Ciudadano**. |

---

## 🛠️ Arquitectura del Sistema

```
                            ┌────────────────────────────────────────┐
                            │          Fuentes Satelitales           │
                            │   NASA FIRMS NRT (MODIS & VIIRS)       │
                            │   Open-Meteo API (Viento, HR, Temp)    │
                            └───────────────────┬────────────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Backend: FastAPI (Python 3.12 / NSAC26)                         │
│                                                                                        │
│  ┌───────────────────────┐   ┌───────────────────────────┐   ┌──────────────────────┐  │
│  │ Motor de Armonización │   │ Inteligencia Artificial   │   │ Motor SMTP Multi-Rol │  │
│  │  - Grilla 1 km²       │   │  - Regla Física 30-30-30  │   │  - Bomberos (Táctico)│  │
│  │  - Filtro -56.6% dup. │   │  - Cono Viento +1h / +3h  │   │  - Agro (Veda quema) │  │
│  │  - Calibración FRP    │   │  - Proyección 72 Semanas  │   │  - Vecinos (Simple)  │  │
│  └───────────────────────┘   └───────────────────────────┘   └──────────────────────┘  │
│                                                │                                       │
│                                340.708 Hotspots Cacheados                              │
└───────────────────────────────────────────────┬────────────────────────────────────────┘
                                                │ REST API (:8000)
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Frontend: React 19 + TypeScript + Vite                          │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Pestaña Monitoreo Táctico & Alerta Temprana                                   │  │
│  │    - Visor Geoespacial Leaflet (Dark Matter) con anillos térmicos y conos viento │  │
│  │    - Tarjeta Foco Crítico 30-30-30 + Proyección Estacional a 72 Semanas          │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ 2. Pestaña Calendario Diario Histórico 26 Años (2000–2026)                       │  │
│  │    - Cuadrícula de 12 meses (Lunes a Domingo con días 1–31)                      │  │
│  │    - Explicación contextual del peak y curva comparativa vs mediana histórica    │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ 3. Pestaña Descarga de Datos y Exportación CSV Customizado                       │  │
│  │    - Filtro por Bounding Box, fechas, sensores (MODIS/VIIRS) y niveles           │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │ Accesibilidad Universal & Lenguaje Claro (WCAG 2.1 AAA)                          │  │
│  │    - Switch "Ciudadano (Simple)" vs "Científico (Técnico)" (Alt+C)               │  │
│  │    - Paleta Okabe-Ito + Formas Dobles + Escala Tipográfica (Alt+A)               │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Funcionalidades Principales

### 1. Visor Geoespacial Táctico en Tiempo Real
* Capas de satélites **Terra/Aqua (MODIS 1 km)** y **Suomi-NPP/NOAA-20/NOAA-21 (VIIRS 375 m)**.
* **Simbología Flotante NASA:** Identificación visual de resolución espacial, celdas armonizadas consolidadas y conos tácticos de propagación (+1h y +3h).
* Alternancia interactiva entre **Celdas Armonizadas (1 km)** y **Focos Crudos Dispersos** para auditoría visual directa de la eliminación de duplicados.

### 2. Diagnóstico IA con Doble Horizonte
* **Inmediato (Días):** Análisis de peligro físico en terreno:
  * Regla 30-30-30 (Temperatura $>30^\circ\text{C}$, Humedad relativa $<30\%$, Viento $>30\text{ km/h}$).
  * Factor de propagación por pendiente de ladera ($\theta > 5^\circ$).
  * Anomalía térmica previa ($\sigma$ sobre la mediana histórica).
* **Estratégico (72 Semanas / ~17 Meses):** Proyección multianual que anticipa la **Ventana de Cortafuegos** (Semana 10) y el **Peak Crítico de Ignición** (Semana 11) cruzando ciclos climáticos ENSO (El Niño / La Niña) y 26 años de series satelitales.

### 3. Calendario Diario Histórico (2000–2026)
* Calendario anual completo organizado de **Lunes a Domingo** con numeración de días (1 a 31).
* Rampa térmica con soporte para daltonismo (Okabe-Ito).
* Inspección interactiva: clic en cualquier día para abrir el diagnóstico contextual con porcentaje de anomalía respecto a la mediana de 26 años.
* Vista complementaria de gráfico diario por mes con ejes métricos normalizados.

### 4. Despacho Real de Alertas vía SMTP por Rol
* Endpoint backend `/api/alerts/dispatch-all-roles` que evalúa los criterios meteorológicos y satelitales y envía correos simultáneos y diferenciados:
  * **Bomberos / Brigadistas:** Protocolo táctico, coordenadas, FRP máx y vector de viento.
  * **Agricultores / Gestores de Tierras:** Proximidad, humedad crítica y estado de veda de quemas.
  * **Vecinos / Comunidad:** Aviso preventivo en Lenguaje Simple con medidas de autoprotección.

### 5. Accesibilidad Universal (WCAG 2.1 AAA)
* **Switch directo en Cabecera:** Alterna instantáneamente toda la aplicación entre **Modo Ciudadano Claro** y **Modo Científico Técnico**.
* **Paleta Okabe-Ito:** Reemplaza el gradiente rojo por tonos universales (Celeste `#56B4E9`, Ámbar `#E69F00`, Rosa `#CC79A7`).
* **Doble Codificación Visual:** Formas geométricas únicas por nivel (**`▲` Extremo**, **`◆` Alto**, **`●` Moderado**, **`■` Bajo**).
* **Atajos de Teclado:** `1`, `2`, `3` para cambiar de pestaña, `Alt+C` para lenguaje claro, `Alt+A` para panel de accesibilidad, `Escape` para cerrar modales.

---

## 📦 Requisitos Previos e Instalación

### Requisitos del Sistema
* **Node.js:** v18.0.0 o superior (recomendado v20+)
* **Python:** v3.11 o v3.12
* **NPM:** v9.0.0 o superior

### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/vestapp-nasa-spaceapps.git
cd vestapp-nasa-spaceapps
```

### 2. Configurar el Backend (FastAPI)
```bash
cd backend/NSAC26

# Crear y activar entorno virtual
python -m venv .venv
# En Windows:
.venv\Scripts\activate
# En Linux/macOS:
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

#### Variables de Entorno (`.env`) en Backend
Crear un archivo `.env` en `backend/NSAC26/` con las siguientes variables:
```env
# NASA FIRMS API Key oficial
FIRMS_MAP_KEY=1cfee93d76dade3267373e69330e5d3b

# Configuración SMTP para despacho real de alertas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASSWORD=tu-app-password-de-gmail
SMTP_FROM=tu-correo@gmail.com
```

#### Iniciar el Servidor Backend
```bash
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
*API disponible en:* `http://127.0.0.1:8000`  
*Documentación interactiva Swagger:* `http://127.0.0.1:8000/docs`

### 3. Configurar el Frontend (React + Vite)
En una nueva terminal:
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```
*Aplicación disponible en:* `http://localhost:5173/`

---

## 🔬 Estándares Internacionales y Cumplimiento

1. **W3C WCAG 2.1 Nivel AA / AAA:**
   * Relación de contraste mínima de 7:1 en modo accesible.
   * Sin dependencia exclusiva del color (doble codificación por forma geométrica).
   * Navegación completa por teclado con anillos de foco visibles (`ring-2 ring-cyan-400`).
2. **Marco de Sendai para la Reducción del Riesgo de Desastres 2015–2030 (ONU / UNDRR):**
   * *Prioridad 1:* Comprensión del riesgo de desastres mediante análisis multianual de 26 años.
   * *Prioridad 4:* Preparación y respuesta anticipatoria con proyecciones a 72 semanas.
3. **Open Geospatial Consortium (OGC):**
   * Representación interoperable en formato GeoJSON, datum WGS84 (EPSG:4326) y Bounding Boxes normalizados.
4. **Gobernanza Ética de la IA (Human-in-the-Loop):**
   * Asistencia IA estrictamente orientativa; las decisiones de evacuación y combate pertenecen a los organismos oficiales competentes (CONAF, Bomberos, SENAPRED).

---

## 👥 Equipo y Créditos

Proyecto desarrollado para el **NASA International Space Apps Challenge 2026**.  
* **Desafío:** Harmonization of Multi-Sensor Hotspot Data (MODIS and VIIRS).  
* **Datos Satelitales:** Cortesía de NASA FIRMS, NASA Earthdata, misiones Terra, Aqua, Suomi-NPP, NOAA-20 y NOAA-21.  
* **Datos Meteorológicos:** Open-Meteo & Meteomatics APIs.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.
