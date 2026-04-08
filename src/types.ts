/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Building {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  role: 'DIRECCION' | 'REVENUE' | 'RECEPCION';
}

export interface Accommodation {
  id: number;
  buildingId: string;
  name: string;
  targetMargin?: number;
}

export interface Reservation {
  id: number;
  type: 'moncake' | 'roomcloud';
  localizador?: string;
  id_roomcloud?: string;
  estado: number;
  checkin: string;
  checkout: string;
  cliente_nombre: string;
  cliente_apellidos: string;
  adultos: number;
  ninos: number;
  precio_total: number;
  idtarifa?: number;
  canal?: string;
}

export interface Room {
  id: number;
  nombre: string;
  idhabitacion: number;
  nombre_tipo_habitacion: string;
  idalojamiento: number;
  nombre_alojamiento: string;
  reservas: Reservation[];
}

export interface RackData {
  fecha_inicio: string;
  fecha_fin: string;
  habitaciones: Room[];
}

export interface Expense {
  id?: string;
  fecha: string;
  edificio_id: string;
  concepto: string;
  importe_base: number;
}
