# Scout

App para la competencia "Tu tiempo, tu Mundial".

## Contexto

El desafio consiste en desarrollar una demo interactiva que analice el perfil de un usuario
(horarios disponibles, equipos, jugadores favoritos u otras variables) y recomiende que
partidos de la primera fase del Mundial 2026 deberia ver.

Las recomendaciones deben clasificar cada partido en una de estas categorias:

- Imperdible: partidos indispensables por relevancia y afinidad.
- Vale la pena: partidos interesantes pero no cruciales, o en horarios complejos.
- Para ver el resumen: partidos de bajo interes para el perfil o en horarios imposibles.

La entrega esperada incluye una aplicacion web publica en GitHub Pages, un informe
metodologico en PDF y este repositorio publico con codigo, datos e instrucciones de
ejecucion.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- ESLint

## Requisitos

- Node.js 20.19+ o 22.12+
- npm

## Instalacion

```bash
npm install
```

## Comandos

```bash
npm run dev
```

Levanta el servidor de desarrollo de Vite.

```bash
npm run build
```

Compila TypeScript y genera la version de produccion en `dist/`.

```bash
npm run lint
```

Ejecuta ESLint sobre el proyecto.

```bash
npm run preview
```

Sirve localmente la version generada por `npm run build`.

## Estructura inicial

- `src/App.tsx`: componente principal de React.
- `src/main.tsx`: punto de entrada de la aplicacion.
- `src/index.css`: estilos globales e import de Tailwind CSS.
- `vite.config.ts`: configuracion de Vite, React y Tailwind.

## Cronograma de la competencia

- Fecha limite de inscripcion: viernes 22/05/2026 23:59 hs.
- Fecha limite de entregas: jueves 04/06/2026 23:59 hs.
- Anuncio de finalistas y evento final: lunes 08/06/2026.

## Canal de consultas

Consultas de la competencia: dcastro-ext@austral.edu.ar
