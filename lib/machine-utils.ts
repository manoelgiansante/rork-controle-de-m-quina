import type { MachineType } from '@/types';

/**
 * Determina se o tipo de máquina usa quilômetro (true) ou horímetro (false)
 * Caminhão e Carro usam quilômetro, todos os outros usam horímetro
 */
export function usesKilometers(machineType: MachineType): boolean {
  return machineType === 'Caminhão' || machineType === 'Carro';
}

/**
 * Retorna o nome da unidade de medida (quilômetro ou horímetro)
 */
export function getMeterLabel(machineType: MachineType): string {
  return usesKilometers(machineType) ? 'Quilômetro' : 'Horímetro';
}

/**
 * Retorna a abreviação da unidade (km ou h)
 */
export function getMeterUnit(machineType: MachineType): string {
  return usesKilometers(machineType) ? 'km' : 'h';
}

/**
 * Formata o valor do medidor com a unidade correta
 */
export function formatMeterValue(value: number, machineType: MachineType, decimals: number = 0): string {
  return `${value.toFixed(decimals)}${getMeterUnit(machineType)}`;
}
