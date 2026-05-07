import { normalizarNombre, buscarCanonicoEnLista } from '../normalizarNombre';

describe('normalizarNombre (frontend)', () => {
  test('lowercase + trim', () => {
    expect(normalizarNombre('  Mano de Obra  ')).toBe('mano de obra');
  });

  test('quita acentos', () => {
    expect(normalizarNombre('Categoría Única')).toBe('categoria unica');
  });

  test('colapsa espacios', () => {
    expect(normalizarNombre('Mano   de   obra')).toBe('mano de obra');
  });

  test('null/undefined', () => {
    expect(normalizarNombre(null)).toBe('');
    expect(normalizarNombre(undefined)).toBe('');
  });
});

describe('buscarCanonicoEnLista (frontend)', () => {
  const empresaCategorias = [
    { name: 'Mano de Obra' },
    { name: 'Materiales' },
    { name: 'Administración' },
  ];

  test('match exacto', () => {
    expect(buscarCanonicoEnLista('Materiales', empresaCategorias))
      .toEqual({ estado: 'existe', canonico: 'Materiales' });
  });

  test('match por case → variante', () => {
    expect(buscarCanonicoEnLista('mano de obra', empresaCategorias))
      .toEqual({ estado: 'variante', canonico: 'Mano de Obra' });
  });

  test('match por acentos → variante', () => {
    expect(buscarCanonicoEnLista('Administracion', empresaCategorias))
      .toEqual({ estado: 'variante', canonico: 'Administración' });
  });

  test('sin match → nueva', () => {
    expect(buscarCanonicoEnLista('Comida', empresaCategorias))
      .toEqual({ estado: 'nueva', canonico: null });
  });

  test('lista de strings', () => {
    expect(buscarCanonicoEnLista('don pedro', ['DON PEDRO', 'Otro']))
      .toEqual({ estado: 'variante', canonico: 'DON PEDRO' });
  });

  test('detectado vacío', () => {
    expect(buscarCanonicoEnLista('', empresaCategorias))
      .toEqual({ estado: 'nueva', canonico: null });
  });
});
