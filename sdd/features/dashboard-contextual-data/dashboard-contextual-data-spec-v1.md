# Dashboard contextual data — spec v1

## Objetivo

Consolidar las acciones contextuales del dashboard en el propio workspace: el menú de proyecto abre los datos del documento sobre el dashboard, la actividad refleja el proyecto seleccionado y el menú de usuario prepara las futuras opciones de perfil y configuración.

## Criterios de aceptación

1. El menú de tres puntos ofrece `Datos del documento` y `Eliminar` con igual tratamiento de tamaño y realce al pasar el puntero.
2. `Datos del documento` abre un modal accesible sin navegación y sin scroll vertical en el viewport de escritorio; incluye título, subtítulo, autor, fecha de creación, páginas, capítulos, composición, estructura y marca.
3. La actividad reciente muestra únicamente el proyecto seleccionado y cambia al seleccionar otra tarjeta con ratón, teclado o puntero táctil.
4. El enlace `Ver todo` y el modal de proyectos duplicado dejan de formar parte del dashboard.
5. El menú de usuario muestra identidad, `Perfil` y `Configuración` desactivados, y cierre de sesión.
6. Los botones y cierres de estos flujos usan los mismos estados visuales y de foco que los botones principales del dashboard.

## Fuera de alcance

Perfil, configuración y edición de datos del documento siguen desactivados o conservan las acciones existentes; no se modifica el modelo de persistencia.
