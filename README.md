# 🎓 Graduate in Necromancy (versión para celulares)

Versión web instalable (PWA) de **Graduate in Necromancy**, el juego de cartas solitario gratuito de
Bulgur007 ([itch.io](https://bulgur007.itch.io/graduate-in-necromancy) ·
[BoardGameGeek](https://boardgamegeek.com/boardgame/422125/graduate-in-necromancy)). Es la misma lógica
que `granecro/` (Streamlit), rehecha en HTML/CSS/JS para jugar con el celular en vertical.
El juego está completamente en inglés, su idioma original. Sin publicidad y funciona sin internet.

**Abrir el juego:** https://tenehuini.github.io/granecro_mobile/

## Probarlo en la compu

```bash
cd granecro_mobile
python3 -m http.server 8000
```

Y abrir http://localhost:8000 (en Chrome, con las herramientas de desarrollo en modo celular).

## Publicarlo

Se publica con GitHub Pages desde la rama `main` (carpeta raíz) del repositorio
`Tenehuini/granecro_mobile`. Cada `git push` a `main` actualiza el sitio en un par de minutos.

## Instalar la aplicación en el celular

### Android
1. Abrí **Chrome** y entrá a https://tenehuini.github.io/granecro_mobile/
2. Tocá el menú **⋮** (arriba a la derecha).
3. Elegí **Instalar app** (o **Agregar a pantalla principal**).
4. Confirmá con **Instalar**.

### iPhone
1. Abrí **Safari** y entrá a https://tenehuini.github.io/granecro_mobile/
2. Tocá **Compartir** (el cuadrado con la flecha hacia arriba).
3. Elegí **Agregar a inicio** y tocá **Agregar**.

La pantalla de inicio del juego tiene el botón **📲 How to install the app** con estos mismos pasos.

## Cómo se juega

Ver el botón **📜 How to play** en la app. Durante la partida, **mantené presionada** cualquier carta
(la actual o las de tus cursos) para verla en grande y leer su texto; un toque corto muestra sus datos.

## Estructura

```
granecro_mobile/
├── index.html      # Pantallas y diálogos
├── styles.css      # Estilos
├── cards.js        # Datos: cartas y dificultades (iguales a granecro.py)
├── game.js         # Reglas del juego (sin DOM)
├── app.js          # Pantallas, dibujo y guardado
├── sw.js           # Cache para jugar sin conexión
├── manifest.json   # Datos para instalarla como app
└── assets/         # Cartas (WebP desde granecro/img, a resolución original), logo e íconos
```

## Diferencias con la versión de Streamlit

- La siguiente carta se da vuelta sola después de cada acción.
- Las acciones que no se pueden hacer aparecen deshabilitadas con el motivo (por ejemplo, qué magia falta).
- Los requisitos de magia se verifican probando todas las combinaciones: con «▼○» y «○» aprendidas
  se puede cursar algo que pida ○ y ▼ (en Streamlit a veces se rechazaba).
- Los cursos W de la expansión piden tener la tesis necesaria (1); en Streamlit pedía 2 o más.
- La cordura nunca supera 5, tampoco con los compañeros de estudio.

## Para quien mantiene el juego

Cada vez que se publica un cambio, subí el número de `CACHE` en `sw.js` (por ejemplo de
`granecro-v1` a `granecro-v2`) para que los celulares descarguen los archivos nuevos.
La partida en curso se guarda en el celular (`localStorage`) y se puede continuar desde el inicio.
