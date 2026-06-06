# Sistema de Preferencias del Editor

## Descripción

Los usuarios pueden ahora guardar sus preferencias predefinidas para el editor de capítulos:
- **Tipo de letra** (futura expansión con Google Fonts)
- **Tamaño de letra** (12px, 14px, 16px, 18px, 20px, 24px, 28px, 32px)
- **Dispositivo preferido** (móvil, tablet, escritorio)
- **Márgenes** (superior, inferior, izquierdo, derecho)

Estas preferencias se:
- Guardan automáticamente en localStorage
- Cargan al abrir el editor
- Sincronizan entre pestañas del navegador
- Persisten entre sesiones

## Integración

### Hook: `useEditorPreferences`

```typescript
import { useEditorPreferences } from '@/hooks/use-editor-preferences';

function MyComponent() {
  const { preferences, isLoaded, setPreferences, resetPreferences } = useEditorPreferences();

  // preferences.fontFamily, preferences.fontSize, preferences.device, preferences.margins
  // setPreferences({ fontSize: '20px' })
  // resetPreferences()
}
```

### Componente: `EditorPreferencesPanel`

Panel completo para que usuarios configuren sus preferencias:

```typescript
import { EditorPreferencesPanel } from '@/components/projects/EditorPreferencesPanel';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';

export function SettingsPage() {
  const { preferences, setPreferences, resetPreferences } = useEditorPreferences();

  return (
    <EditorPreferencesPanel
      preferences={preferences}
      onPreferencesChange={setPreferences}
      onReset={resetPreferences}
    />
  );
}
```

## Integración Automática

El editor ya está completamente integrado:

1. **ChapterEditorFullscreen** carga las preferencias automáticamente:
   ```typescript
   const { preferences, isLoaded } = useEditorPreferences();
   const device = preferences.device || defaultDevice;
   const fontSize = preferences.fontSize || defaultFontSize;
   const margins = preferences.margins || defaultMargins;
   ```

2. **AdvancedRichTextEditor** guarda cambios automáticamente:
   - Cuando el usuario cambia el tamaño de letra → se guarda
   - Cuando el usuario ajusta márgenes → se guardan
   - Cuando el usuario cambia dispositivo → se guarda

## Estructura de Datos

```typescript
interface EditorPreferences {
  fontFamily?: string;      // 'Default' o nombre de Google Font
  fontSize?: string;        // '12px', '16px', etc.
  device?: 'mobile' | 'tablet' | 'desktop';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}
```

Valores por defecto:
```typescript
{
  fontFamily: 'Default',
  fontSize: '16px',
  device: 'desktop',
  margins: { top: 24, bottom: 24, left: 24, right: 24 }
}
```

## Almacenamiento

Las preferencias se guardan en localStorage con la clave:
```
anclora-editor-preferences
```

En el navegador (DevTools → Application → Local Storage):
```json
{
  "fontSize": "20px",
  "device": "tablet",
  "margins": { "top": 32, "bottom": 32, "left": 32, "right": 32 }
}
```

## Dónde Mostrar las Preferencias

### Opción 1: Settings/Configuración del Usuario
Crear página `/settings/editor-preferences`:
```typescript
import { EditorPreferencesPanel } from '@/components/projects/EditorPreferencesPanel';

export default function EditorSettingsPage() {
  return <EditorPreferencesPanel ... />;
}
```

### Opción 2: Modal en el Dashboard
```typescript
import { EditorPreferencesPanel } from '@/components/projects/EditorPreferencesPanel';

function SettingsModal() {
  return (
    <Modal>
      <EditorPreferencesPanel ... />
    </Modal>
  );
}
```

### Opción 3: Sidebar en Dashboard
```typescript
function Sidebar() {
  return (
    <div className="sidebar">
      <EditorPreferencesPanel ... />
    </div>
  );
}
```

## Próximas Mejoras

1. **Sincronización con Base de Datos**
   - Guardar preferencias en tabla `app_users` (columna JSONB)
   - Cargar desde BD al iniciar sesión
   - Sincronizar entre dispositivos

2. **Más Opciones**
   - Selección de fuente (Google Fonts)
   - Interlineado personalizado
   - Ancho máximo de página
   - Esquema de colores del editor

3. **Perfiles de Edición**
   - Guardar múltiples perfiles (ej: "Escritura", "Revisión", "Diseño")
   - Cambiar rápidamente entre perfiles

4. **Sincronización en Tiempo Real**
   - Usar localStorage sync events
   - Sincronizar con servidor para multi-dispositivo
