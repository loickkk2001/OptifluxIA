import { Injectable } from '@angular/core';
import {environment} from '../../environment/environment';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Response} from '../../dtos/response/Response';
import {Code} from '../../models/code';

@Injectable({
  providedIn: 'root'
})
export class CodeService {

  apiUrl = environment.apiUrl + '/codes'
  constructor(private http: HttpClient) { }

  findAllCodes(): Observable<Response<Code[]>>{
    return this.http.get<Response<Code[]>>(this.apiUrl);
  }

  findCodeById(CodeId: string): Observable<Response<Code[]>> {
    return this.http.get<Response<Code[]>>(`${this.apiUrl}/${CodeId}`)
  }
}
