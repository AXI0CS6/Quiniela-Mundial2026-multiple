# Quiniela Mundial 2026 — Múltiples Quinielas

WebApp para gestionar múltiples quinielas del Mundial FIFA 2026. Funciona completamente en el navegador sin servidor, sin Node.js y sin APIs externas.

## Características

- ✅ Crear y gestionar múltiples quinielas independientes.
- ✅ Agregar participantes a la quiniela que elijas.
- ✅ Ingresar predicciones por participante.
- ✅ Edición manual de resultados de los 104 partidos oficiales.
- ✅ Leaderboard automático (3 pts marcador exacto, 1 pt ganador/empate).
- ✅ Sorteo de equipos para participantes.
- ✅ Simulación con participantes demo y predicciones aleatorias.
- ✅ Todo se guarda en el navegador con `localStorage`.

## Cómo ejecutar localmente

1. Abre el archivo `index.html` en cualquier navegador moderno.
2. Registra tu cuenta de administrador la primera vez.
3. Crea quinielas, agrega participantes y llena resultados.

## Cómo subir a GitHub

```bash
git init
git add .
git commit -m "Primera versión quiniela2026-multiple"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/quiniela2026-multiple.git
git push -u origin main
```

## Cómo publicar con GitHub Pages

1. Ve a **Settings → Pages** de tu repositorio.
2. En **Source** selecciona **Deploy from a branch** y luego la rama `main` con carpeta `/ (root)`.
3. Guarda. En pocos minutos tendrás una URL como `https://TU_USUARIO.github.io/quiniela2026-multiple/`.

## Estructura

```
quiniela2026-multiple/
├── index.html      # Interfaz principal
├── style.css       # Estilos (paleta verde/dorada)
├── app.js          # Lógica y localStorage
├── data.js         # 48 equipos y 104 partidos
└── README.md       # Este archivo
```

## Notas

- Los datos se almacenan localmente en el navegador. Si limpias cookies/almacenamiento, se perderán.
- Para respaldar, puedes exportar manualmente los valores de `localStorage` desde las herramientas de desarrollador.
- No requiere instalación de Node.js ni permisos de administrador.

---
Ejercicio educativo · Vibe Coding · KT_MxDC 2026
