/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import BuildingManager from './components/BuildingManager';
import { fetchRackData } from './services/moncakeService';
import { RackData } from './types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Toaster } from 'sonner';

export default function App() {
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [rackData, setRackData] = useState<RackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'matrix' || activeTab === 'dashboard') {
      setIsLoading(true);
      fetchRackData({})
        .then(data => setRackData(data))
        .finally(() => setIsLoading(false));
    }
  }, [activeTab]);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Toaster position="top-right" />
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {activeTab === 'dashboard' && 'Dashboard Ejecutivo'}
              {activeTab === 'matrix' && 'Revenue Matrix'}
              {activeTab === 'pacing' && 'Pacing & Pick-up'}
              {activeTab === 'buildings' && 'Gestión de Edificios'}
              {activeTab === 'admin' && 'Configuración del Sistema'}
            </h2>
            <p className="text-slate-500">
              {activeTab === 'dashboard' && 'Resumen de rendimiento y KPIs principales.'}
              {activeTab === 'matrix' && 'Análisis detallado de precios y ocupación por tipología.'}
              {activeTab === 'pacing' && 'Ritmo de reservas y comparación histórica.'}
              {activeTab === 'buildings' && 'Estado y configuración de los establecimientos.'}
              {activeTab === 'admin' && 'Gestión de costes, comisiones y reglas de negocio.'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-white border rounded-lg px-3 py-2 text-sm font-medium shadow-sm">
              Hoy: {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </header>

        <div className="grid gap-6">
          {activeTab === 'dashboard' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RevPAR (Base Imp.)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€45.20</div>
                  <p className="text-xs text-green-600">+12% vs mes anterior</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ocupación Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">78.4%</div>
                  <p className="text-xs text-blue-600">+5.2% vs mes anterior</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ADR (Base Imp.)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€57.65</div>
                  <p className="text-xs text-green-600">+2.4% vs mes anterior</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">GOPPAR Est.</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€28.15</div>
                  <p className="text-xs text-slate-500">Calculado con costes variables</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'matrix' && (
            <Card>
              <CardHeader>
                <CardTitle>Estado Actual del Inventario</CardTitle>
                <CardDescription>Datos en tiempo real desde Moncake API</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Habitación</TableHead>
                        <TableHead>Tipo / Alojamiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead className="text-right">Precio Bruto</TableHead>
                        <TableHead className="text-right">Base Imp. (Est.)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rackData?.habitaciones.map(room => {
                        const res = room.reservas[0]; // Simplificado para el MVP
                        return (
                          <TableRow key={room.idhabitacion}>
                            <TableCell className="font-medium">{room.nombre}</TableCell>
                            <TableCell className="text-xs text-slate-500">{room.nombre_alojamiento}</TableCell>
                            <TableCell>
                              {res ? (
                                <Badge variant="destructive">Ocupado</Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Disponible</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {res?.canal ? (
                                <Badge variant="secondary">{res.canal}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {res ? `€${res.precio_total}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-blue-600">
                              {res ? `€${(res.precio_total / 1.10).toFixed(2)}` : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'buildings' && (
            <BuildingManager />
          )}

          {activeTab === 'admin' && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Comisiones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 mb-4">Define el porcentaje de comisión por canal y edificio.</p>
                  <div className="h-[200px] flex items-center justify-center border rounded-lg bg-slate-50 text-slate-400 italic">
                    Módulo de administración de comisiones en desarrollo (Fase 2)
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
