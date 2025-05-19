import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnseignantService {

  private apiUrl = 'http://localhost:8080/api/admin/enseignants';

  constructor(private http: HttpClient) {}

  getAllEnseignants(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
