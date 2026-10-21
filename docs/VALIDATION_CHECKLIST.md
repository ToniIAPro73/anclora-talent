# Checklist de validación — controles de fondo de portada (2026-10-21)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent

**Rama y commit de implementación:** development @ b3944d9

**Alcance:** estilos del aviso y los controles del editor de portada.

## 1. Qué cambia

- El aviso de resolución baja usa contraste legible en modo claro.
- La ayuda emergente de importación usa una superficie clara y texto oscuro en modo claro.
- Los selectores de tipo de fondo y de encuadre muestran iconos, con nombre accesible y etiqueta al pasar el cursor.
- Las acciones compactas del panel de propiedades tienen esquinas menos redondeadas.

## 2. Verificaciones completadas

| Comprobación | Método | Resultado |
| --- | --- | --- |
| Integridad del diff | `git diff --check` | PASS |
| Inspección del cambio | Revisión de los dos archivos modificados | PASS |

## 3. Verificaciones no ejecutadas

| Comprobación | Motivo |
| --- | --- |
| Tests automatizados, TypeScript, lint y build | No se ejecutaron para este ajuste localizado. |
| QA visual con navegador | Pendiente de revisión visual. |

## 4. Validación manual sugerida

| # | Lugar | Acción | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Editor de portada en modo claro | Mostrar el aviso de baja resolución y enfocar el control de importar/reemplazar | Ambos textos se leen con claridad sobre fondos claros. |
| 2 | Propiedades del fondo | Revisar los selectores de tipo y encuadre | Los iconos representan las opciones; al enfocar, cada control conserva un nombre accesible. |
| 3 | Propiedades del fondo de imagen | Revisar Centrar imagen, Restablecer fondo y Convertir en capa | Los botones tienen esquinas compactas, coherentes con las acciones del editor. |
| 4 | Editor de portada en modo oscuro | Revisar los mismos controles | El contraste y los estados activos siguen siendo legibles. |

## 5. Decisión de promoción

- No se promociona este cambio. Se publica únicamente en `development`.
