export type Tono = 'ambar' | 'turquesa' | 'rosa';
export type TipoHabito = 'diario' | 'bono' | 'atencion' | 'retroceso' | 'reparacion';

export type Nino = {
  id: string;
  slug: string;
  nombre: string;
  edad: number;
  emoji: string;
  tono: Tono;
  modo: 'peque' | 'normal';
  siempre_en_casa: boolean;
  orden: number;
};

export type Habito = {
  id: string;
  clave: string;
  nombre: string;
  emoji: string;
  tipo: TipoHabito;
  puntos: number;
  puntos_peque: number | null;
  solo_nino: string | null;
  orden: number;
};

export type Registro = {
  id: string;
  nino_id: string;
  habito_id: string;
  tipo: TipoHabito;
  puntos: number;
  fecha: string;
  nota: string | null;
  created_at: string;
};

export type Visita = {
  id: string;
  nino_id: string;
  desde: string;
  hasta: string;
  nota: string | null;
};

export type Config = {
  inicio: string;
  fin: string;
  maxBonosDia: number;
};
