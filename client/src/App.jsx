import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Reviews from "./pages/Reviews";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Banners from "./pages/Banners";
import SplitBills from "./pages/SplitBills";
import SplitBillDetail from "./pages/SplitBillDetail";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import SubscriptionPackages from "./pages/SubscriptionPackages";
import UserDetail from "./pages/UserDetail";
import Insights from "./pages/Insights";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Blogs from "./pages/Blogs";
import BlogDetail from "./pages/BlogDetail";

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
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/subscription-packages" element={<SubscriptionPackages />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/blogs" element={<Blogs />} />
          <Route path="/blogs/new" element={<BlogDetail />} />
          <Route path="/blogs/:id" element={<BlogDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
