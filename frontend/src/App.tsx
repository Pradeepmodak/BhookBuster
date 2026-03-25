import { BrowserRouter,Routes,Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import PublicRoute from "./components/publicRoute";
import ProtectedRoute from "./components/protectedRoute";
import SelectRole from "./pages/SelectRole";
import Navbar from "./components/navbar";
import Account from "./pages/Account";
import { useAppData } from "./context/AppContext";
import Restaurant from "./pages/Restaurant";
import AddRestaurant from "./components/AddRestaurant";
const App = () => {
const {user}=useAppData();
if(user&&user.role=="seller"){
  return <Restaurant/>
}
  return (
 <>
 <BrowserRouter>
 <Navbar/>
 <Routes>
  <Route element={<PublicRoute/>}>
  <Route path="/login" element={<Login/>}/>
  </Route>
    <Route element={<PublicRoute/>}>  /* temporary */
  <Route path="/" element={<Home/>}/>
  <Route path="/select-role" element={<SelectRole/>}/>
  <Route path="/account" element={<Account/>}/>
  <Route path="/restaurant" element={<Restaurant/>}/> /* temporary */
  <Route path="/add-restaurant" element={<AddRestaurant/>}/>  /* temporary */
  </Route>
 </Routes>
 </BrowserRouter>
 </>
  )
}

export default App