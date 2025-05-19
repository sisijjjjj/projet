import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CoursService {

  private apiUrl = 'http://localhost:8080/api/enseignants/id/cours';  // URL de l'API pour récupérer les cours

  constructor(private http: HttpClient) { }

  // Récupérer les cours depuis l'API
  getCours(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);  // Effectuer une requête GET pour obtenir les cours
  }
}
