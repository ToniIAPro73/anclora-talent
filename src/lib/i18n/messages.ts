import type { UiLocale } from '@/lib/ui-preferences/preferences';
import type {
  MarketingBenefit,
  MarketingShowcasePanel,
  MarketingWorkflowStep,
} from '@/components/marketing/marketing-data';

export type AppMessages = {
  shell: {
    brand: string;
    badge: string;
    contractEyebrow: string;
    contractTitle: string;
    contractDescription: string;
    navDashboard: string;
    navNewProject: string;
    navProjects: string;
    stackEyebrow: string;
    stackTitle: string;
    stackDescription: string;
    topbarEyebrow: string;
    topbarTitle: string;
    themeLabel: string;
    localeLabel: string;
    themeDark: string;
    themeLight: string;
    localeSpanish: string;
    localeEnglish: string;
  };
  auth: {
    signIn: {
      eyebrow: string;
      title: string;
      description: string;
      accent: string;
    };
    signUp: {
      eyebrow: string;
      title: string;
      description: string;
      accent: string;
    };
    pillars: readonly string[];
    contractEyebrow: string;
  };
  landing: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    proofEyebrow: string;
    workflowEyebrow: string;
    workflowTitle: string;
    workflowDescription: string;
    workflowAdvance: string;
    workflowStepLabel: string;
    productEyebrow: string;
    productTitle: string;
    productDescription: string;
    benefitsEyebrow: string;
    benefitsTitle: string;
    finalEyebrow: string;
    finalTitle: string;
    finalNote: string;
    proofItems: readonly string[];
    workflowSteps: readonly MarketingWorkflowStep[];
    showcasePanels: readonly MarketingShowcasePanel[];
    benefits: readonly MarketingBenefit[];
  };
  dashboard: {
    eyebrow: string;
    title: string;
    description: string;
    createProject: string;
    projectsEyebrow: string;
    statusEyebrow: string;
    contractEyebrow: string;
    statusActive: string;
    statusEmpty: string;
    statusFallback: string;
    contractReady: string;
    contractFallback: string;
    sectionEyebrow: string;
    sectionTitle: string;
    emptyEyebrow: string;
    emptyFallbackEyebrow: string;
    emptyTitle: string;
    emptyFallbackTitle: string;
    emptyDescription: string;
    emptyFallbackDescription: string;
    emptyAction: string;
  };
  project: {
    newEyebrow: string;
    newTitle: string;
    newDescription: string;
    createFormEyebrow: string;
    createFormTitle: string;
    createFormDescription: string;
    titleLabel: string;
    titlePlaceholder: string;
    sourceDocumentLabel: string;
    sourceDocumentHint: string;
    createProjectHint: string;
    createProjectAction: string;
    cardPremium: string;
    cardUpdated: string;
    cardOpenEditor: string;
    cardPreview: string;
    cardDelete: string;
    cardDeleteConfirm: string;
    editorEyebrow: string;
    editorOpenPreview: string;
    editorOpenCover: string;
    editorMetaEyebrow: string;
    editorLiveEyebrow: string;
    editorLiveDescription: string;
    editorTitleLabel: string;
    editorSubtitleLabel: string;
    editorAuthorLabel: string;
    editorChapterLabel: string;
    saveChanges: string;
    previewEyebrow: string;
    previewTitle: string;
    previewBackToEditor: string;
    previewOpenCover: string;
    previewCanvasEyebrow: string;
    previewCoverEyebrow: string;
    editorialMapTitle: string;
    editorialMapDescription: string;
    editorialMapOriginalColumn: string;
    editorialMapChaptersColumn: string;
    editorialMapPagesColumn: string;
    coverEyebrow: string;
    coverTitle: string;
    coverBackEditor: string;
    coverBackPreview: string;
    coverFormEyebrow: string;
    coverTitleLabel: string;
    coverSubtitleLabel: string;
    coverAuthorLabel: string;
    coverPaletteLabel: string;
    coverBackgroundLabel: string;
    coverOpacityLabel: string;
    coverAdvancedSyncNotice: string;
    backCoverAdvancedSyncNotice: string;
    coverSave: string;
    coverNoImage: string;
    paletteObsidian: string;
    paletteTeal: string;
    paletteSand: string;
    importAnalyzing: string;
    importReady: string;
    importChaptersDetected: string;
    importTitleDetected: string;
    importAuthorDetected: string;
    importWarningsLabel: string;
    importChapterPreviewLabel: string;
    importErrorGeneric: string;
    importFileTooLarge: string;
    importFormatUnsupported: string;
    coverOpenBackCover: string;
    advancedCoverEyebrow: string;
    advancedCoverLayoutLabel: string;
    advancedCoverFontLabel: string;
    advancedCoverAccentLabel: string;
    backCoverEyebrow: string;
    backCoverTitle: string;
    backCoverFormEyebrow: string;
    backCoverTitleLabel: string;
    backCoverBodyLabel: string;
    backCoverBodyPlaceholder: string;
    backCoverAuthorBioLabel: string;
    backCoverSave: string;
    backCoverBackToCover: string;
    previewExportButton: string;
    previewExportFilename: string;
    previewExportPdfButton: string;
    coverRenderImage: string;
    coverRenderImageDone: string;
    coverRenderedImageLabel: string;
    coverSwitchToAdvanced: string;
    coverSwitchToBasic: string;
    stepContent: string;
    stepChapters: string;
    stepTemplate: string;
    stepCover: string;
    stepBackCover: string;
    stepPreview: string;
    stepCollaborate: string;
    stepAI: string;
    stepExport: string;
    stepContentDesc: string;
    stepChaptersDesc: string;
    stepTemplateDesc: string;
    stepCoverDesc: string;
    stepBackCoverDesc: string;
    stepPreviewDesc: string;
    stepCollaborateDesc: string;
    stepAIDesc: string;
    stepExportDesc: string;
    previewModalZoomOut: string;
    previewModalZoomIn: string;
    previewModalSingleView: string;
    previewModalSpreadView: string;
    previewModalLaptop: string;
    previewModalTablet: string;
    previewModalMobile: string;
    previewModalPrevious: string;
    previewModalNext: string;
    previewModalPage: string;
    previewModalOf: string;
    previewModalClose: string;
    previewModalAdvanced: string;
    previewModalTocShow: string;
    previewModalTocHide: string;
    previewModalTocHeading: string;
    previewModalZoomSlider: string;
    previewModalEmptyState: string;
    previewModalUntitledProject: string;
    previewModalUntitledChapter: string;
    previewModalCoverAlt: string;
    previewModalBackCoverAlt: string;
  };
};

