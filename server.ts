import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import * as XLSX from "xlsx";
import { parse, startOfMonth, endOfMonth } from 'date-fns';
import bcrypt from "bcryptjs";
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

// Middleware de autenticación mejorado
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "No autorizado. Inicie sesión." });
  }

  const userId = authHeader.split(' ')[1];
  try {
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Sesión inválida" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Error de autenticación" });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth: Login con Hashing y Migración
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
      const { data: user, error } = await supabaseAdmin
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({ success: false, error: "Usuario no encontrado" });
      }

      // Verificar si la contraseña es plana (migración) o hash
      let isMatch = false;
      if (user.password.length < 20) {
        // Contraseña antigua plana
        isMatch = user.password === password;
        if (isMatch) {
          // Auto-migrar a hash
          const hashedPassword = await bcrypt.hash(password, 10);
          await supabaseAdmin.from('usuarios').update({ password: hashedPassword }).eq('id', user.id);
        }
      } else {
        isMatch = await bcrypt.compare(password, user.password);
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, error: "Contraseña incorrecta" });
      }

      // No devolver la contraseña
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Auth: Update Password con Hashing
  app.post("/api/auth/update-password", async (req, res) => {
    const { email, newPassword } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const { error } = await supabaseAdmin
        .from('usuarios')
        .update({ password: hashedPassword })
        .eq('email', email);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proteger rutas de API
  app.use("/api/config", authenticate);
  app.use("/api/crm", authenticate);
  app.use("/api/analytics", authenticate);
  app.use("/api/moncake", authenticate);
  app.use("/api/expenses", authenticate);

  // Test Supabase Connection
  try {
    const { data, error } = await supabaseAdmin.from('edificios').select('count').limit(1);
    if (error) {
      console.error("Supabase connection error:", JSON.stringify(error, null, 2));
    } else {
      console.log("Supabase connection successful");
    }
  } catch (err) {
    console.error("Supabase connection exception:", err);
  }

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

  // Historical Data Fetching (Last Year) - Chunked to avoid timeouts
  app.post("/api/sync/historical", async (req, res) => {
    const domain = process.env.MONCAKE_API_DOMAIN || "https://www.comoencasa.info";
    const today = new Date();
    const chunks = 12; // 12 meses
    let totalProcessed = 0;

    try {
      for (let i = 0; i < chunks; i++) {
        const start = new Date();
        start.setMonth(today.getMonth() - (i + 1));
        const end = new Date();
        end.setMonth(today.getMonth() - i);

        const fecha_inicio = start.toISOString().split('T')[0];
        const fecha_fin = end.toISOString().split('T')[0];

        console.log(`Syncing chunk ${i + 1}/${chunks}: ${fecha_inicio} to ${fecha_fin}`);

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
            timeout: 60000 // 1 minute timeout per chunk
          }
        );

        if (response.data.success) {
          await RevenueService.syncRackToSupabase(response.data.data, 'HISTORICAL');
          totalProcessed++;
        }
      }

      res.json({ 
        success: true, 
        message: `Sincronización histórica completada. Se procesaron ${totalProcessed} bloques mensuales.` 
      });
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

        // Soporte para formato DD-MM-YYYY
        let fecha = row.Fecha;
        if (typeof fecha === 'string' && fecha.includes('-')) {
          try {
            // Intentar DD-MM-YYYY
            const parsedDate = parse(fecha, 'dd-MM-yyyy', new Date());
            if (!isNaN(parsedDate.getTime())) {
              fecha = parsedDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn("Error parsing date:", fecha);
          }
        }

        return {
          fecha: fecha,
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

  app.get("/api/crm/guests", async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('guests')
      .select('*')
      .order('ultima_estancia', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/analytics/dashboard-summary", authenticate, async (req, res) => {
    try {
      const today = new Date();
      const start = startOfMonth(today).toISOString().split('T')[0];
      const end = endOfMonth(today).toISOString().split('T')[0];

      // Reutilizamos la lógica de metrics pero simplificada para el dashboard
      const { data: rackData } = await supabaseAdmin
        .from('rack_history')
        .select('precio_neto_base, ocupado, fecha')
        .gte('fecha', start)
        .lte('fecha', end);

      const { data: gastosData } = await supabaseAdmin
        .from('gastos')
        .select('importe_base')
        .gte('fecha', start)
        .lte('fecha', end);

      const totalRevenue = rackData?.reduce((acc, r) => acc + (r.ocupado ? Number(r.precio_neto_base || 0) : 0), 0) || 0;
      const totalExpenses = gastosData?.reduce((acc, g) => acc + Number(g.importe_base || 0), 0) || 0;
      const totalRoomsAvailable = rackData?.length || 0;
      const totalRoomsOccupied = rackData?.filter(r => r.ocupado).length || 0;

      const summary = {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        adr: totalRoomsOccupied > 0 ? Number((totalRevenue / totalRoomsOccupied).toFixed(2)) : 0,
        revpar: totalRoomsAvailable > 0 ? Number((totalRevenue / totalRoomsAvailable).toFixed(2)) : 0,
        occupancy: totalRoomsAvailable > 0 ? Number(((totalRoomsOccupied / totalRoomsAvailable) * 100).toFixed(2)) : 0,
        goppar: totalRoomsAvailable > 0 ? Number(((totalRevenue - totalExpenses) / totalRoomsAvailable).toFixed(2)) : 0
      };

      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/metrics", authenticate, async (req, res) => {
    const { start, end, edificio_id } = req.query;
    
    try {
      // 1. Obtener datos del Rack (Ocupación y Revenue)
      let rackQuery = supabaseAdmin
        .from('rack_history')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end);
      
      if (edificio_id) {
        // Necesitamos filtrar por edificio_id que está en la tabla alojamientos
        const { data: alojamientos } = await supabaseAdmin
          .from('alojamientos')
          .select('id')
          .eq('edificio_id', edificio_id);
        
        const ids = alojamientos?.map(a => a.id) || [];
        rackQuery = rackQuery.in('alojamiento_id', ids);
      }

      const { data: rackData, error: rackError } = await rackQuery;
      if (rackError) throw rackError;

      // 2. Obtener Gastos
      let gastosQuery = supabaseAdmin
        .from('gastos')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end);
      
      if (edificio_id) {
        gastosQuery = gastosQuery.eq('edificio_id', edificio_id);
      }

      const { data: gastosData, error: gastosError } = await gastosQuery;
      if (gastosError) throw gastosError;

      // 3. Calcular Métricas por día para las gráficas
      const metricsByDate: Record<string, any> = {};
      const channelStats: Record<string, { revenue: number, count: number }> = {};
      
      // Inicializar fechas
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        metricsByDate[dateStr] = {
          fecha: dateStr,
          revenue: 0,
          extraRevenue: 0,
          roomsOccupied: 0,
          totalRooms: 0,
          expenses: 0,
          marketingExpenses: 0,
          commissions: 0
        };
      }

      // Procesar Rack
      const uniqueReservations = new Set();
      rackData?.forEach(row => {
        if (metricsByDate[row.fecha]) {
          metricsByDate[row.fecha].totalRooms++;
          if (row.ocupado) {
            metricsByDate[row.fecha].roomsOccupied++;
            metricsByDate[row.fecha].revenue += Number(row.precio_neto_base || 0);
            metricsByDate[row.fecha].extraRevenue += Number(row.ingresos_extra || 0);
            metricsByDate[row.fecha].commissions += Number(row.comision_estimada || 0);
            
            if (row.id_reserva) uniqueReservations.add(row.id_reserva);

            const canal = row.canal || 'Otros';
            if (!channelStats[canal]) channelStats[canal] = { revenue: 0, count: 0 };
            channelStats[canal].revenue += Number(row.precio_neto_base || 0);
            channelStats[canal].count++;
          }
        }
      });

      // Procesar Gastos
      gastosData?.forEach(row => {
        if (metricsByDate[row.fecha]) {
          metricsByDate[row.fecha].expenses += Number(row.importe_base || 0);
          if (row.categoria === 'MARKETING' || row.categoria === 'VENTAS') {
            metricsByDate[row.fecha].marketingExpenses += Number(row.importe_base || 0);
          }
        }
      });

      // Calcular Ratios Finales
      const chartData = Object.values(metricsByDate).map(day => {
        const adr = day.roomsOccupied > 0 ? day.revenue / day.roomsOccupied : 0;
        const revpar = day.totalRooms > 0 ? day.revenue / day.totalRooms : 0;
        const trevpar = day.totalRooms > 0 ? (day.revenue + day.extraRevenue) / day.totalRooms : 0;
        const occupancy = day.totalRooms > 0 ? (day.roomsOccupied / day.totalRooms) * 100 : 0;
        const goppar = day.totalRooms > 0 ? (day.revenue - day.expenses - day.commissions) / day.totalRooms : 0;

        return {
          ...day,
          adr: Number(adr.toFixed(2)),
          revpar: Number(revpar.toFixed(2)),
          trevpar: Number(trevpar.toFixed(2)),
          occupancy: Number(occupancy.toFixed(2)),
          goppar: Number(goppar.toFixed(2))
        };
      });

      // Totales
      const totalRevenue = chartData.reduce((acc, d) => acc + d.revenue, 0);
      const totalExtraRevenue = chartData.reduce((acc, d) => acc + d.extraRevenue, 0);
      const totalExpenses = chartData.reduce((acc, d) => acc + d.expenses, 0);
      const totalMarketing = chartData.reduce((acc, d) => acc + d.marketingExpenses, 0);
      const totalCommissions = chartData.reduce((acc, d) => acc + d.commissions, 0);
      const totalRoomsAvailable = chartData.reduce((acc, d) => acc + d.totalRooms, 0);
      const totalRoomsOccupied = chartData.reduce((acc, d) => acc + d.roomsOccupied, 0);

      const cac = uniqueReservations.size > 0 ? totalMarketing / uniqueReservations.size : 0;

      const summary = {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        adr: totalRoomsOccupied > 0 ? Number((totalRevenue / totalRoomsOccupied).toFixed(2)) : 0,
        revpar: totalRoomsAvailable > 0 ? Number((totalRevenue / totalRoomsAvailable).toFixed(2)) : 0,
        trevpar: totalRoomsAvailable > 0 ? Number(((totalRevenue + totalExtraRevenue) / totalRoomsAvailable).toFixed(2)) : 0,
        occupancy: totalRoomsAvailable > 0 ? Number(((totalRoomsOccupied / totalRoomsAvailable) * 100).toFixed(2)) : 0,
        goppar: totalRoomsAvailable > 0 ? Number(((totalRevenue - totalExpenses - totalCommissions) / totalRoomsAvailable).toFixed(2)) : 0,
        cac: Number(cac.toFixed(2)),
        totalReservations: uniqueReservations.size
      };

      const channels = Object.entries(channelStats).map(([name, stats]) => ({
        name,
        revenue: Number(stats.revenue.toFixed(2)),
        count: stats.count
      })).sort((a, b) => b.revenue - a.revenue);

      // 4. Calcular periodo anterior para tendencias
      const diff = endDate.getTime() - startDate.getTime();
      const prevStart = new Date(startDate.getTime() - diff - 86400000);
      const prevEnd = new Date(startDate.getTime() - 86400000);
      
      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      let prevRackQuery = supabaseAdmin
        .from('rack_history')
        .select('precio_neto_base, ocupado')
        .gte('fecha', prevStartStr)
        .lte('fecha', prevEndStr);
      
      if (edificio_id) {
        const { data: alojamientos } = await supabaseAdmin
          .from('alojamientos')
          .select('id')
          .eq('edificio_id', edificio_id);
        const ids = alojamientos?.map(a => a.id) || [];
        prevRackQuery = prevRackQuery.in('alojamiento_id', ids);
      }

      const { data: prevRackData } = await prevRackQuery;
      
      const prevRevenue = prevRackData?.reduce((acc, r) => acc + (r.ocupado ? Number(r.precio_neto_base || 0) : 0), 0) || 0;
      const prevRoomsOccupied = prevRackData?.filter(r => r.ocupado).length || 0;
      const prevTotalRooms = prevRackData?.length || 0;

      const prevSummary = {
        revenue: prevRevenue,
        occupancy: prevTotalRooms > 0 ? (prevRoomsOccupied / prevTotalRooms) * 100 : 0,
        adr: prevRoomsOccupied > 0 ? prevRevenue / prevRoomsOccupied : 0,
        revpar: prevTotalRooms > 0 ? prevRevenue / prevTotalRooms : 0
      };

      // Calcular tendencias porcentuales
      const trends = {
        revenue: prevSummary.revenue > 0 ? Number((((summary.totalRevenue - prevSummary.revenue) / prevSummary.revenue) * 100).toFixed(1)) : 0,
        occupancy: prevSummary.occupancy > 0 ? Number((summary.occupancy - prevSummary.occupancy).toFixed(1)) : 0,
        adr: prevSummary.adr > 0 ? Number((((summary.adr - prevSummary.adr) / prevSummary.adr) * 100).toFixed(1)) : 0,
        revpar: prevSummary.revpar > 0 ? Number((((summary.revpar - prevSummary.revpar) / prevSummary.revpar) * 100).toFixed(1)) : 0
      };

      res.json({ summary, chartData, trends, channels });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
