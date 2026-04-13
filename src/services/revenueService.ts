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
    if (!rackData || !rackData.habitaciones) {
      console.warn("Sync aborted: No rack data or rooms found");
      return;
    }
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
          id_reserva: null
        });
      } else {
        for (const reservation of room.reservas) {
          const isOccupied = reservation.estado > 0;
          const precioNetoBase = isOccupied ? RevenueService.calculateBaseImp(reservation.precio_total) : 0;
          
          // Estimación de comisión según PDF Sesión 1
          let comisionEstimada = 0;
          if (isOccupied) {
            const canal = (reservation.canal || 'moncake').toLowerCase();
            if (canal.includes('booking')) comisionEstimada = reservation.precio_total * 0.15;
            else if (canal.includes('expedia')) comisionEstimada = reservation.precio_total * 0.18;
            else if (canal.includes('airbnb')) comisionEstimada = reservation.precio_total * 0.14;
            else if (canal.includes('directo') || canal.includes('web')) comisionEstimada = reservation.precio_total * 0.03;
            else comisionEstimada = reservation.precio_total * 0.10; // Default
          }

          snapshots.push({
            fecha: reservation.checkin,
            alojamiento_id: room.idalojamiento,
            habitacion_id: room.idhabitacion,
            nombre_habitacion: room.nombre,
            ocupado: isOccupied,
            precio_bruto: isOccupied ? reservation.precio_total : 0,
            precio_neto_base: precioNetoBase,
            comision_estimada: Number(comisionEstimada.toFixed(2)),
            canal: isOccupied ? (reservation.canal || 'moncake') : null,
            id_reserva: isOccupied ? reservation.id : null,
            cliente_nombre: isOccupied ? reservation.cliente_nombre : null,
            cliente_apellidos: isOccupied ? reservation.cliente_apellidos : null
          });
        }
      }
    }

    if (snapshots.length > 0) {
      // Normalizar fechas a YYYY-MM-DD y deduplicar por fecha y habitacion_id
      // para evitar errores de ON CONFLICT en Supabase (error 21000)
      const uniqueSnapshotsMap = new Map();
      
      for (const s of snapshots) {
        if (!s.fecha || !s.habitacion_id) continue;
        
        // Normalización robusta de fecha a YYYY-MM-DD
        let normalizedDate = String(s.fecha).split('T')[0].trim();
        if (normalizedDate.includes('-')) {
          const parts = normalizedDate.split('-');
          if (parts[0].length === 2) {
            // Asumimos DD-MM-YYYY -> YYYY-MM-DD
            normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        } else if (normalizedDate.includes('/')) {
          const parts = normalizedDate.split('/');
          if (parts[0].length === 2) {
            // Asumimos DD/MM/YYYY -> YYYY-MM-DD
            normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        
        const habitacionId = s.habitacion_id;
        const key = `${normalizedDate}-${habitacionId}`;
        
        // Si ya existe, preferimos el que tenga ocupado=true o el más reciente en el array
        if (!uniqueSnapshotsMap.has(key) || s.ocupado) {
          uniqueSnapshotsMap.set(key, { 
            ...s, 
            fecha: normalizedDate 
          });
        }
      }

      const uniqueSnapshots = Array.from(uniqueSnapshotsMap.values());

      // 1. Asegurar que los alojamientos existen (para evitar errores de FK)
      const uniqueAlojamientoIds = [...new Set(uniqueSnapshots.map(s => s.alojamiento_id).filter(id => id !== null && id !== undefined))];
      if (uniqueAlojamientoIds.length > 0) {
        try {
          // Intentar insertar alojamientos básicos si no existen
          const alojamientosToEnsure = uniqueAlojamientoIds.map(id => ({
            id,
            nombre: `Alojamiento ${id} (Auto-sync)`
          }));
          
          await supabaseAdmin
            .from('alojamientos')
            .upsert(alojamientosToEnsure, { onConflict: 'id', ignoreDuplicates: true });
        } catch (e) {
          console.warn('Warning ensuring alojamientos exist:', e);
        }
      }

      // 2. Upsert del histórico (onConflict sin espacios)
      const { error } = await supabaseAdmin
        .from('rack_history')
        .upsert(uniqueSnapshots, { onConflict: 'fecha,habitacion_id' });
      
      if (error) {
        console.error('Error syncing to Supabase:', JSON.stringify(error, null, 2));
        await RevenueService.logSync(syncType, userEmail, `Error: ${error.message || JSON.stringify(error)}`, uniqueSnapshots.length);
      } else {
        await RevenueService.logSync(syncType, userEmail, 'Success', uniqueSnapshots.length);
        // Sincronizar también la tabla de clientes (CRM)
        await RevenueService.syncGuests(rackData);
      }
    }
  },

  /**
   * Extrae y sincroniza los clientes únicos para el CRM
   */
  syncGuests: async (rackData: RackData) => {
    if (!rackData || !rackData.habitaciones) return;
    const guests = new Map();

    for (const room of rackData.habitaciones) {
      for (const res of room.reservas) {
        if (res.estado > 0 && res.cliente_nombre) {
          const fullName = `${res.cliente_nombre} ${res.cliente_apellidos}`.trim();
          const guestKey = fullName.toLowerCase();
          const precioNeto = RevenueService.calculateBaseImp(res.precio_total);
          
          if (!guests.has(guestKey)) {
            guests.set(guestKey, {
              nombre: res.cliente_nombre,
              apellidos: res.cliente_apellidos,
              nombre_completo: fullName,
              ultima_estancia: res.checkin,
              canal_preferido: res.canal || 'moncake',
              total_reservas: 1,
              total_gastado: precioNeto
            });
          } else {
            const existing = guests.get(guestKey);
            const isNewer = new Date(res.checkin) > new Date(existing.ultima_estancia);
            
            guests.set(guestKey, {
              ...existing,
              ultima_estancia: isNewer ? res.checkin : existing.ultima_estancia,
              canal_preferido: isNewer ? (res.canal || existing.canal_preferido) : existing.canal_preferido,
              total_reservas: existing.total_reservas + 1,
              total_gastado: existing.total_gastado + precioNeto
            });
          }
        }
      }
    }

    if (guests.size > 0) {
      const guestList = Array.from(guests.values());
      
      // Para un CRM real, deberíamos hacer un merge con lo que ya hay en DB
      // Pero para este MVP, usaremos upsert con lógica de acumulación si es posible
      // Dado que upsert reemplaza, vamos a intentar una lógica más robusta
      for (const guest of guestList) {
        try {
          // 1. Buscar si existe
          const { data: existingGuest } = await supabaseAdmin
            .from('guests')
            .select('*')
            .eq('nombre_completo', guest.nombre_completo)
            .single();

          if (existingGuest) {
            // 2. Actualizar acumulando (evitando duplicar si la reserva ya se procesó antes)
            // Nota: En un sistema real usaríamos un ID de reserva para evitar duplicidad.
            // Aquí simplificamos asumiendo que si la fecha es nueva, acumulamos.
            const isNewStay = new Date(guest.ultima_estancia) > new Date(existingGuest.ultima_estancia);
            
            await supabaseAdmin
              .from('guests')
              .update({
                ultima_estancia: isNewStay ? guest.ultima_estancia : existingGuest.ultima_estancia,
                canal_preferido: isNewStay ? guest.canal_preferido : existingGuest.canal_preferido,
                // Solo incrementamos si detectamos que es una sincronización de datos nuevos
                // Para simplificar el MVP, solo actualizamos los campos básicos si ya existe
                // o acumulamos si es una carga masiva inicial.
              })
              .eq('id', existingGuest.id);
          } else {
            // 3. Insertar nuevo
            await supabaseAdmin.from('guests').insert(guest);
          }
        } catch (e) {
          console.error("Error syncing individual guest:", e);
        }
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
