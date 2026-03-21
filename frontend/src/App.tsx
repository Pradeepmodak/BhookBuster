import { BrowserRouter,Routes,Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { Toaster } from "react-hot-toast";
import PublicRoute from "./components/publicRoute";
import ProtectedRoute from "./components/protectedRoute";
import SelectRole from "./pages/selectRole";
import Navbar from "./components/navbar";
const App = () => {
  return (
 <>
 <BrowserRouter>
 <Navbar/>
 <Routes>
  <Route element={<PublicRoute/>}>
  <Route path="/login" element={<Login/>}/>
  </Route>
    <Route element={<PublicRoute/>}>
  <Route path="/" element={<Home/>}/>
  <Route path="/select-role" element={<SelectRole/>}/>
  </Route>
 </Routes>
  <Toaster/>
 </BrowserRouter>
 </>
  )
}

export default App