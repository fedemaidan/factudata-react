import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
} from "@mui/material";
import { formatearCampo } from "src/utils/celulandia/formatearCampo";
import { formatCurrency } from "src/utils/formatters";

const TabPanel = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const TabbedMovementsTable = ({ items = [], isLoading = false }) => {
  const [currentTab, setCurrentTab] = useState("ARS");

  const dataByMoneda = useMemo(() => {
    const grouped = { ARS: [], USD: [] };
    items.forEach((it) => {
      if (it.moneda === "ARS") grouped.ARS.push(it);
      else if (it.moneda === "USD") grouped.USD.push(it);
    });
    const sortByFechaDesc = (a, b) => new Date(b.fecha) - new Date(a.fecha);
    grouped.ARS.sort(sortByFechaDesc);
    grouped.USD.sort(sortByFechaDesc);
    return grouped;
  }, [items]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <Tabs
        value={currentTab}
        onChange={(_, v) => setCurrentTab(v)}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab value="ARS" label="ARS" />
        <Tab value="USD" label="USD" />
      </Tabs>

      <TabPanel value={currentTab} index="ARS">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Monto (ARS)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataByMoneda.ARS.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatearCampo("fecha", row.fecha)}</TableCell>
                <TableCell>{row.cliente}</TableCell>
                <TableCell>{formatCurrency(Math.round(row.monto || 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabPanel>

      <TabPanel value={currentTab} index="USD">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Cliente</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Monto (USD)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataByMoneda.USD.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatearCampo("fecha", row.fecha)}</TableCell>
                <TableCell>{row.cliente}</TableCell>
                <TableCell>{formatCurrency(Math.round(row.monto || 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabPanel>
    </Paper>
  );
};

export default TabbedMovementsTable;
