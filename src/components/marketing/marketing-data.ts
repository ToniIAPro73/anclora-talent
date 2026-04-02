export type MarketingProofItem = string;

export type MarketingWorkflowStep = {
  title: string;
  description: string;
};

export type MarketingShowcasePanel = {
  title: string;
  description: string;
  accent?: string;
  bullets?: readonly string[];
};

export type MarketingBenefit = {
  title: string;
  description: string;
};

export const marketingProofItems: MarketingProofItem[] = [
  'Proyectos persistentes desde el primer dia',
  'Documento, preview y portada en un mismo flujo',
  'Acceso autenticado y listo para produccion',
];

export const marketingWorkflowSteps: MarketingWorkflowStep[] = [
  {
    title: 'Crea tu cuenta',
    description: 'Entra en segundos y deja listo tu espacio de trabajo.',
  },
  {
    title: 'Lanza tu proyecto',
    description: 'Parte de un documento canonico y una estructura clara.',
  },
  {
    title: 'Edita y publica',
    description: 'Convierte borradores en una presencia editorial coherente.',
  },
];

export const marketingShowcasePanels: MarketingShowcasePanel[] = [
  {
    title: 'Documento canonico',
    description: 'Una sola fuente de verdad para el contenido editorial.',
    accent: 'Estructura',
    bullets: ['Titulos consistentes', 'Bloques editables', 'Base reutilizable'],
  },
  {
    title: 'Preview conectado',
    description: 'La lectura visual refleja lo que realmente vas a publicar.',
    accent: 'Claridad',
    bullets: ['Vista inmediata', 'Edicion coherente', 'Menos friccion'],
  },
  {
    title: 'Portada persistente',
    description: 'Imagenes y assets preparados para un uso repetido.',
    accent: 'Acabado',
    bullets: ['Cover guardada', 'Assets en Blob', 'Reuso sin perdida'],
  },
];

export const marketingBenefitItems: MarketingBenefit[] = [
  {
    title: 'Mas claridad',
    description: 'Cada proyecto sigue una estructura que se entiende rapido.',
  },
  {
    title: 'Mas velocidad',
    description: 'Menos decisiones redundantes para pasar de idea a publicacion.',
  },
  {
    title: 'Mas consistencia',
    description: 'Documento, portada y preview trabajan sobre el mismo relato.',
  },
];
