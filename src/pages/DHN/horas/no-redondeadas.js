import HorasFiltradasPage from 'src/components/dhn/horas/HorasFiltradasPage';

const HorasNoRedondeadasPage = () => (
  <HorasFiltradasPage
    filtroFijo="noRedondeadas"
    title="Horas no redondeadas"
    descripcion="Trabajos diarios con algún campo de horas que no sea un número entero (por ejemplo 8.5 o 8.2)."
  />
);

export default HorasNoRedondeadasPage;
