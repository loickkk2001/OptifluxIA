import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Response } from '../../dtos/response/Response';
import { Room } from '../../models/services';
import { CreateRoomRequest } from '../../dtos/request/CreateServiceRequest';


@Injectable({
  providedIn: 'root'
})
export class RoomService {
  apiUrl = environment.apiUrl + '/rooms';
  
  constructor(private http: HttpClient) {}

  findAllRooms(): Observable<Response<Room[]>> {
    return this.http.get<Response<Room[]>>(`${this.apiUrl}`);
  }

  findRoomById(roomId: string): Observable<Response<Room>> {
    return this.http.get<Response<Room>>(`${this.apiUrl}/${roomId}`);
  }

  createRoom(createRoomRequest: CreateRoomRequest): Observable<Response<Room>> {
    return this.http.post<Response<Room>>(`${this.apiUrl}/create`, createRoomRequest);
  }

  updateRoom(roomId: string, RoomData: CreateRoomRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${roomId}`, RoomData);
  }

  updateRoomStatus(roomId: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-status/${roomId}`, 
        { status: status },
        { headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  deleteRoom(roomId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${roomId}`);
  }
}
