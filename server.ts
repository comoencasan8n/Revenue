import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import { RevenueService } from "./src/services/revenueService.js";
import { supabaseAdmin } from "./src/lib/supabase.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for Moncake Rack JSON
  app.post("/api/moncake/rack", async (req, res) => {
    const { fecha_inicio, fecha_fin, idalojamiento, idhabitacion } = req.body;
    
    const domain = process.env.MONCAKE_API_DOMAIN || "https://www.comoencasa.info";
    
    try {
      const response = await axios.post(
        `${domain}/reservas/parity/rack_json`,
        new URLSearchParams({
          user: process.env.MONCAKE_API_USER || "",
          password: process.env.MONCAKE_API_PASSWORD || "",
          ...(fecha_inicio && { fecha_inicio }),
          ...(fecha_fin && { fecha_fin }),
          ...(idalojamiento && { idalojamiento: idalojamiento.toString() }),
          ...(idhabitacion && { idhabitacion: idhabitacion.toString() }),
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      // Sincronización en segundo plano con Supabase
      if (response.data.success) {
        RevenueService.syncRackToSupabase(response.data.data).catch(err => 
          console.error("Background sync error:", err)
        );
      }

      res.json(response.data);
    } catch (error) {
      console.error("Error fetching Moncake data:", error);
      res.status(500).json({ success: false, error: "Failed to fetch data from Moncake" });
    }
  });

  // Endpoints para Gestión de Edificios y Alojamientos
  app.get("/api/config/buildings", async (req, res) => {
    const { data, error } = await supabaseAdmin.from('edificios').select('*').order('nombre');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/config/buildings", async (req, res) => {
    const { data, error } = await supabaseAdmin.from('edificios').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.get("/api/config/alojamientos", async (req, res) => {
    const { data, error } = await supabaseAdmin.from('alojamientos').select('*, edificios(nombre)');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/config/alojamientos/map", async (req, res) => {
    const { id, edificio_id, nombre } = req.body;
    const { data, error } = await supabaseAdmin.from('alojamientos').upsert({
      id,
      edificio_id,
      nombre
    }).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
