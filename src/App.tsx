import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPwaPrompt } from "@/components/InstallPwaPrompt";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { NuevaVenta } from "@/pages/NuevaVenta";
import { RegistrarLead } from "@/pages/RegistrarLead";
import { ConsultarVenta } from "@/pages/ConsultarVenta";
import { VentaDetalle } from "@/pages/VentaDetalle";
import { RegistrarPago } from "@/pages/RegistrarPago";
import { Devolucion } from "@/pages/Devolucion";
import { Perfil } from "@/pages/Perfil";
import { Ajustes } from "@/pages/Ajustes";
import { Asistente } from "@/pages/Asistente";
import { Mail } from "@/pages/Mail";

function App() {
  return (
    <>
      <InstallPwaPrompt />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ventas/nueva" element={<NuevaVenta />} />
          <Route path="/leads/nuevo" element={<RegistrarLead />} />
          <Route path="/ventas" element={<ConsultarVenta />} />
          <Route path="/ventas/:id" element={<VentaDetalle />} />
          <Route path="/pagos" element={<RegistrarPago />} />
          <Route path="/devolucion" element={<Devolucion />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="/asistente" element={<Asistente />} />
          <Route path="/mail" element={<Mail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App
