import { supabaseAdmin } from '../lib/supabase';
import { RackData } from '../types';

export const RevenueService = {
  /**
   * Calcula la Base Imponible (IVA 10%)
   */
  calculateBaseImp: (grossAmount: number) => {
    return grossAmount / 1.10;
  },

  /**
   * Sincroniza los datos del Rack de Moncake con Supabase
   * Procesa todas las habitaciones para detectar cancelaciones (huecos libres)
   */
  syncRackToSupabase: async (rackData: RackData, syncType: string = 'MANUAL', userEmail?: string) => {
    const snapshots = [];

    for (const room of rackData.habitaciones) {
      // Si la habitación no tiene reservas en el rango, está disponible
      if (!room.reservas || room.reservas.length === 0) {
        snapshots.push({
          fecha: rackData.fecha_inicio,
          alojamiento_id: room.idalojamiento,
          habitacion_id: room.idhabitacion,
          nombre_habitacion: room.nombre,
          ocupado: false,
          precio_bruto: 0,
          precio_neto_base: 0,
          canal: null,
          id_reserva: null,
          last_synced_at: new Date().toISOString()
        });
      } else {
        for (const reservation of room.reservas) {
          const isOccupied = reservation.estado > 0;
          const precioNetoBase = isOccupied ? RevenueService.calculateBaseImp(reservation.precio_total) : 0;
          
          snapshots.push({
            fecha: reservation.checkin,
            alojamiento_id: room.idalojamiento,
            habitacion_id: room.idhabitacion,
            nombre_habitacion: room.nombre,
            ocupado: isOccupied,
            precio_bruto: isOccupied ? reservation.precio_total : 0,
            precio_neto_base: precioNetoBase,
            canal: isOccupied ? (reservation.canal || 'moncake') : null,
            id_reserva: isOccupied ? reservation.id : null,
            last_synced_at: new Date().toISOString()
          });
        }
      }
    }

    if (snapshots.length > 0) {
      const { error } = await supabaseAdmin
        .from('rack_history')
        .upsert(snapshots, { onConflict: 'fecha, habitacion_id' });
      
      if (error) {
        console.error('Error syncing to Supabase:', error);
        await RevenueService.logSync(syncType, userEmail, `Error: ${error.message}`, snapshots.length);
      } else {
        await RevenueService.logSync(syncType, userEmail, 'Success', snapshots.length);
      }
    }
  },

  /**
   * Registra el resultado de una sincronización
   */
  logSync: async (tipo: string, usuario_email: string | undefined, resultado: string, registros: number) => {
    await supabaseAdmin.from('sync_logs').insert({
      tipo,
      usuario_email,
      resultado,
      registros_procesados: registros
    });
  }
};
