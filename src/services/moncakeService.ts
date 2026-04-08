import axios from 'axios';
import { RackData } from '../types';

export const fetchRackData = async (params: {
  fecha_inicio?: string;
  fecha_fin?: string;
  idalojamiento?: number;
  idhabitacion?: number;
}) => {
  try {
    const response = await axios.post('/api/moncake/rack', params);
    if (response.data.success) {
      return response.data.data as RackData;
    }
    throw new Error(response.data.error || 'Failed to fetch rack data');
  } catch (error) {
    console.error('Error in moncakeService:', error);
    throw error;
  }
};
