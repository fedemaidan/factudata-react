const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const pad2 = (n) => String(n).padStart(2, "0");

const formatYMD = (year, monthIndex, day) =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

const lastDayOfMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

const getQuincenaActual = (referenceDate) => {
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
  const day = referenceDate.getDate();
  const q = day <= 15 ? 1 : 2;
  return { year, monthIndex, q };
};

const stepBackQuincena = ({ year, monthIndex, q }) => {
  if (q === 2) {
    return { year, monthIndex, q: 1 };
  }
  if (monthIndex === 0) {
    return { year: year - 1, monthIndex: 11, q: 2 };
  }
  return { year, monthIndex: monthIndex - 1, q: 2 };
};

const buildQuincena = ({ year, monthIndex, q }) => {
  const desdeDay = q === 1 ? 1 : 16;
  const hastaDay = q === 1 ? 15 : lastDayOfMonth(year, monthIndex);
  return {
    key: `${year}-${pad2(monthIndex + 1)}-Q${q}`,
    label: `Quincena ${q} - ${MESES_ES[monthIndex]} ${year}`,
    desde: formatYMD(year, monthIndex, desdeDay),
    hasta: formatYMD(year, monthIndex, hastaDay),
    year,
    monthIndex,
    q,
  };
};

export const getQuincenas = ({ count = 3, offset = 0, referenceDate = new Date() } = {}) => {
  let cursor = getQuincenaActual(referenceDate);
  for (let i = 0; i < offset; i += 1) {
    cursor = stepBackQuincena(cursor);
  }
  const list = [cursor];
  for (let i = 1; i < count; i += 1) {
    list.unshift(stepBackQuincena(list[0]));
  }
  return list.map(buildQuincena);
};

export const isQuincenaActual = (quincena, referenceDate = new Date()) => {
  const actual = getQuincenaActual(referenceDate);
  return (
    quincena.year === actual.year &&
    quincena.monthIndex === actual.monthIndex &&
    quincena.q === actual.q
  );
};
