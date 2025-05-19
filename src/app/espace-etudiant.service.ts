// src/app/espace-etudiant.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
};

@Injectable({
  providedIn: 'root'
})
export class EspaceEtudiantService {
  private apiUrl = 'http://localhost:8080/api/etudiants';

  constructor(private http: HttpClient) { }

  // Méthodes GET
  getEtudiants(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getEtudiant(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Méthodes POST/PUT pour l'enregistrement
  addEtudiant(etudiant: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, etudiant, httpOptions);
  }

  updateEtudiant(id: number, etudiant: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, etudiant, httpOptions);
  }

  deleteEtudiant(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Méthodes spécifiques
  justifierAbsence(etudiantId: number, absenceId: number, justification: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${etudiantId}/absences/${absenceId}/justifier`,
      { justification },
      httpOptions
    );
  }
}