import HorasFiltradasPage from 'src/components/dhn/horas/HorasFiltradasPage';

const HorasNocturnasPage = () => (
  <HorasFiltradasPage
    filtroFijo="conNocturnas"
    title="Horas nocturnas"
    descripcion="Trabajos diarios con alguna hora nocturna registrada (Noct., Noct. 50%, Noct. 100%)."
  />
);

export default HorasNocturnasPage;
