/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import BuildingManager from './components/BuildingManager';
import ExpensesManager from './components/ExpensesManager';
import CRMManager from './components/CRMManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Login from './components/Login';
import { fetchRackData } from './services/moncakeService';
import { RackData, User } from './types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import axios from 'axios';
import { History, LogOut, Key } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [rackData, setRackData] = useState<RackData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('rms_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      // Configurar token global para axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.id}`;
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === 'dashboard') {
      axios.get('/api/analytics/dashboard-summary')
        .then(res => setSummary(res.data))
        .catch(err => console.error("Error fetching summary:", err));
    }
    
    if (user && (activeTab === 'matrix' || activeTab === 'dashboard')) {
      setIsLoading(true);
      fetchRackData({})
        .then(data => setRackData(data))
        .finally(() => setIsLoading(false));
    }
  }, [activeTab, user]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('rms_user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.id}`;
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rms_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const handleHistoricalSync = async () => {
    setIsSyncing(true);
    try {
      const response = await axios.post('/api/sync/historical');
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Error en la sincronización histórica');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Toaster position="top-right" />
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {activeTab === 'dashboard' && 'Dashboard Ejecutivo'}
              {activeTab === 'analytics' && 'Análisis de Rendimiento'}
              {activeTab === 'matrix' && 'Revenue Matrix'}
              {activeTab === 'crm' && 'CRM de Clientes'}
              {activeTab === 'expenses' && 'Gestión de Gastos'}
              {activeTab === 'buildings' && 'Gestión de Edificios'}
              {activeTab === 'admin' && 'Configuración del Sistema'}
            </h2>
            <div className="flex items-center gap-2 text-slate-500">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                {user.role}
              </Badge>
              <span>•</span>
              <span>{user.email}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {user.role === 'DIRECCION' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleHistoricalSync}
                disabled={isSyncing}
              >
                <History className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar Año Pasado
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar Sesión">
              <LogOut className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        </header>

        <div className="grid gap-6">
          {activeTab === 'dashboard' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">RevPAR (Neto)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{summary?.revpar || '0.00'}</div>
                  <p className="text-xs text-slate-500">Mes actual</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ocupación Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.occupancy || '0'}%</div>
                  <p className="text-xs text-slate-500">Mes actual</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ADR (Neto)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{summary?.adr || '0.00'}</div>
                  <p className="text-xs text-slate-500">Mes actual</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">GOPPAR Est.</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€{summary?.goppar || '0.00'}</div>
                  <p className="text-xs text-slate-500">Calculado con costes reales</p>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard />
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
                      {rackData?.habitaciones?.map((room, idx) => {
                        const res = room.reservas[0];
                        return (
                          <TableRow key={`${room.idhabitacion}-${idx}`}>
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

          {activeTab === 'expenses' && (
            <ExpensesManager />
          )}

          {activeTab === 'crm' && (
            <CRMManager />
          )}

          {activeTab === 'buildings' && (
            <BuildingManager />
          )}

          {activeTab === 'admin' && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="text-amber-500" />
                    Seguridad de la Cuenta
                  </CardTitle>
                  <CardDescription>Gestiona tu clave de acceso al sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-sm space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nueva Clave</label>
                      <Input type="password" placeholder="Mínimo 4 caracteres" id="new-pass" />
                    </div>
                    <Button onClick={async () => {
                      const pass = (document.getElementById('new-pass') as HTMLInputElement).value;
                      if (pass.length < 4) return toast.error('Clave demasiado corta');
                      try {
                        await axios.post('/api/auth/update-password', { email: user.email, newPassword: pass });
                        toast.success('Clave actualizada correctamente');
                      } catch (e) {
                        toast.error('Error al actualizar clave');
                      }
                    }}>
                      Actualizar Clave
                    </Button>
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
