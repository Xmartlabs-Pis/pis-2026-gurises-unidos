import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Button } from '@/components/ui/button';

test('renders the button label', () => {
  render(<Button>Guardar</Button>);
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDefined();
});
