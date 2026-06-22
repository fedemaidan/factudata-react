import { useRouter } from 'next/router';
import { Tabs, Tab } from '@mui/material';

const ITEMS = [
  { label: 'Mis obras', href: '/control-obra' },
  { label: 'Cobranzas', href: '/control-obra/cobranzas' },
  { label: 'Pagos a obra', href: '/control-obra/pagos' },
];

// Navegación de la capa de cartera (cross-obra).
export default function CarteraNav() {
  const router = useRouter();
  const current = ITEMS.findIndex((i) => i.href === router.pathname);
  return (
    <Tabs value={current === -1 ? 0 : current} sx={{ mb: 2 }}>
      {ITEMS.map((i) => (
        <Tab key={i.href} label={i.label} onClick={() => router.push(i.href)} />
      ))}
    </Tabs>
  );
}
