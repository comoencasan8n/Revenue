import { supabaseAdmin } from '../lib/supabase';
import { RackData, Room, Reservation } from '../types';

export const RevenueService = {
  /**
   * Calcula la Base Imponible (IVA 10%)
   */
  calculateBaseImp: (grossAmount: number) => {
    return grossAmount / 1.10;
  },

  /**
   * Sincroniza los datos del Rack de Moncake con Supabase
   */
  syncRackToSupabase: async (rackData: RackData) => {
    const snapshots = [];
    const fechaSnapshot = new Date().toISOString().split('T')[0];

    for (const room of rackData.habitaciones) {
      for (const reservation of room.reservas) {
        // Solo procesamos reservas confirmadas (estado suele ser > 0)
        if (reservation.estado > 0) {
          const precioNetoBase = RevenueService.calculateBaseImp(reservation.precio_total);
          
          snapshots.push({
            fecha: reservation.checkin, // Guardamos por fecha de estancia (simplificado)
            alojamiento_id: room.idalojamiento,
            habitacion_id: room.idhabitacion,
            nombre_habitacion: room.nombre,
            ocupado: true,
            precio_bruto: reservation.precio_total,
            precio_neto_base: precioNetoBase,
            canal: reservation.canal || 'moncake',
            id_reserva: reservation.id
          });
        }
      }
    }

    if (snapshots.length > 0) {
      const { error } = await supabaseAdmin
        .from('rack_history')
        .upsert(snapshots, { onConflict: 'fecha, habitacion_id' });
      
      if (error) console.error('Error syncing to Supabase:', error);
    }
  },

  /**
   * Obtiene el reparto de gastos generales ("Como en Casa")
   * Por ahora implementamos reparto por volumen de facturación (Revenue)
   */
  distributeGeneralCosts: async (totalGeneralCost: number, month: string) => {
    // 1. Obtener revenue total por edificio en ese mes
    const { data: revenueData, error } = await supabaseAdmin
      .from('rack_history')
      .select('precio_neto_base, alojamientos(edificio_id)')
      .filter('fecha', 'gte', `${month}-01`)
      .filter('fecha', 'lte', `${month}-31`);

    if (error || !revenueData) return [];

    const revenueByBuilding: Record<string, number> = {};
    let totalRevenue = 0;

    revenueData.forEach((row: any) => {
      const edificioId = row.alojamientos?.edificio_id;
      if (edificioId) {
        revenueByBuilding[edificioId] = (revenueByBuilding[edificioId] || 0) + row.precio_neto_base;
        totalRevenue += row.precio_neto_base;
      }
    });

    // 2. Repartir proporcionalmente
    return Object.entries(revenueByBuilding).map(([edificioId, revenue]) => ({
      edificioId,
      costeProrrateado: (revenue / totalRevenue) * totalGeneralCost
    }));
  }
};
