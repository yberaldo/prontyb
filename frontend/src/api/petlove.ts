import { apiPost } from './client';

export interface BuscarPetlovePorMicrochipPayload {
  microchip: string;
}

export function buscarPetlovePorMicrochip(microchip: string) {
  return apiPost<void, BuscarPetlovePorMicrochipPayload>('/petlove/pacientes/buscar-por-microchip', {
    microchip,
  });
}
