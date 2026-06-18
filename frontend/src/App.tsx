import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import PublicRoute from "./components/publicRoute";
import ProtectedRoute from "./components/protectedRoute";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const SelectRole = lazy(() => import("./pages/SelectRole"));
const Restaurant = lazy(() => import("./pages/Restaurant"));
const RestaurantPage = lazy(() => import("./pages/RestaurantPage"));
const Cart = lazy(() => import("./pages/Cart"));
const Address = lazy(() => import("./pages/Address"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentsSuccess"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const RiderDashboard = lazy(() => import("./pages/RiderDashboard"));
const Admin = lazy(() => import("./pages/Admin"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]">
    <div className="space-y-3 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#3b3b3b] border-t-[#facc15]" />
      <p className="text-sm text-gray-500">Loading BhookBuster...</p>
    </div>
  </div>
);

const AppRoutes = () => {
  const { user } = useAppData();
  const location = useLocation();
  const showCustomerNavbar = !user || user.role === "customer";
  const isDashboardRoute = ["/admin", "/restaurant", "/rider"].includes(location.pathname);

  return (
    <>
      {showCustomerNavbar && <Navbar />}
      <div className={`min-h-screen ${isDashboardRoute ? "bg-[#0f0f0f]" : "bg-[#0f0f0f]"}`}>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
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