export const appMessages: Record<UiLocale, AppMessages> = {
  es: {
    shell: {
      brand: 'Anclora Talent',
      badge: 'Premium App',
      contractEyebrow: 'Contrato',
      contractTitle: 'Editorial workspace premium',
      contractDescription:
        'Identidad protegida, persistencia real y una experiencia que mantiene el mismo nivel visual desde la entrada hasta la producción.',
      navDashboard: 'Dashboard',
      navNewProject: 'Nuevo proyecto',
      navProjects: 'Mis proyectos',
      stackEyebrow: 'Stack activo',
      stackTitle: 'Clerk + Neon + Blob',
      stackDescription:
        'La cuenta individual sigue siendo la unidad activa, pero la experiencia ya se presenta como producto premium, no como shell técnico.',
      topbarEyebrow: 'App shell',
      topbarTitle: 'Workspace editorial personal',
      themeLabel: 'Tema',
      localeLabel: 'Idioma',
      themeDark: 'Dark',
      themeLight: 'Light',
      localeSpanish: 'ES',
      localeEnglish: 'EN',
    },
    auth: {
      signIn: {
        eyebrow: 'Acceso premium',
        title: 'Vuelve a tu workspace editorial con una experiencia a la altura del producto.',
        description:
          'Accede a tus proyectos, recupera contexto y continúa donde lo dejaste sin romper la continuidad visual ni operativa.',
        accent: 'Recupera ritmo, foco y consistencia en segundos.',
      },
      signUp: {
        eyebrow: 'Alta premium',
        title: 'Entra en Anclora Talent con una capa de acceso que ya transmite producto.',
        description:
          'Crea tu cuenta y empieza a trabajar sobre un flujo editorial real, persistente y visualmente coherente desde el primer minuto.',
        accent: 'Registro, proyecto, editor, preview y portada dentro del mismo sistema.',
      },
      pillars: ['Identidad protegida', 'Persistencia real', 'Acabado premium'],
      contractEyebrow: 'Contrato de producto',
    },
    landing: {
      eyebrow: 'Anclora Talent',
      headline: 'Convierte talento en una presencia editorial lista para publicar.',
      subheadline:
        'Crea tu cuenta, lanza tu proyecto y trabaja sobre un flujo claro de documento, preview y portada desde una misma plataforma.',
      proofEyebrow: 'Confianza',
      workflowEyebrow: 'Flujo',
      workflowTitle: 'Tres pasos para empezar sin fricción',
      workflowDescription:
        'La landing debe reducir la distancia entre la promesa y la acción. Aquí el usuario entiende el recorrido antes de registrarse.',
      workflowAdvance: 'Avanzar',
      workflowStepLabel: 'Paso',
      productEyebrow: 'Producto',
      productTitle: 'Una plataforma donde documento, preview y portada dejan de competir entre sí.',
      productDescription:
        'El usuario no necesita interpretar capas técnicas. Necesita ver cómo encajan documento, preview y portada en una sola experiencia.',
      benefitsEyebrow: 'Beneficios',
      benefitsTitle: 'Lo que el usuario gana en cada visita',
      finalEyebrow: 'Siguiente paso',
      finalTitle: 'Abre tu cuenta y empieza con una base que ya parece producto.',
      finalNote:
        'Empieza con una cuenta propia, crea tu primer proyecto y trabaja con una base que ya transmite claridad, consistencia y salida real.',
      proofItems: [
        'Proyectos persistentes desde el primer día',
        'Documento, preview y portada en un mismo flujo',
        'Acceso autenticado y listo para producción',
      ],
      workflowSteps: [
        {
          title: 'Crea tu cuenta',
          description: 'Entra en segundos y deja listo tu espacio de trabajo.',
        },
        {
          title: 'Lanza tu proyecto',
          description: 'Parte de un documento canónico y una estructura clara.',
        },
        {
          title: 'Edita y publica',
          description: 'Convierte borradores en una presencia editorial coherente.',
        },
      ],
      showcasePanels: [
        {
          title: 'Documento canónico',
          description: 'Una sola fuente de verdad para el contenido editorial.',
          accent: 'Estructura',
          bullets: ['Títulos consistentes', 'Bloques editables', 'Base reutilizable'],
        },
        {
          title: 'Preview conectado',
          description: 'La lectura visual refleja lo que realmente vas a publicar.',
          accent: 'Claridad',
          bullets: ['Vista inmediata', 'Edición coherente', 'Menos fricción'],
        },
        {
          title: 'Portada persistente',
          description: 'Imágenes y assets preparados para un uso repetido.',
          accent: 'Acabado',
          bullets: ['Cover guardada', 'Assets en Blob', 'Reuso sin pérdida'],
        },
      ],
      benefits: [
        {
          title: 'Más claridad',
          description: 'Cada proyecto sigue una estructura que se entiende rápido.',
        },
        {
          title: 'Más velocidad',
          description: 'Menos decisiones redundantes para pasar de idea a publicación.',
        },
        {
          title: 'Más consistencia',
          description: 'Documento, portada y preview trabajan sobre el mismo relato.',
        },
      ],
    },
    dashboard: {
      eyebrow: 'Dashboard premium',
      title: 'Tus proyectos editoriales ya viven dentro de una app que parece producto de verdad.',
      description:
        'Auth, documento, preview y portada ya están alineados. Ahora el acceso diario también tiene que transmitir valor, control y acabado premium.',
      createProject: 'Crear nuevo proyecto',
      projectsEyebrow: 'Proyectos',
      statusEyebrow: 'Estado',
      contractEyebrow: 'Contrato',
      statusActive: 'Base activa y persistente',
      statusEmpty: 'Listo para primer proyecto',
      statusFallback: 'Fallback operativo activo',
      contractReady: 'Premium app operativa',
      contractFallback: 'Acceso sin caída ante fallo de datos',
      sectionEyebrow: 'Mis proyectos',
      sectionTitle: 'Base editorial individual',
      emptyEyebrow: 'Estado inicial',
      emptyFallbackEyebrow: 'Modo degradado',
      emptyTitle: 'Aún no hay proyectos, pero el workspace ya está listo para abrir el primero.',
      emptyFallbackTitle: 'El dashboard sigue accesible aunque la lectura de proyectos haya fallado.',
      emptyDescription:
        'La experiencia premium no empieza cuando ya hay contenido. Empieza cuando el sistema te invita a crear con claridad desde el minuto uno.',
      emptyFallbackDescription:
        'Puedes seguir creando un proyecto nuevo mientras se recupera la capa de datos. Esto evita que la navegación principal termine en error 500.',
      emptyAction: 'Crear el primer proyecto',
    },
    project: {
      newEyebrow: 'Proyecto nuevo',
      newTitle: 'Crea el contenedor editorial base',
      newDescription:
        'Al crear el proyecto se generan documento, portada y contrato de edición para que el flujo completo arranque ya sobre el modelo canónico.',
      createFormEyebrow: 'Nuevo proyecto',
      createFormTitle: 'Crea una base editorial con estándar premium',
      createFormDescription:
        'El proyecto puede nacer vacío o a partir de un documento fuente real para arrancar con contenido útil desde el primer minuto.',
      titleLabel: 'Título del proyecto',
      titlePlaceholder: 'Ej. Manual de marca editorial 2026',
      sourceDocumentLabel: 'Documento base opcional',
      sourceDocumentHint:
        'Soporta `pdf`, `doc`, `docx`, `txt` y `md`. Si el archivo se puede extraer bien, el editor arrancará ya sembrado con ese contenido.',
      createProjectHint:
        'La creación persiste sobre Neon desde el primer paso y abre el editor con base importada si has adjuntado documento.',
      createProjectAction: 'Crear proyecto y abrir editor',
      cardPremium: 'Premium',
      cardUpdated: 'Actualizado',
      cardOpenEditor: 'Abrir editor',
      cardPreview: 'Preview',
      cardDelete: 'Eliminar',
      cardDeleteConfirm: '¿Seguro que quieres eliminar "{title}"? Esta acción no se puede deshacer.',
      editorEyebrow: 'Editor',
      editorOpenPreview: 'Abrir preview',
      editorOpenCover: 'Diseñar portada',
      editorMetaEyebrow: 'Metadatos',
      editorLiveEyebrow: 'Documento vivo',
      editorLiveDescription:
        'La edición persiste sobre el documento canónico. El preview lee exactamente este mismo contenido.',
      editorTitleLabel: 'Título',
      editorSubtitleLabel: 'Subtítulo',
      editorAuthorLabel: 'Autor',
      editorChapterLabel: 'Título del capítulo',
      saveChanges: 'Guardar cambios',
      previewEyebrow: 'Preview',
      previewTitle: 'Validación de lectura y portada',
      previewBackToEditor: 'Volver al editor',
      previewOpenCover: 'Abrir cover studio',
      previewCanvasEyebrow: 'Preview editorial',
      previewCoverEyebrow: 'Portada actual',
      editorialMapTitle: 'Mapa editorial',
      editorialMapDescription: 'Compara la estructura detectada del documento, los capítulos actuales y el reparto de páginas del preview.',
      editorialMapOriginalColumn: 'Documento detectado',
      editorialMapChaptersColumn: 'Capítulos actuales',
      editorialMapPagesColumn: 'Páginas del preview',
      coverEyebrow: 'Cover studio',
      coverTitle: 'Diseña y guarda la portada del proyecto',
      coverBackEditor: 'Editor',
      coverBackPreview: 'Preview',
      coverFormEyebrow: 'Portada persistente',
      coverTitleLabel: 'Título',
      coverSubtitleLabel: 'Subtítulo',
      coverAuthorLabel: 'Autor',
      coverPaletteLabel: 'Paleta',
      coverBackgroundLabel: 'Imagen de fondo',
      coverOpacityLabel: 'Opacidad de imagen',
      coverAdvancedSyncNotice:
        'Existe una portada avanzada asociada. Si guardas cambios aquí en título, subtítulo o autor, ese contenido también se actualizará en el editor avanzado, manteniendo su estilo actual: color, tamaño, espaciado y demás ajustes visuales.',
      backCoverAdvancedSyncNotice:
        'Existe una contraportada avanzada asociada. Si guardas cambios aquí en título, texto o biografía, ese contenido también se actualizará en el editor avanzado, manteniendo su estilo actual: color, tamaño, espaciado y demás ajustes visuales.',
      coverSave: 'Guardar portada',
      coverNoImage: 'Sin imagen subida',
      paletteObsidian: 'Obsidian',
      paletteTeal: 'Teal',
      paletteSand: 'Sand',
      importAnalyzing: 'Analizando documento...',
      importReady: 'Listo para importar',
      importChaptersDetected: '{count} capítulos detectados',
      importTitleDetected: 'Título detectado',
      importAuthorDetected: 'Autor detectado',
      importWarningsLabel: 'Revisión recomendada',
      importChapterPreviewLabel: 'Estructura detectada',
      importErrorGeneric: 'No se pudo analizar el documento',
      importFileTooLarge: 'El archivo es demasiado grande (máx. 50 MB)',
      importFormatUnsupported: 'Formato no compatible',
      coverOpenBackCover: 'Contraportada',
      advancedCoverEyebrow: 'Distribución',
      advancedCoverLayoutLabel: 'Distribución',
      advancedCoverFontLabel: 'Tipografía',
      advancedCoverAccentLabel: 'Color de acento',
      backCoverEyebrow: 'Contraportada',
      backCoverTitle: 'Diseña la contraportada del proyecto',
      backCoverFormEyebrow: 'Contraportada persistente',
      backCoverTitleLabel: 'Título del autor',
      backCoverBodyLabel: 'Texto de contraportada',
      backCoverBodyPlaceholder: 'Resumen o blurb del proyecto...',
      backCoverAuthorBioLabel: 'Biografía del autor',
      backCoverSave: 'Guardar contraportada',
      backCoverBackToCover: 'Portada',
      previewExportButton: 'Exportar HTML',
      previewExportFilename: 'proyecto',
      previewExportPdfButton: 'Exportar PDF',
      coverRenderImage: 'Generar imagen',
      coverRenderImageDone: 'Imagen guardada',
      coverRenderedImageLabel: 'Imagen renderizada',
      coverSwitchToAdvanced: 'Editor Avanzado',
      coverSwitchToBasic: 'Editor Básico',
      stepContent: 'Contenido',
      stepChapters: 'Capítulos',
      stepTemplate: 'Plantilla',
      stepCover: 'Portada',
      stepBackCover: 'Contraportada',
      stepPreview: 'PREVIEW',
      stepCollaborate: 'Colaborar',
      stepAI: 'IA',
      stepExport: 'Exportar',
      stepContentDesc: 'Escribe y estructura el contenido principal de tu publicación.',
      stepChaptersDesc: 'Organiza los capítulos y la jerarquía de tu documento.',
      stepTemplateDesc: 'Selecciona una identidad visual premium para tu libro.',
      stepCoverDesc: 'Diseña una portada impactante con imágenes y paletas personalizadas.',
      stepBackCoverDesc: 'Configura la contraportada y la biografía del autor.',
      stepPreviewDesc: 'Valida la experiencia de lectura final en diferentes dispositivos.',
      stepCollaborateDesc: 'Gestiona el acceso de tu equipo y revisores al proyecto.',
      stepAIDesc: 'Potencia tu contenido con sugerencias inteligentes de IA.',
      stepExportDesc: 'Publica y descarga tu obra en múltiples formatos profesionales.',
      previewModalZoomOut: 'Reducir zoom',
      previewModalZoomIn: 'Aumentar zoom',
      previewModalSingleView: 'Vista de 1 página',
      previewModalSpreadView: 'Vista de 2 páginas',
      previewModalLaptop: 'Laptop (6x9)',
      previewModalTablet: 'Tablet (5.5x8.5)',
      previewModalMobile: 'Móvil (3.7x6.2)',
      previewModalPrevious: 'Anterior',
      previewModalNext: 'Siguiente',
      previewModalPage: 'Página',
      previewModalOf: 'de',
      previewModalClose: 'Cerrar',
      previewModalAdvanced: 'Vista previa avanzada',
      previewModalTocShow: 'Mostrar índice',
      previewModalTocHide: 'Ocultar índice',
      previewModalTocHeading: 'Índice',
      previewModalZoomSlider: 'Nivel de zoom de la vista previa',
      previewModalEmptyState: 'Sin contenido para mostrar',
      previewModalUntitledProject: 'Proyecto sin título',
      previewModalUntitledChapter: 'Capítulo sin título',
      previewModalCoverAlt: 'Portada de vista previa',
      previewModalBackCoverAlt: 'Contraportada de vista previa',
    },
  },
  en: {
    shell: {
      brand: 'Anclora Talent',
      badge: 'Premium App',
      contractEyebrow: 'Contract',
      contractTitle: 'Premium editorial workspace',
      contractDescription:
        'Protected identity, real persistence, and an experience that keeps the same visual level from entry to production.',
      navDashboard: 'Dashboard',
      navNewProject: 'New project',
      navProjects: 'My projects',
      stackEyebrow: 'Active stack',
      stackTitle: 'Clerk + Neon + Blob',
      stackDescription:
        'The individual account remains the active unit, but the experience already presents itself as a premium product, not as a technical shell.',
      topbarEyebrow: 'App shell',
      topbarTitle: 'Personal editorial workspace',
      themeLabel: 'Theme',
      localeLabel: 'Language',
      themeDark: 'Dark',
      themeLight: 'Light',
      localeSpanish: 'ES',
      localeEnglish: 'EN',
    },
    auth: {
      signIn: {
        eyebrow: 'Premium access',
        title: 'Return to your editorial workspace with an experience that matches the product.',
        description:
          'Access your projects, recover context, and continue where you left off without breaking visual or operational continuity.',
        accent: 'Recover rhythm, focus, and consistency in seconds.',
      },
      signUp: {
        eyebrow: 'Premium signup',
        title: 'Enter Anclora Talent through an access layer that already feels like product.',
        description:
          'Create your account and start working on a real, persistent, and visually coherent editorial flow from the first minute.',
        accent: 'Signup, project, editor, preview, and cover inside the same system.',
      },
      pillars: ['Protected identity', 'Real persistence', 'Premium finish'],
      contractEyebrow: 'Product contract',
    },
    landing: {
      eyebrow: 'Anclora Talent',
      headline: 'Turn talent into an editorial presence ready to publish.',
      subheadline:
        'Create your account, launch your project, and work across document, preview, and cover from a single platform.',
      proofEyebrow: 'Confidence',
      workflowEyebrow: 'Flow',
      workflowTitle: 'Three steps to start without friction',
      workflowDescription:
        'The landing should reduce the distance between promise and action. Here the user understands the journey before signing up.',
      workflowAdvance: 'Continue',
      workflowStepLabel: 'Step',
      productEyebrow: 'Product',
      productTitle: 'A platform where document, preview, and cover stop competing with each other.',
      productDescription:
        'The user should not need to interpret technical layers. They need to see how document, preview, and cover fit into one experience.',
      benefitsEyebrow: 'Benefits',
      benefitsTitle: 'What the user gains on every visit',
      finalEyebrow: 'Next step',
      finalTitle: 'Open your account and start from a base that already looks like product.',
      finalNote:
        'Start with your own account, create your first project, and work from a base that already communicates clarity, consistency, and real output.',
      proofItems: [
        'Persistent projects from day one',
        'Document, preview, and cover in one flow',
        'Authenticated access ready for production',
      ],
      workflowSteps: [
        {
          title: 'Create your account',
          description: 'Enter in seconds and prepare your workspace.',
        },
        {
          title: 'Launch your project',
          description: 'Start from a canonical document and a clear structure.',
        },
        {
          title: 'Edit and publish',
          description: 'Turn drafts into a coherent editorial presence.',
        },
      ],
      showcasePanels: [
        {
          title: 'Canonical document',
          description: 'A single source of truth for editorial content.',
          accent: 'Structure',
          bullets: ['Consistent titles', 'Editable blocks', 'Reusable base'],
        },
        {
          title: 'Connected preview',
          description: 'Visual reading reflects what you will actually publish.',
          accent: 'Clarity',
          bullets: ['Immediate view', 'Consistent editing', 'Less friction'],
        },
        {
          title: 'Persistent cover',
          description: 'Images and assets prepared for repeated use.',
          accent: 'Finish',
          bullets: ['Saved cover', 'Assets in Blob', 'Lossless reuse'],
        },
      ],
      benefits: [
        {
          title: 'More clarity',
          description: 'Every project follows a structure that is quickly understood.',
        },
        {
          title: 'More speed',
          description: 'Fewer redundant decisions to move from idea to publication.',
        },
        {
          title: 'More consistency',
          description: 'Document, cover, and preview work from the same narrative.',
        },
      ],
    },
    dashboard: {
      eyebrow: 'Premium dashboard',
      title: 'Your editorial projects already live inside an app that feels like a real product.',
      description:
        'Auth, document, preview, and cover are already aligned. Now daily access also has to communicate value, control, and premium finish.',
      createProject: 'Create new project',
      projectsEyebrow: 'Projects',
      statusEyebrow: 'Status',
      contractEyebrow: 'Contract',
      statusActive: 'Active and persistent base',
      statusEmpty: 'Ready for the first project',
      statusFallback: 'Operational fallback enabled',
      contractReady: 'Premium app operational',
      contractFallback: 'Access stays up during data failure',
      sectionEyebrow: 'My projects',
      sectionTitle: 'Individual editorial base',
      emptyEyebrow: 'Initial state',
      emptyFallbackEyebrow: 'Degraded mode',
      emptyTitle: 'There are no projects yet, but the workspace is ready to open the first one.',
      emptyFallbackTitle: 'The dashboard stays available even if project loading fails.',
      emptyDescription:
        'The premium experience does not start only when content exists. It starts when the system invites you to create with clarity from minute one.',
      emptyFallbackDescription:
        'You can still create a new project while the data layer recovers. This prevents the main navigation from ending in a 500 error.',
      emptyAction: 'Create the first project',
    },
    project: {
      newEyebrow: 'New project',
      newTitle: 'Create the base editorial container',
      newDescription:
        'Creating the project generates the document, cover, and editing contract so the full flow starts on the canonical model.',
      createFormEyebrow: 'New project',
      createFormTitle: 'Create an editorial base with premium standards',
      createFormDescription:
        'The project can start empty or from a real source document so you begin with useful content from the first minute.',
      titleLabel: 'Project title',
      titlePlaceholder: 'Ex. Editorial brand manual 2026',
      sourceDocumentLabel: 'Optional source document',
      sourceDocumentHint:
        'Supports `pdf`, `doc`, `docx`, `txt`, and `md`. If extraction succeeds, the editor starts already seeded with that content.',
      createProjectHint:
        'Creation persists to Neon from the first step and opens the editor with imported content if you attached a document.',
      createProjectAction: 'Create project and open editor',
      cardPremium: 'Premium',
      cardUpdated: 'Updated',
      cardOpenEditor: 'Open editor',
      cardPreview: 'Preview',
      cardDelete: 'Delete',
      cardDeleteConfirm: 'Are you sure you want to delete "{title}"? This action cannot be undone.',
      editorEyebrow: 'Editor',
      editorOpenPreview: 'Open preview',
      editorOpenCover: 'Design cover',
      editorMetaEyebrow: 'Metadata',
      editorLiveEyebrow: 'Live document',
      editorLiveDescription:
        'Editing persists on the canonical document. Preview reads this exact same content.',
      editorTitleLabel: 'Title',
      editorSubtitleLabel: 'Subtitle',
      editorAuthorLabel: 'Author',
      editorChapterLabel: 'Chapter title',
      saveChanges: 'Save changes',
      previewEyebrow: 'Preview',
      previewTitle: 'Reading and cover validation',
      previewBackToEditor: 'Back to editor',
      previewOpenCover: 'Open cover studio',
      previewCanvasEyebrow: 'Editorial preview',
      previewCoverEyebrow: 'Current cover',
      editorialMapTitle: 'Editorial map',
      editorialMapDescription: 'Compare the detected source structure, current chapters, and preview page distribution at a glance.',
      editorialMapOriginalColumn: 'Detected document',
      editorialMapChaptersColumn: 'Current chapters',
      editorialMapPagesColumn: 'Preview pages',
      coverEyebrow: 'Cover studio',
      coverTitle: 'Design and save the project cover',
      coverBackEditor: 'Editor',
      coverBackPreview: 'Preview',
      coverFormEyebrow: 'Persistent cover',
      coverTitleLabel: 'Title',
      coverSubtitleLabel: 'Subtitle',
      coverAuthorLabel: 'Author',
      coverPaletteLabel: 'Palette',
      coverBackgroundLabel: 'Background image',
      coverOpacityLabel: 'Image opacity',
      coverAdvancedSyncNotice:
        'An advanced cover already exists. If you save title, subtitle, or author changes here, that content will also update in the advanced editor while preserving its current styling: color, size, spacing, and other visual settings.',
      backCoverAdvancedSyncNotice:
        'An advanced back cover already exists. If you save title, body, or author bio changes here, that content will also update in the advanced editor while preserving its current styling: color, size, spacing, and other visual settings.',
      coverSave: 'Save cover',
      coverNoImage: 'No uploaded image',
      paletteObsidian: 'Obsidian',
      paletteTeal: 'Teal',
      paletteSand: 'Sand',
      importAnalyzing: 'Analyzing document...',
      importReady: 'Ready to import',
      importChaptersDetected: '{count} chapters detected',
      importTitleDetected: 'Detected title',
      importAuthorDetected: 'Detected author',
      importWarningsLabel: 'Recommended review',
      importChapterPreviewLabel: 'Detected structure',
      importErrorGeneric: 'Could not analyze the document',
      importFileTooLarge: 'File is too large (max. 50 MB)',
      importFormatUnsupported: 'Format not supported',
      coverOpenBackCover: 'Back cover',
      advancedCoverEyebrow: 'Layout',
      advancedCoverLayoutLabel: 'Layout',
      advancedCoverFontLabel: 'Typography',
      advancedCoverAccentLabel: 'Accent color',
      backCoverEyebrow: 'Back cover',
      backCoverTitle: 'Design the project back cover',
      backCoverFormEyebrow: 'Persistent back cover',
      backCoverTitleLabel: 'Author title',
      backCoverBodyLabel: 'Back cover text',
      backCoverBodyPlaceholder: 'Project summary or blurb...',
      backCoverAuthorBioLabel: 'Author bio',
      backCoverSave: 'Save back cover',
      backCoverBackToCover: 'Cover',
      previewExportButton: 'Export HTML',
      previewExportFilename: 'project',
      previewExportPdfButton: 'Export PDF',
      coverRenderImage: 'Generate image',
      coverRenderImageDone: 'Image saved',
      coverRenderedImageLabel: 'Rendered image',
      coverSwitchToAdvanced: 'Advanced Editor',
      coverSwitchToBasic: 'Basic Editor',
      stepContent: 'Content',
      stepChapters: 'Chapters',
      stepTemplate: 'Template',
      stepCover: 'Cover',
      stepBackCover: 'Back Cover',
      stepPreview: 'Preview',
      stepCollaborate: 'Collaborate',
      stepAI: 'AI',
      stepExport: 'Export',
      stepContentDesc: 'Write and structure the main content of your publication.',
      stepChaptersDesc: 'Organize the chapters and hierarchy of your document.',
      stepTemplateDesc: 'Select a premium visual identity for your book.',
      stepCoverDesc: 'Design a striking cover with custom images and palettes.',
      stepBackCoverDesc: 'Configure the back cover and author biography.',
      stepPreviewDesc: 'Validate the final reading experience across different devices.',
      stepCollaborateDesc: 'Manage team and reviewer access to the project.',
      stepAIDesc: 'Enhance your content with smart AI suggestions.',
      stepExportDesc: 'Publish and download your work in multiple professional formats.',
      previewModalZoomOut: 'Zoom out',
      previewModalZoomIn: 'Zoom in',
      previewModalSingleView: 'Single page view',
      previewModalSpreadView: 'Two page view',
      previewModalLaptop: 'Laptop (6x9)',
      previewModalTablet: 'Tablet (5.5x8.5)',
      previewModalMobile: 'Mobile (3.7x6.2)',
      previewModalPrevious: 'Previous',
      previewModalNext: 'Next',
      previewModalPage: 'Page',
      previewModalOf: 'of',
      previewModalClose: 'Close',
      previewModalAdvanced: 'Advanced preview',
      previewModalTocShow: 'Show table of contents',
      previewModalTocHide: 'Hide table of contents',
      previewModalTocHeading: 'Table of contents',
      previewModalZoomSlider: 'Preview zoom level',
      previewModalEmptyState: 'No content to display',
      previewModalUntitledProject: 'Untitled project',
      previewModalUntitledChapter: 'Untitled chapter',
      previewModalCoverAlt: 'Preview cover',
      previewModalBackCoverAlt: 'Preview back cover',
    },
  },
};

export function resolveLocaleMessages(locale: UiLocale): AppMessages {
  return appMessages[locale];
}
