import { Routes, Route } from "react-router-dom"

import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Dashboard from "./pages/Dashboard"

function App() {

  return (

    <Routes>

      {/* Signup page first */}
      <Route path="/" element={<Signup />} />

      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<Dashboard defaultTab="webhooks" />} />

      <Route path="/webhooks" element={<Dashboard defaultTab="webhooks" />} />

      <Route path="/analytics" element={<Dashboard defaultTab="analytics" />} />

    </Routes>

  )

}

export default App