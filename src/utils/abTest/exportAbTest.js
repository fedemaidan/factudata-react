/**
 * exportAbTest.js
 *
 * Exporta los datos de las páginas de A/B test a PDF y TXT.
 * Usa jsPDF + jspdf-autotable (ya en el proyecto).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num, den) {
    if (!den || den === 0) return '0%';
    return ((num / den) * 100).toFixed(1) + '%';
}

function formatDateStr(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function safeNum(v) {
    const n = Number(v);
    return isFinite(n) ? n : 0;
}

function safeMetric(metricas, variante, key) {
    const v = metricas?.[variante];
    if (!v) return 0;
    return safeNum(v[key]);
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, filename);
}

function buildContactosRows(contactos) {
    const listaA = (contactos?.A || []).map(c => ({ ...c, variante: 'A' }));
    const listaB = (contactos?.B || []).map(c => ({ ...c, variante: 'B' }));
    const lista = [...listaA, ...listaB].sort((a, b) =>
        a.variante.localeCompare(b.variante) || (a.nombre || '').localeCompare(b.nombre || '')
    );
    return lista.map(c => {
        const f = c._flags || {};
        const flag = v => (v ? '✓' : '—');
        return [
            `V${c.variante}`,
            c.nombre || '—',
            c.telefono || '—',
            c.estado || '—',
            flag(f.completaron),
            flag(f.abrieronLink),
            flag(f.agendaronReunion),
            flag(f.crearonEmpresaReal),
            flag(f.generaronMovimiento),
            String(f.mensajes ?? '—'),
            (f.llamadasAtendidas || f.llamadasNoAtendidas) ? `${f.llamadasAtendidas || 0}/${f.llamadasNoAtendidas || 0}` : '—',
            String(f.mensajesWA ?? '—'),
        ];
    });
}


// ─── Export A/B Test (abTestContactActivation) ───────────────────────────────

/**
 * Genera los datos tabulares del test para usar en PDF y TXT.
 */
function buildTestData(test) {
    const { metricas, nombre, estado, fechaInicio, fechaFin } = test;

    const tA = safeMetric(metricas, 'A', 'contactos');
    const tB = safeMetric(metricas, 'B', 'contactos');

    const rows = [
        { label: 'Contactos (Asignados)',     keyA: 'contactos',         keyB: 'contactos',         showPct: false },
        { label: 'Probaron',                   keyA: 'probaron',           keyB: 'probaron',           showPct: true },
        { label: 'Completaron gasto',          keyA: 'completaron',        keyB: 'completaron',        showPct: true },
        { label: 'Abrieron link agendar',      keyA: 'abrieronLink',       keyB: 'abrieronLink',       showPct: true },
        { label: 'Timeouts (1h)',              keyA: 'timeouts',           keyB: 'timeouts',           showPct: true },
        { label: 'Agendaron reunión real',     keyA: 'agendaronReunion',   keyB: 'agendaronReunion',   showPct: true },
        { label: 'Pidieron demo (voluntario)', keyA: 'pidieronDemo',       keyB: 'pidieronDemo',       showPct: true },
        { label: 'Generaron movimiento',       keyA: 'generaronMovimiento',keyB: 'generaronMovimiento',showPct: true },
        { label: 'Crearon empresa real',       keyA: 'crearonEmpresaReal', keyB: 'crearonEmpresaReal', showPct: true },
    ];

    // Promedio de mensajes (fila especial)
    const msgA = safeMetric(metricas, 'A', 'mensajesEnviados');
    const msgB = safeMetric(metricas, 'B', 'mensajesEnviados');
    const avgA = tA > 0 ? (msgA / tA).toFixed(1) : '0';
    const avgB = tB > 0 ? (msgB / tB).toFixed(1) : '0';

    const tableBody = rows.map(r => {
        const vA = safeMetric(metricas, 'A', r.keyA);
        const vB = safeMetric(metricas, 'B', r.keyB);
        return [
            r.label,
            r.showPct ? `${vA} (${pct(vA, tA)})` : String(vA),
            r.showPct ? `${vB} (${pct(vB, tB)})` : String(vB),
        ];
    });

    tableBody.push([
        'Promedio mensajes/cliente',
        `${avgA} (${msgA} total)`,
        `${avgB} (${msgB} total)`,
    ]);

    return {
        nombre,
        estado,
        fechaInicio,
        fechaFin,
        tableHead: ['Métrica', 'Variante A — Control (IA)', 'Variante B — Demo directa'],
        tableBody,
    };
}

