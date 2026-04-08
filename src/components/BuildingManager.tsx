import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Building2, 
  Save, 
  RefreshCw,
  MapPin
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
  const [isLoading, setIsLoading] = useState(false);
  
  const [newBuilding, setNewBuilding] = useState({
    nombre: '',
    tipo_contrato: 'FIJO' as const,
    valor_fijo: 0
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bRes, aRes, rackRes] = await Promise.all([
        axios.get('/api/config/buildings'),
        axios.get('/api/config/alojamientos'),
        fetchRackData({})
      ]);
      
      setBuildings(bRes.data);
      setAlojamientos(aRes.data);
      
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

  const handleAddBuilding = async () => {
    if (!newBuilding.nombre) return toast.error('El nombre es obligatorio');
    try {
      await axios.post('/api/config/buildings', newBuilding);
      toast.success('Edificio añadido correctamente');
      setNewBuilding({ nombre: '', tipo_contrato: 'FIJO', valor_fijo: 0 });
      loadData();
    } catch (error) {
      toast.error('Error al añadir edificio');
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
        {/* Gestión de Edificios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="text-blue-500" />
              Nuevo Edificio
            </CardTitle>
            <CardDescription>Define los establecimientos para agrupar las tipologías.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Edificio</Label>
              <Input 
                placeholder="Ej: Edificio Santa María" 
                value={newBuilding.nombre}
                onChange={e => setNewBuilding({...newBuilding, nombre: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select 
                  value={newBuilding.tipo_contrato}
                  onValueChange={(v: any) => setNewBuilding({...newBuilding, tipo_contrato: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIJO">Fijo</SelectItem>
                    <SelectItem value="VARIABLE">Variable (%)</SelectItem>
                    <SelectItem value="HIBRIDO">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Coste Fijo / %</Label>
                <Input 
                  type="number" 
                  value={newBuilding.valor_fijo}
                  onChange={e => setNewBuilding({...newBuilding, valor_fijo: Number(e.target.value)})}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleAddBuilding}>
              <Plus className="mr-2 h-4 w-4" /> Añadir Edificio
            </Button>
          </CardContent>
        </Card>

        {/* Listado de Edificios */}
        <Card>
          <CardHeader>
            <CardTitle>Edificios Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildings.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.contractType}</TableCell>
                    <TableCell className="text-right">
                      {b.contractType === 'VARIABLE' ? `${b.variablePercentage}%` : `€${b.fixedValue}`}
                    </TableCell>
                  </TableRow>
                ))}
                {buildings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-400 py-8">
                      No hay edificios configurados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
