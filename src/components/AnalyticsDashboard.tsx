import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Euro, 
  Percent, 
  Calendar, 
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  PieChart as PieChartIcon,
  Zap,
  Target,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    adr: number;
    revpar: number;
    trevpar: number;
    occupancy: number;
    goppar: number;
    cac: number;
    totalReservations: number;
  };
  chartData: any[];
  channels: any[];
  trends: {
    revenue: number;
    occupancy: number;
    adr: number;
    revpar: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState('month'); // 'week', 'month', 'year'
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');

  useEffect(() => {
    loadBuildings();
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [range, selectedBuilding]);

  const loadBuildings = async () => {
    try {
      const res = await axios.get('/api/config/buildings');
      setBuildings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMetrics = async () => {
    setIsLoading(true);
    let start, end;
    const today = new Date();

    if (range === 'week') {
      start = subDays(today, 7);
      end = today;
    } else if (range === 'month') {
      start = startOfMonth(today);
      end = endOfMonth(today);
    } else {
      start = startOfYear(today);
      end = endOfYear(today);
    }

    try {
      const res = await axios.get('/api/analytics/metrics', {
        params: {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
          edificio_id: selectedBuilding === 'all' ? undefined : selectedBuilding
        }
      });
      setData(res.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCard = ({ title, value, unit, icon: Icon, description, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {unit === '€' ? `€${value.toLocaleString()}` : `${value}${unit}`}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {trend > 0 ? (
            <span className="text-xs text-green-600 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" /> +{trend}%
            </span>
          ) : trend < 0 ? (
            <span className="text-xs text-red-600 flex items-center">
              <ArrowDownRight className="h-3 w-3 mr-1" /> {trend}%
            </span>
          ) : null}
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  const formatDateSafely = (dateStr: string, pattern: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '---';
      return format(d, pattern, { locale: es });
    } catch (e) {
      return '---';
    }
  };

  const downloadReport = () => {
    if (!data || !data.chartData.length) return;

    const headers = ['Fecha', 'Ocupacion %', 'ADR', 'RevPAR', 'GOPPAR', 'Revenue', 'Gastos'];
    const csvRows = [
      headers.join(','),
      ...data.chartData.map(row => [
        row.fecha,
        row.occupancy,
        row.adr,
        row.revpar,
        row.goppar,
        row.revenue,
        row.expenses
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `reporte_revenue_${range}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!data && isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Cargando análisis...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análisis de Rendimiento</h2>
          <p className="text-slate-500">Métricas avanzadas de Revenue Management y Profitability.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="w-[180px] bg-white">
              <Building2 className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="Todos los edificios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los edificios</SelectItem>
              {buildings.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex bg-white border rounded-md p-1">
            <Button 
              variant={range === 'week' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setRange('week')}
              className="px-3"
            >
              7d
            </Button>
            <Button 
              variant={range === 'month' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setRange('month')}
              className="px-3"
            >
              Mes
            </Button>
            <Button 
              variant={range === 'year' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setRange('year')}
              className="px-3"
            >
              Año
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={downloadReport}>
            <Download className="mr-2 h-4 w-4" /> Reporte
          </Button>
        </div>
      </div>

      {data && (
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="channels">Canales y CAC</TabsTrigger>
            <TabsTrigger value="strategy">Estrategia RMS</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                title="Ocupación" 
                value={data.summary.occupancy} 
                unit="%" 
                icon={Percent}
                description="vs periodo anterior"
                trend={data.trends.occupancy}
              />
              <MetricCard 
                title="ADR (Neto)" 
                value={data.summary.adr} 
                unit="€" 
                icon={Euro}
                description="Precio medio diario"
                trend={data.trends.adr}
              />
              <MetricCard 
                title="RevPAR" 
                value={data.summary.revpar} 
                unit="€" 
                icon={TrendingUp}
                description="Ingreso por hab. disp."
                trend={data.trends.revpar}
              />
              <MetricCard 
                title="TrevPAR" 
                value={data.summary.trevpar} 
                unit="€" 
                icon={ArrowUpRight}
                description="Ingreso Total por hab. disp."
                trend={0}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evolución de Ocupación y ADR</CardTitle>
                  <CardDescription>Correlación entre demanda y precio medio.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="fecha" 
                        tickFormatter={(str) => formatDateSafely(str, 'dd MMM')}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} unit="€" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(label) => formatDateSafely(label, 'PPPP')}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="occupancy" 
                        name="Ocupación"
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorOcc)" 
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="adr" 
                        name="ADR"
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={false}
                      />
                      <defs>
                        <linearGradient id="colorOcc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>RevPAR vs GOPPAR</CardTitle>
                  <CardDescription>Eficiencia operativa y rentabilidad real.</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="fecha" 
                        tickFormatter={(str) => formatDateSafely(str, 'dd MMM')}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} unit="€" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" />
                      <Bar dataKey="revpar" name="RevPAR" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="goppar" name="GOPPAR" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard 
                title="CAC Medio" 
                value={data.summary.cac} 
                unit="€" 
                icon={Users}
                description="Costo Adquisición Cliente"
                trend={0}
              />
              <MetricCard 
                title="Reservas Totales" 
                value={data.summary.totalReservations} 
                unit="" 
                icon={Calendar}
                description="En el periodo seleccionado"
                trend={0}
              />
              <MetricCard 
                title="GOPPAR" 
                value={data.summary.goppar} 
                unit="€" 
                icon={Euro}
                description="Beneficio neto por hab."
                trend={0}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Mix de Canales</CardTitle>
                  <CardDescription>Distribución de ingresos por canal.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.channels}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="revenue"
                      >
                        {data.channels.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Rendimiento por Canal</CardTitle>
                  <CardDescription>Comparativa de volumen e ingresos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.channels.map((channel, idx) => (
                      <div key={channel.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="font-medium">{channel.name}</span>
                        </div>
                        <div className="flex gap-8">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Reservas</p>
                            <p className="font-bold">{channel.count}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Revenue</p>
                            <p className="font-bold text-blue-600">€{channel.revenue.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="text-blue-500" />
                    Pricing Anticipativo
                  </CardTitle>
                  <CardDescription>Estrategia proactiva basada en datos futuros.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">Recomendación RMS:</p>
                    <p className="text-xs text-blue-600 mt-1">El sistema detecta un pico de demanda para el próximo mes. Se sugiere aumentar tarifas un 12%.</p>
                  </div>
                  <ul className="text-sm space-y-2 text-slate-600">
                    <li className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-400" /> Analiza patrones históricos y estacionalidad.</li>
                    <li className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-400" /> Fija precios antes de que la demanda se materialice.</li>
                    <li className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-400" /> Busca crear el mercado, no solo seguirlo.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="text-amber-500" />
                    Pricing Reactivo
                  </CardTitle>
                  <CardDescription>Respuesta a eventos y competencia actual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">Alerta de Mercado:</p>
                    <p className="text-xs text-amber-600 mt-1">Competidor "Bow Homes" ha bajado precios un 15%. Monitorear impacto en conversión.</p>
                  </div>
                  <ul className="text-sm space-y-2 text-slate-600">
                    <li className="flex items-center gap-2"><Target className="h-4 w-4 text-amber-400" /> Reacciona a cambios repentinos de la competencia.</li>
                    <li className="flex items-center gap-2"><Target className="h-4 w-4 text-amber-400" /> Ajusta precios en tiempo real según el mercado.</li>
                    <li className="flex items-center gap-2"><Target className="h-4 w-4 text-amber-400" /> Protege la cuota de mercado inmediata.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 bg-slate-900 text-white">
                <CardHeader>
                  <CardTitle>La Regla de Oro del Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium text-slate-300 italic">
                    "Vender la habitación correcta, al cliente correcto, al precio correcto, en el momento correcto, a través del canal correcto."
                  </p>
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div className="p-2 bg-slate-800 rounded">Producto</div>
                    <div className="p-2 bg-slate-800 rounded">Cliente</div>
                    <div className="p-2 bg-slate-800 rounded">Precio</div>
                    <div className="p-2 bg-slate-800 rounded">Momento</div>
                    <div className="p-2 bg-slate-800 rounded">Canal</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
