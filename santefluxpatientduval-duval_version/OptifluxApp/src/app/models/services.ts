export interface Service {
  id: string;
  name: string;
  head : string;
  created_at?: string;
  updated_at?: string;
  matricule?: string;
}

export interface Room {
  id: string;
  name: string;
  localisation? : string;
  description? : string;
  created_at?: string;
  updated_at?: string;
  matricule?: string;
  status?: string;
}

export interface Pole {
  id: string;
  name: string;
  head? : string;
  created_at?: string;
  updated_at?: string;
  matricule?: string;
  specialities?:  Speciality[] | string[];
}

export interface Speciality {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  matricule?: string;
}




export interface DayData {
  message: 'Disponible' | 'Réservé';
  'pas cs': string;
  'nbre cs': number;
  'nbe med': number;
  doctorsNames: string;
}

export interface PeriodData {
  lundi: DayData;
  mardi: DayData;
  mercredi: DayData;
  jeudi: DayData;
  vendredi: DayData;
}

export interface RoomProgram {
  roomId: string;
  nom_salle: string;
  num_salle: string;
  data: {
    matin: PeriodData;
    AM: PeriodData;
  };
}

export interface PoleProgram {
  poleId: string;
  poleName: string;
  data: RoomProgram[];
}
