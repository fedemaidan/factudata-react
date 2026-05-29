import { Layout as DashboardLayout } from "src/layouts/dashboard/layout";
import WizardErroresSync from "src/components/dhn/sync/wizard/WizardErroresSync";

const DhnSyncIndexPage = () => (
  <DashboardLayout title="Errores de sincronización">
    <WizardErroresSync />
  </DashboardLayout>
);

export default DhnSyncIndexPage;
