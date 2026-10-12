import type { Tono } from '@/lib/types';

export const TONOS: Record<Tono, { c: string; soft: string; glow: string }> = {
  ambar: { c: '#FFB84D', soft: 'rgba(255,184,77,0.16)', glow: 'rgba(255,184,77,0.45)' },
  turquesa: { c: '#4CC9F0', soft: 'rgba(76,201,240,0.16)', glow: 'rgba(76,201,240,0.45)' },
  rosa: { c: '#FF8FB8', soft: 'rgba(255,143,184,0.16)', glow: 'rgba(255,143,184,0.45)' },
};
