export interface WorkDay {
    day: string;
    start_time: string;
    end_time: string;
}
  
export interface Contrat {
    id?: string;
    user_id: string;
    speciality: string;
    contrat_type: string;
    contrat_hours: string;
    work_days: WorkDay[];
}