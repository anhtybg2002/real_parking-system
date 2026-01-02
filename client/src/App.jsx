import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import InOut from "./pages/InOut";
import DashboardPage from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import PricingConfigPage from "./pages/PricingConfigPage";
import MonthlyTicketsPage from "./pages/MonthlyTicket";
import InvoicesPage from "./pages/InvoicesPage";
import StaffPage from "./pages/StaffPage";
import StaffCreatePage from "./pages/StaffCreatePage";
import StaffEditPage from "./pages/StaffEditPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingPage";
import ParkingMapEditorPage from "./pages/ParkingMapEditorPage";
import ParkingSlotPage from "./pages/ParkingSlotPage";
import ParkingAreasPage from "./pages/ParkingAreaPage";
import ParkingAreaCreatePage from "./pages/ParkingAreaCreatePage";
import ReportsLogsPage from "./pages/ReportsLogsPage";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/inout"
        element={
          <ProtectedRoute>
            <InOut />
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/pricing"
        element={
          <ProtectedRoute>
            <PricingConfigPage/>
          </ProtectedRoute>
        }
      />

      <Route
        path="dashboard/monthly-ticket"
        element={
          <ProtectedRoute>
            <MonthlyTicketsPage/>
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/invoices"
        element={
          <ProtectedRoute>
            <InvoicesPage/>
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/staff"
        element={
          <ProtectedRoute>
            <StaffPage/>
          </ProtectedRoute>
        }
      />
      <Route
        path="dashboard/staff/new"
        element={
          <ProtectedRoute>
            <StaffCreatePage/>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/staff/edit"
        element={
          <ProtectedRoute>
            <StaffEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/parking-area/info"
        element={
          <ProtectedRoute>
            <ParkingSlotPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/parking-area/editor"
        element={
          <ProtectedRoute>
            <ParkingMapEditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/parking-area"
        element={
          <ProtectedRoute>
            <ParkingAreasPage />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/dashboard/parking-area/new" 
        element={
          <ProtectedRoute>
            <ParkingAreaCreatePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/reports/logs" 
        element={
          <ProtectedRoute>
            <ReportsLogsPage />
          </ProtectedRoute>
        } 
      />
      
      
      
    </Routes>

    

  );
}

export default App;