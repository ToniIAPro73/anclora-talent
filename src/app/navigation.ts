import {
  BookOpenText,
  Eye,
  FileUp,
  LayoutDashboard,
  Palette,
  Route,
} from 'lucide-react';
import type { AppScreen } from './types';

export const navigationItems: Array<{
  id: AppScreen;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Estado del producto y del MVP.',
    icon: LayoutDashboard,
  },
  {
    id: 'upload',
    label: 'Importación',
    description: 'Entrada documental y normalización.',
    icon: FileUp,
  },
  {
    id: 'editor',
    label: 'Editor',
    description: 'Documento estructurado por bloques.',
    icon: BookOpenText,
  },
  {
    id: 'cover',
    label: 'Portadas',
    description: 'Estudio visual y plantillas.',
    icon: Palette,
  },
  {
    id: 'preview',
    label: 'Preview',
    description: 'Simulación editorial y exportación.',
    icon: Eye,
  },
  {
    id: 'strategy',
    label: 'Roadmap',
    description: 'Fases y criterios de entrega.',
    icon: Route,
  },
];
