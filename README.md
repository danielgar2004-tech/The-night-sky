# Esa primera vez… · The Night Sky 3D

Sitio web 3D inmersivo del cielo estrellado sobre **Cusco, Perú**, la noche del
**16 de septiembre de 2025 a las 22:00** (13.5320° S, 71.9675° W) — la misma
toma del cuadro *The Night Sky* que acompaña este regalo.

## Características

- **Astronomía real**: 2 440 estrellas del catálogo Hiparcos (magnitud ≤ 6),
  con posición altacimutal calculada para ese instante exacto
  (tiempo sideral local ≈ 22 h, idéntico a la composición del póster).
- **55 constelaciones** visibles esa noche, con las nueve del cuaderno
  resaltadas en dorado (Pavo, Tucana, Dorado y Triangulum Australe sobre el
  horizonte; las demás, accesibles desde el *Cuaderno*).
- **41 estrellas con nombre propio** (Antares, Vega, Peacock, Achernar, Fomalhaut…).
- Vía Láctea procedural sobre el plano galáctico, colores estelares según el
  índice B−V, titileo sutil.
- Historias del cuaderno en español al tocar cada constelación destacada.
- **Tour guiado** de 10 paradas (botón inferior derecho, inicio manual).
- Controles táctiles y de ratón: arrastrar para mirar, pellizco/rueda para acercar.
- Sin dependencias externas en tiempo de ejecución (Three.js incluido en `js/`),
  carga rápida (~800 KB total) y compatible con PC, Android e iPhone.
- Accesibilidad: objetivos táctiles ≥ 44 px, `prefers-reduced-motion`,
  etiquetas ARIA, contraste cuidado.

## Estructura

```
index.html            Interfaz y paneles
css/style.css         Estética fiel al póster (tinta azul-noche, marfil, oro)
js/main.js            Motor 3D, controles, historias y tour
js/data.js            Datos astronómicos precalculados (estrellas, líneas, Vía Láctea)
js/three.module.min.js Three.js r160 (local)
```

## Publicar en GitHub Pages

1. Crear el repositorio y subir estos archivos a la rama `main`.
2. En **Settings → Pages**, elegir *Deploy from a branch* → `main` / `/ (root)`.
3. El sitio quedará en `https://<usuario>.github.io/<repositorio>/`.

No requiere compilación ni servidor: es un sitio estático puro.
Para probar en local: `python3 -m http.server` y abrir `http://localhost:8000`.

## Créditos de datos

- Catálogo estelar y líneas de constelación: [d3-celestial](https://github.com/ofrohn/d3-celestial)
  (Olaf Frohn, licencia BSD-3), derivado del catálogo Hipparcos.
- Cálculo de posiciones: fórmulas estándar de tiempo sideral y conversión
  ecuatorial → horizontal (época J2000).
- Motor gráfico: [Three.js](https://threejs.org/) (licencia MIT).
