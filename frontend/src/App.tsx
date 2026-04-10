import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import PublicRoute from "./components/publicRoute";
import ProtectedRoute from "./components/protectedRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import RestaurantPage from "./pages/RestaurantPage";
import Cart from "./pages/Cart";
import Address from "./pages/Address";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentsSuccess";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import OrderPage from "./pages/OrderPage";
import RiderDashboard from "./pages/RiderDashboard";
import Admin from "./pages/Admin";

const AppRoutes = () => {
  const { user } = useAppData();
  const location = useLocation();
  const showCustomerNavbar = !user || user.role === "customer";
  const isDashboardRoute = ["/admin", "/restaurant", "/rider"].includes(location.pathname);

  return (
    <>
      {showCustomerNavbar && <Navbar />}
      <div className={`min-h-screen ${isDashboardRoute ? "bg-[#0f0f0f]" : "bg-[#0f0f0f]"}`}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                user?.role === "admin" ? (
                  <Navigate to="/admin" replace />
                ) : user?.role === "seller" ? (
                  <Navigate to="/restaurant" replace />
                ) : user?.role === "rider" ? (
                  <Navigate to="/rider" replace />
                ) : (
                  <Home />
                )
              }
            />
            <Route path="/paymentsuccess/:paymentId" element={<PaymentSuccess />} />
            <Route path="/ordersuccess/:sessionId" element={<OrderSuccess />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order/:id" element={<OrderPage />} />
            <Route path="/address" element={<Address />} />
            <Route path="/restaurant/:id" element={<RestaurantPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/select-role" element={<SelectRole />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/account" element={<Account />} />
            <Route
              path="/restaurant"
              element={user?.role === "seller" ? <Restaurant /> : <Navigate to="/" replace />}
            />
            <Route
              path="/rider"
              element={user?.role === "rider" ? <RiderDashboard /> : <Navigate to="/" replace />}
            />
            <Route
              path="/admin"
              element={user?.role === "admin" ? <Admin /> : <Navigate to="/" replace />}
            />
          </Route>
        </Routes>
      </div>
    </>
  );
};

const App = () => {
  const { loading } = useAppData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#3b3b3b] border-t-[#facc15]" />
          <p className="text-sm text-gray-500">Loading BhookBuster...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
