import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Reviews from "./pages/Reviews";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Banners from "./pages/Banners";
import SplitBills from "./pages/SplitBills";
import SplitBillDetail from "./pages/SplitBillDetail";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Users />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/banners" element={<Banners />} />
          <Route path="/split-bills" element={<SplitBills />} />
          <Route path="/split-bills/:id" element={<SplitBillDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