export function exportTestToPDF(test, contactos) {
    const { nombre, estado, fechaInicio, fechaFin, tableHead, tableBody } = buildTestData(test);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Encabezado
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('A/B Test — Métricas por variante', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Test: ${nombre}   |   Estado: ${estado}`, 14, 26);
    doc.text(`Inicio: ${formatDateStr(fechaInicio)}${fechaFin ? `   |   Fin: ${formatDateStr(fechaFin)}` : ''}`, 14, 32);
    doc.text(`Generado: ${formatDateStr(new Date())}`, 14, 38);

    autoTable(doc, {
        startY: 44,
        head: [tableHead],
        body: tableBody,
        headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 55, halign: 'center' },
            2: { cellWidth: 55, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
    });

    // Descripción de métricas
    const descBody = [
        ['Completaron',          'Bot IA calificó como "calificado" o "quiere_meet".', 'Registró ≥1 movimiento en su empresa demo.'],
        ['Abrieron link',        'Click en el link de Google Calendar.',                '(igual que A)'],
        ['Agendaron reunión',    'Tiene ≥1 ReunionSDR con estado ≠ cancelada.',         '(igual que A)'],
        ['Crearon empresa real', 'No aplica — acceso directo a empresa real.',          'Empresa en Firestore con esDemo ≠ true.'],
        ['Generaron movimiento', 'Movimiento en empresa real.',                         'Movimiento en empresa real (post-demo).'],
        ['Mensajes >3/>6/>10',   'Mensajes del contacto al bot IA (excl. respuestas del bot).', 'Mensajes del contacto al bot de demo (excl. respuestas del bot).'],
    ];
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Métrica', 'Variante A — qué mide', 'Variante B — qué mide']],
        body: descBody,
        headStyles: { fillColor: [56, 100, 56], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 255, 245] },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 65 },
            2: { cellWidth: 65 },
        },
        margin: { left: 14, right: 14 },
    });

    // Detalle por contacto
    const contactHead = ['V', 'Nombre', 'Teléfono', 'Estado', 'Compl.', 'Link', 'Reunión', 'Empresa', 'Movim.', 'Msj', 'Llam at/no', 'WA'];
    const contactRows = buildContactosRows(contactos);
    if (contactRows.length > 0) {
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            head: [contactHead],
            body: contactRows,
            headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold', fontSize: 7 },
            bodyStyles: { fontSize: 7 },
            alternateRowStyles: { fillColor: [248, 248, 248] },
            columnStyles: {
                0:  { cellWidth: 8,  halign: 'center' },
                1:  { cellWidth: 36 },
                2:  { cellWidth: 26 },
                3:  { cellWidth: 18 },
                4:  { cellWidth: 10, halign: 'center' },
                5:  { cellWidth: 10, halign: 'center' },
                6:  { cellWidth: 12, halign: 'center' },
                7:  { cellWidth: 12, halign: 'center' },
                8:  { cellWidth: 12, halign: 'center' },
                9:  { cellWidth: 9,  halign: 'center' },
                10: { cellWidth: 14, halign: 'center' },
                11: { cellWidth: 9,  halign: 'center' },
            },
            margin: { left: 14, right: 14 },
        });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Sorbydata — ${nombre}`, 14, 287);
        doc.text(`Pág ${i}/${pageCount}`, 196, 287, { align: 'right' });
    }

    doc.save(`abtest-${nombre}-metricas.pdf`);
}

export function exportTestToTXT(test, contactos) {
    const { nombre, estado, fechaInicio, fechaFin, tableHead, tableBody } = buildTestData(test);

    const SEP = '─'.repeat(72);
    const lines = [
        'A/B TEST — MÉTRICAS POR VARIANTE',
        SEP,
        `Test     : ${nombre}`,
        `Estado   : ${estado}`,
        `Inicio   : ${formatDateStr(fechaInicio)}`,
        fechaFin ? `Fin      : ${formatDateStr(fechaFin)}` : '',
        `Generado : ${formatDateStr(new Date())}`,
        SEP,
        '',
        tableHead.map(h => h.padEnd(35)).join(''),
        SEP,
        ...tableBody.map(row => row.map((c, i) => c.padEnd(i === 0 ? 35 : 30)).join('')),
        '',
        SEP,
        'DESCRIPCIÓN DE MÉTRICAS:',
        '',
        '  Variante A (Control)    : flujo conversacional con asistente IA.',
        '  Variante B (Tratamiento): demo directa con empresa pre-armada del pool.',
        '',
        '  Completaron',
        '    · A: el bot IA calificó al contacto como "calificado" o "quiere_meet".',
        '    · B: el contacto registró al menos 1 movimiento en su empresa demo.',
        '',
        '  Abrieron link',
        '    · Ambas: click registrado en el link de Google Calendar.',
        '',
        '  Agendaron reunión',
        '    · Ambas: tiene ≥1 ReunionSDR con estado ≠ cancelada.',
        '',
        '  Crearon empresa real',
        '    · A: no aplica (acceso directo a empresa real, sin empresa demo).',
        '    · B: empresa en Firestore con esDemo ≠ true y empresa_demo ≠ true.',
        '',
        '  Generaron movimiento',
        '    · Ambas: movimiento registrado en la empresa real (no en la demo).',
        '',
        '  Mensajes >3 / >6 / >10',
        '    · Ambas: mensajes enviados por el contacto al bot (excluye respuestas del bot).',
        '    · A: interacción con el asistente IA conversacional.',
        '    · B: interacción con el bot de demo.',
        '',
        SEP,
    ];

    // Detalle por contacto
    const contactRows = buildContactosRows(contactos);
    if (contactRows.length > 0) {
        const cW = [4, 24, 16, 14, 7, 7, 8, 8, 8, 5, 8, 5];
        const cHead = ['V', 'Nombre', 'Teléfono', 'Estado', 'Compl', 'Link', 'Reunión', 'Empresa', 'Movim', 'Msj', 'Llam', 'WA'];
        lines.push('');
        lines.push('DETALLE POR CONTACTO:');
        lines.push('');
        lines.push(cHead.map((h, i) => h.padEnd(cW[i])).join('  '));
        lines.push('─'.repeat(cW.reduce((a, b) => a + b + 2, 0)));
        contactRows.forEach(row => {
            lines.push(row.map((c, i) => c.substring(0, cW[i]).padEnd(cW[i])).join('  '));
        });
        lines.push(SEP);
    }

    downloadText(lines.filter(l => l !== undefined).join('\n'), `abtest-${nombre}-metricas.txt`);
}


