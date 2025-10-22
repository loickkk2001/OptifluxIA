export interface BoxPlan {
    id?: string;
    staff_id: string;
    doctors_id: string[];
    poll: string;
    room: string;
    period: string;
    date: string;
    consultation_number: string;
    consultation_time: string;
    comment: string;
    status: string;
    created_at?: string;
    updated_at?: string;
    matricule?: string;
  }