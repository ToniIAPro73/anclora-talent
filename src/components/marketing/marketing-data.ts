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
  image?: string;
};

export type MarketingBenefit = {
  title: string;
  description: string;
};

export type MarketingBentoPillar = {
  title: string;
  description: string;
  tag: string;
  image: string;
  features: readonly string[];
};

export type MarketingShowcaseItem = {
  category: string;
  title: string;
  author: string;
  tagline: string;
  specs: string;
  coverGradient?: string;
};

export type MarketingUseCase = {
  title: string;
  role: string;
  description: string;
  points: readonly string[];
};

export type MarketingFaqItem = {
  question: string;
  answer: string;
};

export type MarketingNav = {
  features: string;
  studio: string;
  showcase: string;
  useCases: string;
  pricing: string;
  faq: string;
  signIn: string;
  signUp: string;
  dashboard: string;
  toggleTheme: string;
  toggleLocale: string;
  openMenu: string;
  closeMenu: string;
};

export const marketingProofItems: MarketingProofItem[] = [
  'Exportación profesional a PDF, EPUB, DOCX y HTML sin dependencias',
  'Maquetación tipográfica avanzada con previsualización en doble pliego',
  'Estudio visual de portada y contraportada con canvas milimétrico',
  'Control absoluto del autor: tus manuscritos son 100% de tu propiedad',
];

export const marketingWorkflowSteps: MarketingWorkflowStep[] = [
  {
    title: '1. Escribe o importa tu manuscrito',
    description: 'Comienza desde cero o importa tus archivos Word DOCX o PDF con detección inteligente de capítulos y formato limpio.',
  },
  {
    title: '2. Compón y afina la tipografía',
    description: 'Ajusta jerarquías, fuentes, márgenes e interlineado con previsualización fidedigna en doble pliego de libro.',
  },
  {
    title: '3. Diseña cubiertas y exporta',
    description: 'Crea la portada y contraportada sobre el canvas visual y genera archivos finales listos para imprenta o distribución digital.',
  },
];

export const marketingShowcasePanels: MarketingShowcasePanel[] = [
  {
    title: 'Taller de Edición y Composición',
    description: 'Editor tipográfico centrado en el ritmo de lectura con soporte para capítulos, foliado y márgenes nobles.',
    accent: 'Tipografía',
    bullets: ['Estructura limpia por capítulos', 'Ajuste milimétrico de márgenes', 'Control de fuentes y sangrías'],
    image: '/landing/hero/editor-preview.png',
  },
  {
    title: 'Visor de Pliego y Lectura',
    description: 'Simula la experiencia física del libro con vista de doble página y adaptación a tabletas, móviles y e-readers.',
    accent: 'Previsualización',
    bullets: ['Modo de doble pliego abierto', 'Inspección fiel a la página impresa', 'Transición inmediata sin recargas'],
    image: '/landing/features/preview-spread.png',
  },
  {
    title: 'Estudio Visual de Portadas',
    description: 'Diseña portadas y contraportadas impactantes con canvas interactivo, cálculo de lomo y tratamiento gráfico preciso.',
    accent: 'Cubiertas',
    bullets: ['Lienzo de alta resolución', 'Diseño de frontal y contraportada', 'Exportación directa multiformato'],
    image: '/landing/hero/cover-preview.png',
  },
];

export const marketingBenefitItems: MarketingBenefit[] = [
  {
    title: 'Pureza tipográfica',
    description: 'Tipografías seleccionadas para una legibilidad superior, con jerarquías y proporciones calibradas por defecto.',
  },
  {
    title: 'Agilidad de publicación',
    description: 'Pasa de borrador a archivo final en horas en lugar de semanas, sin pelear con estilos huérfanos o saltos de página rotos.',
  },
  {
    title: 'Soberanía del contenido',
    description: 'Tus datos no quedan atrapados en formatos propietarios. Exporta en cualquier momento a Word, PDF, EPUB o HTML.',
  },
];
