import { fireEvent, render, screen } from '@testing-library/react';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { PRODUCT_TEMPLATES } from '@/lib/templates/product-templates';
import { ProductTemplateSelector } from './ProductTemplateSelector';

describe('ProductTemplateSelector', () => {
  it('renders the five product templates with ES benefit copy', () => {
    render(<ProductTemplateSelector copy={resolveLocaleMessages('es').project} />);

    expect(screen.getByTestId('product-template-selector')).toBeInTheDocument();
    for (const template of PRODUCT_TEMPLATES) {
      expect(screen.getByTestId(`product-template-${template.id}`)).toBeInTheDocument();
    }
    expect(screen.getByText('Libro estándar')).toBeInTheDocument();
    expect(screen.getByText('Guía / lead magnet')).toBeInTheDocument();
  });

  it('renders the five templates with EN copy', () => {
    render(<ProductTemplateSelector copy={resolveLocaleMessages('en').project} />);

    expect(screen.getByText('Standard book')).toBeInTheDocument();
    expect(screen.getByText('Modular course')).toBeInTheDocument();
    expect(screen.getByText('Bundle')).toBeInTheDocument();
  });

  it('defaults to the standard book and submits the chosen template id', () => {
    render(<ProductTemplateSelector copy={resolveLocaleMessages('es').project} />);

    const input = screen.getByTestId('product-template-input');
    expect(input).toHaveValue('standard-book');
    expect(screen.getByTestId('product-template-standard-book')).toHaveAttribute(
      'data-selected',
      'true',
    );

    fireEvent.click(screen.getByTestId('product-template-modular-course'));

    expect(input).toHaveValue('modular-course');
    expect(screen.getByTestId('product-template-modular-course')).toHaveAttribute(
      'data-selected',
      'true',
    );
    expect(screen.getByTestId('product-template-standard-book')).toHaveAttribute(
      'data-selected',
      'false',
    );
  });
});
