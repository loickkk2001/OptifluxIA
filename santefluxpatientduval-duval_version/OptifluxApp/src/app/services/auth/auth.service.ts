import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { Response } from '../../dtos/response/Response';
import { User } from '../../models/User';
import { TokenService } from '../../services/token/token.service';
import { CreateUserRequest } from '../../dtos/request/CreateUserRequest';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  apiUrl = environment.apiUrl;
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private tokenService: TokenService) {
    this.restoreUserFromToken();
  }

  login(email: string, password: string, role: string): Observable<Response<User>> {
    return this.http.post<Response<User>>(`${this.apiUrl}/login`, { email, password, role }).pipe(
      tap((response: Response<User>) => {
        if (response.token) {
          console.log('Login successful, saving token:', response.token);
          this.tokenService.saveToken(response.token);
          const userData = {
            first_name: response.data.first_name,
            last_name: response.data.last_name,
            email: response.data.email,
            phoneNumber: response.data.phoneNumber,
            role: role || response.data.role,
            password: response.data.password,
            service: response.data.service,
            service_id: response.data.service_id, // Ensure service_id is included
            _id: response.data._id || this.tokenService.getUserId()
          };
          console.log('User data saved after login:', userData);
          this.tokenService.saveUserData(userData);
          this.userSubject.next(userData);
        }
      })
    );
  }

  logout(): Observable<any> {
    const token = this.tokenService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    console.log('Logging out, clearing token and user data');
    return this.http.post(`${this.apiUrl}/logout`, {}, { headers }).pipe(
      tap(() => {
        this.tokenService.removeToken();
        localStorage.removeItem('USER_DATA');
        this.userSubject.next(null);
      })
    );
  }

  getUserInfo(): Observable<User | null> {
    const currentUser = this.userSubject.getValue();
    if (currentUser) {
      console.log('Returning current user from BehaviorSubject:', currentUser);
      return of(currentUser);
    }

    const token = this.tokenService.getToken();
    if (!token || this.tokenService.isExpired()) {
      console.log('No valid token found or token expired:', { token, isExpired: this.tokenService.isExpired() });
      return of(null);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    console.log('Fetching user info from API with token:', token);
    return this.http.get<Response<User>>(`${this.apiUrl}/user-info`, { headers }).pipe(
      switchMap((response: Response<User>) => {
        if (!response.data) {
          console.log('No user data returned from API');
          return of(null);
        }
        const userData = {
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
          phoneNumber: response.data.phoneNumber,
          role: response.data.role,
          password: response.data.password,
          service: response.data.service,
          service_id: response.data.service_id, // Ensure service_id is included
          _id: this.tokenService.getUserId()
        };
        console.log('User data fetched from API:', userData);
        this.tokenService.saveUserData(userData);
        this.userSubject.next(userData);
        return of(userData);
      }),
      tap({
        error: (err) => {
          console.error('Error fetching user info:', err);
          this.tokenService.removeToken();
          localStorage.removeItem('USER_DATA');
          this.userSubject.next(null);
        }
      })
    );
  }

  getCurrentUser(): User | null {
    const currentUser = this.userSubject.getValue();
    console.log('Getting current user:', currentUser);
    return currentUser;
  }

  isAuthenticated(): boolean {
    const token = this.tokenService.getToken();
    const isExpired = this.tokenService.isExpired();
    const isAuthenticated = !!token && !isExpired;
    console.log('Checking authentication status:', { token, isExpired, isAuthenticated });
    return isAuthenticated;
  }

  createUser(createUserRequest: CreateUserRequest): Observable<Response<User>> {
    return this.http.post<Response<User>>(`${this.apiUrl}/users/register`, createUserRequest);
  }

  private restoreUserFromToken(): void {
    const token = this.tokenService.getToken();
    if (token && !this.tokenService.isExpired()) {
      const userData = this.tokenService.getUserData();
      if (userData) {
        console.log('Restored user from token:', userData);
        this.userSubject.next(userData);
      } else {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        console.log('No user data in storage, fetching from API with token:', token);
        this.http.get<Response<User>>(`${this.apiUrl}/user-info`, { headers }).subscribe({
          next: (response) => {
            if (!response.data) {
              console.log('No user data returned from API during restore');
              this.tokenService.removeToken();
              localStorage.removeItem('USER_DATA');
              this.userSubject.next(null);
              return;
            }
            const userData = {
              first_name: response.data.first_name,
              last_name: response.data.last_name,
              email: response.data.email,
              role: response.data.role,
              phoneNumber: response.data.phoneNumber,
              password: response.data.password,
              service: response.data.service,
              service_id: response.data.service_id, // Ensure service_id is included
              _id: this.tokenService.getUserId()
            };
            console.log('Fetched user from API during restore:', userData);
            this.tokenService.saveUserData(userData);
            this.userSubject.next(userData);
          },
          error: (err) => {
            console.error('Error restoring user from token:', err);
            this.tokenService.removeToken();
            localStorage.removeItem('USER_DATA');
            this.userSubject.next(null);
          }
        });
      }
    } else {
      console.log('No valid token found, clearing user data');
      this.tokenService.removeToken();
      localStorage.removeItem('USER_DATA');
      this.userSubject.next(null);
    }
  }
}