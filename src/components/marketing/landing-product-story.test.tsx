import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LandingProductStory, type ProductMoment } from './landing-product-story';

const mockMoments: ProductMoment[] = [
  {
    id: 'editor',
    badge: '01 · Escritura & Tipografía',
    title: 'Taller de edición con tipografía viva',
    description: 'Escribe o importa tu manuscrito con detección inteligente de capítulos.',
    pills: ['Capítulos dinámicos', 'Jerarquía de texto', 'Márgenes proporcionados'],
    imageDark: '/landing/features/editor-preview-dark.png',
    imageLight: '/landing/features/editor-preview-light.png',
    altDark: 'Editor de capítulos (oscuro)',
    altLight: 'Editor de capítulos (claro)',
  },
  {
    id: 'spread',
    badge: '02 · Doble Pliego Real',
    title: 'Inspección de pliego físico antes de imprenta',
    description: 'Experimenta el ritmo de lectura del libro físico con vista enfrentada.',
    pills: ['Doble pliego enfrentado', 'Foliado automático', 'Ajuste visual'],
    imageDark: '/landing/features/preview-spread-dark.png',
    imageLight: '/landing/features/preview-spread-light.png',
    altDark: 'Visor de doble pliego (oscuro)',
    altLight: 'Visor de doble pliego (claro)',
  },
  {
    id: 'cover',
    badge: '03 · Estudio de Cubierta',
    title: 'Diseño integral de portada y contraportada',
    description: 'Lienzo milimétrico para componer la portada y contraportada.',
    pills: ['Lienzo frontal y dorso', 'Tipografía editorial', 'Exportación PDF y EPUB'],
    imageDark: '/landing/features/cover-studio-dark.png',
    imageLight: '/landing/features/cover-studio-light.png',
    altDark: 'Estudio de portada (oscuro)',
    altLight: 'Estudio de portada (claro)',
    backImageDark: '/landing/features/cover-studio-back-dark.png',
    backImageLight: '/landing/features/cover-studio-back-light.png',
    backAltDark: 'Estudio de contraportada (oscuro)',
    backAltLight: 'Estudio de contraportada (claro)',
    hasBackCoverToggle: true,
  },
];

describe('LandingProductStory', () => {
  it('renders section heading and all 3 product moments', () => {
    render(
      <LandingProductStory
        eyebrow="Flujo Editorial Unificado"
        title="De manuscrito a libro terminado en un solo lugar"
        description="Sin herramientas dispersas."
        moments={mockMoments}
        frontLabel="Portada"
        backLabel="Contraportada"
        viewLabel="Vista:"
      />
    );

    expect(screen.getByText('Flujo Editorial Unificado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'De manuscrito a libro terminado en un solo lugar' })).toBeInTheDocument();
    expect(screen.getByText('Taller de edición con tipografía viva')).toBeInTheDocument();
    expect(screen.getByText('Inspección de pliego físico antes de imprenta')).toBeInTheDocument();
    expect(screen.getByText('Diseño integral de portada y contraportada')).toBeInTheDocument();
  });

  it('renders pills for each moment', () => {
    render(
      <LandingProductStory
        eyebrow="Flujo"
        title="Libro"
        description="Desc"
        moments={mockMoments}
      />
    );

    expect(screen.getByText('Capítulos dinámicos')).toBeInTheDocument();
    expect(screen.getByText('Doble pliego enfrentado')).toBeInTheDocument();
    expect(screen.getByText('Lienzo frontal y dorso')).toBeInTheDocument();
  });

  it('handles cover front/back view toggling with viewLabel', () => {
    render(
      <LandingProductStory
        eyebrow="Flujo"
        title="Libro"
        description="Desc"
        moments={mockMoments}
        frontLabel="Frontal"
        backLabel="Dorso"
        viewLabel="Perspectiva:"
      />
    );

    expect(screen.getByText('Perspectiva:')).toBeInTheDocument();
    const backBtn = screen.getByRole('button', { name: 'Dorso' });
    const frontBtn = screen.getByRole('button', { name: 'Frontal' });

    expect(backBtn).toBeInTheDocument();
    expect(frontBtn).toBeInTheDocument();

    // Click back view
    fireEvent.click(backBtn);
    expect(screen.getByAltText('Estudio de contraportada (oscuro)')).toBeInTheDocument();
    expect(screen.getByAltText('Estudio de contraportada (claro)')).toBeInTheDocument();

    // Click front view
    fireEvent.click(frontBtn);
    expect(screen.getByAltText('Estudio de portada (oscuro)')).toBeInTheDocument();
  });
});
