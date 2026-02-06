import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from '../../dtos/response/Response';
import { CreateBoxPlanRequest } from '../../dtos/request/CreateBoxPlanRequest';
import { BoxPlan } from '../../models/box_plan';

@Injectable({
  providedIn: 'root'
})
export class BoxPlanService {
  apiUrl = environment.apiUrl + '/box_plans';

  constructor(private http: HttpClient) {}

  findAllBoxPlans(): Observable<Response<BoxPlan[]>> {
    return this.http.get<Response<BoxPlan[]>>(`${this.apiUrl}`);
  }

  findBoxPlanById(boxPlanId: string): Observable<Response<BoxPlan>> {
    return this.http.get<Response<BoxPlan>>(`${this.apiUrl}/${boxPlanId}`);
  }

  createBoxPlan(createBoxPlanRequest: CreateBoxPlanRequest): Observable<Response<BoxPlan>> {
    return this.http.post<Response<BoxPlan>>(`${this.apiUrl}/create`, createBoxPlanRequest);
  }

  deleteBoxPlan(boxPlanId: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/delete/${boxPlanId}`);
  }
  
  // Dans BoxPlan.service.ts
  updateBoxPlan(boxPlanId: string, status: string): Observable<any> {
    const updateData: { status: string} = { status };
    return this.http.put(`${this.apiUrl}/update/${boxPlanId}`, updateData);
  }

  // Nouvelle méthode pour récupérer les plannings par plage de dates
  findBoxPlansByDateRange(startDate: Date, endDate: Date): Observable<Response<BoxPlan[]>> {
    const params = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
    return this.http.get<Response<BoxPlan[]>>(`${this.apiUrl}/by-date-range`, { params });
  }

  updateBoxPlanStatus(boxPlanId: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-status/${boxPlanId}`, 
        { status: status },
        { headers: { 'Content-Type': 'application/json' } }
    );
  }

  uploadBoxPlans(file: File): Observable<Response<any>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<Response<any>>(`${this.apiUrl}/upload`, formData);
  }
}