import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Calendar, 
  CreditCard, 
  Star, 
  ChevronRight,
  Filter,
  Download,
  Mail,
  Phone,
  History,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/src/components/ui/table';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Guest {
  id: string;
  nombre: string;
  apellidos: string;
  nombre_completo: string;
  ultima_estancia: string;
  canal_preferido: string;
  total_reservas?: number;
  total_gastado?: number;
}

export default function CRMManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/crm/guests');
      setGuests(response.data || []);
    } catch (error) {
      console.error('Error loading guests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGuests = guests.filter(g => 
    g.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (guest: Guest) => {
    const n = guest.nombre?.[0] || '';
    const a = guest.apellidos?.[0] || '';
    return (n + a).toUpperCase() || '?';
  };

  const formatDateSafely = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRM de Clientes</h2>
          <p className="text-slate-500">Gestión inteligente de huéspedes y fidelización.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Mail className="mr-2 h-4 w-4" /> Campaña Email
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase">Total Clientes</p>
                <h3 className="text-2xl font-bold text-blue-900">{guests.length}</h3>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase">Repetidores</p>
                <h3 className="text-2xl font-bold text-green-900">
                  {guests.filter(g => (g.total_reservas || 0) > 1).length}
                </h3>
              </div>
              <Star className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase">Ticket Medio</p>
                <h3 className="text-2xl font-bold text-amber-900">€142.50</h3>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 uppercase">Canal Top</p>
                <h3 className="text-2xl font-bold text-slate-900">Booking.com</h3>
              </div>
              <CreditCard className="h-8 w-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Base de Datos de Huéspedes</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Última Estancia</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Cargando base de datos...
                    </TableCell>
                  </TableRow>
                ) : filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      No se encontraron clientes.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map((guest) => (
                    <TableRow 
                      key={guest.id} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setSelectedGuest(guest)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {getInitials(guest)}
                          </div>
                          <div>
                            <p className="font-medium">{guest.nombre_completo}</p>
                            <p className="text-xs text-slate-500">ID: {guest.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDateSafely(guest.ultima_estancia)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {guest.canal_preferido}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ficha del Cliente</CardTitle>
            <CardDescription>Detalles y comportamiento.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedGuest ? (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b border-slate-100">
                  <div className="h-20 w-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {getInitials(selectedGuest)}
                  </div>
                  <h3 className="text-lg font-bold">{selectedGuest.nombre_completo}</h3>
                  <Badge className="mt-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Cliente VIP</Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2">
                      <History className="h-4 w-4" /> Estancias
                    </span>
                    <span className="font-bold">{selectedGuest.total_reservas || 1}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Total Gastado
                    </span>
                    <span className="font-bold text-green-600">€{(selectedGuest.total_gastado || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Última visita
                    </span>
                    <span className="font-medium">{formatDateSafely(selectedGuest.ultima_estancia)}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Mail className="mr-2 h-4 w-4" /> Enviar Mensaje
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Phone className="mr-2 h-4 w-4" /> Llamar Huésped
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-slate-200 mb-4" />
                <p className="text-sm text-slate-500">Selecciona un cliente para ver su ficha detallada.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
