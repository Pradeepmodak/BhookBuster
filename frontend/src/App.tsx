import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import RoleHeader from "./components/RoleHeader";

const App = () => {
  const { user, loading } = useAppData();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-[#E23774] rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">Loading BhookBuster...</p>
        </div>
      </div>
    );
  }

  // Determine if the user has a non-customer role
  const isNonCustomerRole = user && (user.role === "seller" || user.role === "rider" || user.role === "admin");

  return (
    <BrowserRouter>
      {/* Show customer Navbar ONLY for customers (or unauthenticated users) */}
      {!isNonCustomerRole && <Navbar />}

      {/* Show a minimal role-specific header for sellers, riders, and admins */}
      {isNonCustomerRole && <RoleHeader />}

      <div className="min-h-screen bg-gray-50">
        {user && user.role === "seller" ? (
          <Restaurant />
        ) : user && user.role === "rider" ? (
          <RiderDashboard />
        ) : user && user.role === "admin" ? (
          <Admin />
        ) : (
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
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
              <Route path="/restaurant" element={<Restaurant />} />
            </Route>
          </Routes>
        )}
      </div>
    </BrowserRouter>
  );
};

export default App;