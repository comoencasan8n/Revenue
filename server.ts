import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import * as XLSX from "xlsx";
import { RevenueService } from "./src/services/revenueService.js";
import { supabaseAdmin } from "./src/lib/supabase.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

const ALLOWED_BUILDINGS = [
  'Apartamentos Rey',
  'Bolboreta Apartments',
  'Bow Homes',
  'Bow Monumental',
  'Casa Bartulo',
  'Catedral Site',
  'Kumano Kodo',
  'Pensión Residencia FyF',
  'Sete Artes',
  'TH Apartments'
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ success: false, error: "Credenciales inválidas" });
    }

    res.json({ success: true, user: data });
  });

  // Auth: Update Password
  app.post("/api/auth/update-password", async (req, res) => {
    const { email, newPassword } = req.body;
    const { error } = await supabaseAdmin
      .from('usuarios')
      .update({ password: newPassword })
      .eq('email', email);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

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
        RevenueService.syncRackToSupabase(response.data.data, 'MANUAL').catch(err => 
          console.error("Background sync error:", err)
        );
      }

      res.json(response.data);
    } catch (error) {
      console.error("Error fetching Moncake data:", error);
      res.status(500).json({ success: false, error: "Failed to fetch data from Moncake" });
    }
  });

  // Historical Data Fetching (Last Year)
  app.post("/api/sync/historical", async (req, res) => {
    const domain = process.env.MONCAKE_API_DOMAIN || "https://www.comoencasa.info";
    const today = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(today.getFullYear() - 1);

    const fecha_inicio = lastYear.toISOString().split('T')[0];
    const fecha_fin = today.toISOString().split('T')[0];

    try {
      const response = await axios.post(
        `${domain}/reservas/parity/rack_json`,
        new URLSearchParams({
          user: process.env.MONCAKE_API_USER || "",
          password: process.env.MONCAKE_API_PASSWORD || "",
          fecha_inicio,
          fecha_fin
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.success) {
        await RevenueService.syncRackToSupabase(response.data.data, 'HISTORICAL');
        res.json({ success: true, message: "Sincronización histórica completada" });
      } else {
        res.status(500).json({ success: false, error: "Error en la API de Moncake" });
      }
    } catch (error) {
      console.error("Error syncing historical data:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Excel Upload for Expenses
  app.post("/api/expenses/upload", upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No se ha subido ningún archivo" });

    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Obtener edificios para mapear nombres
      const { data: buildings } = await supabaseAdmin.from('edificios').select('*');
      
      const expenses = jsonData.map((row: any) => {
        const edificio = buildings?.find(b => b.nombre === row.Edificio);
        if (!edificio) return null;

        return {
          fecha: row.Fecha, // Formato YYYY-MM-DD
          edificio_id: edificio.id,
          concepto: row.Concepto,
          importe_base: row.Importe
        };
      }).filter(Boolean);

      if (expenses.length > 0) {
        const { error } = await supabaseAdmin.from('gastos').insert(expenses);
        if (error) throw error;
      }

      res.json({ success: true, count: expenses.length });
    } catch (error) {
      console.error("Error processing Excel:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoints para Gestión de Edificios y Alojamientos
  app.get("/api/config/buildings", async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('edificios')
      .select('*')
      .in('nombre', ALLOWED_BUILDINGS)
      .order('nombre');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/config/competitors", async (req, res) => {
    const { data, error } = await supabaseAdmin.from('competidores').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/config/competitors", async (req, res) => {
    const { data, error } = await supabaseAdmin.from('competidores').insert([req.body]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.delete("/api/config/competitors/:id", async (req, res) => {
    const { error } = await supabaseAdmin.from('competidores').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
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
