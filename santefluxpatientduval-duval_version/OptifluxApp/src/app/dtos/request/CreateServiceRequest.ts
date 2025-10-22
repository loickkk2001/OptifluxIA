export interface CreateServiceRequest {
  name: string
  head: string
  created_at?: string;
  updated_at?: string;
  matricule?: string;
}

export interface CreatePoleRequest {
  name: string;
  head? : string;
  created_at?: string;
  updated_at?: string;
  matricule?: string;
  specialities: string[];
}

export interface CreateRoomRequest {
  name: string;
  localisation? : string;
  description? : string;
  created_at?: string;
  updated_at?: string;
  matricule?: string;
  status?: string;
}

export interface CreateSpecialityRequest {
  name: string;
  created_at?: string;
  updated_at?: string;
  matricule?: string;
}