// ─── Export Comparación Pre-test (abTestComparacion) ─────────────────────────

function buildComparacionData(data, testName) {
    const grupos = [
        { label: 'Pre-test (sin variante)', d: data.preTest },
        { label: 'Variante A — Control IA', d: data.A },
        { label: 'Variante B — Demo directa', d: data.B },
    ];

    const metricas = [
        { key: 'contactos',          label: 'Contactos',                    showPct: false },
        { key: 'reunionesAgendadas', label: 'Reuniones agendadas',           showPct: true },
        { key: 'empresasCreadas',    label: 'Empresas creadas',              showPct: true },
        { key: 'mensajesTotal',      label: 'Mensajes totales (usuario)',     showPct: false },
        { key: 'mensajesPromedio',   label: 'Mensajes promedio/contacto',    showPct: false },
    ];

    const tableHead = ['Métrica', ...grupos.map(g => g.label)];

    const tableBody = metricas.map(m => {
        return [
            m.label,
            ...grupos.map(g => {
                const v = g.d?.[m.key] ?? '—';
                const total = g.d?.contactos || 1;
                if (m.showPct && typeof v === 'number') return `${v} (${pct(v, total)})`;
                return String(v);
            }),
        ];
    });

    return { testName, tableHead, tableBody, grupos, metricas };
}

export function exportComparacionToPDF(data, testName) {
    const { tableHead, tableBody } = buildComparacionData(data, testName);

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text('Comparación histórica de onboarding', 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Test: ${testName}`, 14, 26);
    if (data.fechaInicioTest) {
        doc.text(`Test iniciado: ${formatDateStr(data.fechaInicioTest)}   |   Pre-test: contactos bot anteriores a esa fecha`, 14, 32);
    }
    doc.text(`Generado: ${formatDateStr(new Date())}`, 14, 38);

    autoTable(doc, {
        startY: 44,
        head: [tableHead],
        body: tableBody,
        headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
            0: { cellWidth: 65 },
            1: { cellWidth: 65, halign: 'center' },
            2: { cellWidth: 65, halign: 'center' },
            3: { cellWidth: 65, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Sorbydata — Comparación histórica ${testName}`, 14, 200);
        doc.text(`Pág ${i}/${pageCount}`, 283, 200, { align: 'right' });
    }

    doc.save(`abtest-${testName}-comparacion.pdf`);
}

export function exportComparacionToTXT(data, testName) {
    const { tableHead, tableBody } = buildComparacionData(data, testName);

    const SEP = '─'.repeat(80);
    const colW = [38, 28, 28, 28];

    const headerLine = tableHead.map((h, i) => h.padEnd(colW[i] ?? 28)).join('');
    const bodyLines  = tableBody.map(row => row.map((c, i) => c.padEnd(colW[i] ?? 28)).join(''));

    const lines = [
        'COMPARACIÓN HISTÓRICA DE ONBOARDING',
        SEP,
        `Test     : ${testName}`,
        data.fechaInicioTest ? `Inicio   : ${formatDateStr(data.fechaInicioTest)}` : '',
        `Generado : ${formatDateStr(new Date())}`,
        SEP,
        '',
        'Pre-test = contactos de origen "bot" sin variante asignada, anteriores al inicio del test.',
        '',
        headerLine,
        SEP,
        ...bodyLines,
        '',
        SEP,
        'Notas:',
        '- Reuniones agendadas: ReunionSDR con estado ≠ cancelada.',
        '- Empresas creadas: profile en Firestore con empresa_demo = false.',
        '- Mensajes: enviados por el usuario al bot (excluye mensajes del bot).',
        SEP,
    ].filter(l => l !== undefined);

    downloadText(lines.join('\n'), `abtest-${testName}-comparacion.txt`);
}
