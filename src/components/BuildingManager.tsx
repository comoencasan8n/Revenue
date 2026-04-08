import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Building2, 
  Save, 
  RefreshCw,
  MapPin,
  Target,
  Trash2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { toast } from 'sonner';
import { Building, Accommodation, RackData } from '../types';
import { fetchRackData } from '../services/moncakeService';

export default function BuildingManager() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [alojamientos, setAlojamientos] = useState<Accommodation[]>([]);
  const [pmsAlojamientos, setPmsAlojamientos] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [newCompetitor, setNewCompetitor] = useState({
    nombre: '',
    url_booking: '',
    edificio_id: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bRes, aRes, rackRes, cRes] = await Promise.all([
        axios.get('/api/config/buildings'),
        axios.get('/api/config/alojamientos'),
        fetchRackData({}),
        axios.get('/api/config/competitors')
      ]);
      
      setBuildings(bRes.data);
      setAlojamientos(aRes.data);
      setCompetitors(cRes.data);
      
      // Extraer tipologías únicas del Rack de Moncake
      const uniqueAlojamientos = Array.from(
        new Set(rackRes.habitaciones.map(h => h.idalojamiento))
      ).map(id => {
        const room = rackRes.habitaciones.find(h => h.idalojamiento === id);
        return { id, nombre: room?.nombre_alojamiento };
      });
      
      setPmsAlojamientos(uniqueAlojamientos);
    } catch (error) {
      toast.error('Error al cargar datos de configuración');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCompetitor = async () => {
    if (!newCompetitor.nombre || !newCompetitor.edificio_id) return toast.error('Nombre y edificio son obligatorios');
    try {
      await axios.post('/api/config/competitors', newCompetitor);
      toast.success('Competidor añadido al CompSet');
      setNewCompetitor({ nombre: '', url_booking: '', edificio_id: '' });
      loadData();
    } catch (error) {
      toast.error('Error al añadir competidor');
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    try {
      await axios.delete(`/api/config/competitors/${id}`);
      toast.success('Competidor eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar competidor');
    }
  };

  const handleMapAccommodation = async (id: number, nombre: string, edificio_id: string) => {
    try {
      await axios.post('/api/config/alojamientos/map', { id, nombre, edificio_id });
      toast.success('Mapeo actualizado');
      loadData();
    } catch (error) {
      toast.error('Error al mapear alojamiento');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Listado de Edificios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="text-blue-500" />
              Edificios Activos
            </CardTitle>
            <CardDescription>Establecimientos autorizados para el análisis de revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">ID Sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-400">{b.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Gestión de CompSet (TurboSuite Style) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="text-red-500" />
              CompSet (Competidores)
            </CardTitle>
            <CardDescription>Define qué competidores vigilar para cada edificio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Competidor</Label>
                <Input 
                  placeholder="Ej: Hotel Santiago" 
                  value={newCompetitor.nombre}
                  onChange={e => setNewCompetitor({...newCompetitor, nombre: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Edificio Propio</Label>
                <Select 
                  value={newCompetitor.edificio_id}
                  onValueChange={v => setNewCompetitor({...newCompetitor, edificio_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL Booking.com (Opcional)</Label>
              <Input 
                placeholder="https://www.booking.com/hotel/es/..." 
                value={newCompetitor.url_booking}
                onChange={e => setNewCompetitor({...newCompetitor, url_booking: e.target.value})}
              />
            </div>
            <Button className="w-full bg-red-50 hover:bg-red-100 text-red-600 border-red-200" variant="outline" onClick={handleAddCompetitor}>
              <Plus className="mr-2 h-4 w-4" /> Añadir al CompSet
            </Button>

            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competidor</TableHead>
                    <TableHead>Vigila a...</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {buildings.find(b => b.id === c.edificio_id)?.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCompetitor(c.id)}>
                          <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mapeo de Alojamientos (Tipologías) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="text-green-500" />
              Mapeo de Tipologías (PMS → Edificio)
            </CardTitle>
            <CardDescription>Asocia cada tipo de alojamiento de Moncake a un edificio para consolidar el GOP.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Sincronizar PMS
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID PMS</TableHead>
                <TableHead>Nombre en Moncake</TableHead>
                <TableHead>Edificio Asignado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pmsAlojamientos.map(pms => {
                const mapped = alojamientos.find(a => a.id === pms.id);
                return (
                  <TableRow key={pms.id}>
                    <TableCell className="font-mono text-xs">{pms.id}</TableCell>
                    <TableCell className="font-medium">{pms.nombre}</TableCell>
                    <TableCell>
                      <Select 
                        value={mapped?.buildingId || "none"}
                        onValueChange={(v) => handleMapAccommodation(pms.id, pms.nombre, v)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Seleccionar edificio..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>Sin asignar</SelectItem>
                          {buildings.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
