/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Building {
  id: string;
  name: string;
  contractType: 'FIXED' | 'VARIABLE' | 'HYBRID';
  fixedValue?: number;
  variablePercentage?: number;
  minGuaranteed?: number;
}

export interface Accommodation {
  id: number;
  buildingId: string;
  name: string;
  targetMargin?: number;
}

export interface Distributor {
  id: string;
  name: string;
}

export interface ChannelCommission {
  distributorId: string;
  buildingId: string;
  percentage: number;
}

export interface ExpenseConfig {
  concept: string;
  category: 'VARIABLE' | 'FIXED';
  distributionMethod: 'PER_UNIT' | 'PER_OCCUPANCY' | 'DIRECT';
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
  fecha: string;
  edificio: string;
  concepto: string;
  importe: number;
}
