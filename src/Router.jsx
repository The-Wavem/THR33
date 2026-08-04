import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/public/Home";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/lancamentos" element={<Home />} />
      <Route path="/catalogo" element={<Home />} />
      <Route path="/drops-passados" element={<Home />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
