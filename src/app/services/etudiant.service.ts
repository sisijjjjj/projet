import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EtudiantService {
  sendEmailToTeacher(etudiantId: number, emailPayload: { teacherEmail: any; subject: any; message: any; }) {
    throw new Error('Method not implemented.');
  }

  private baseUrl = 'http://localhost:8080/api/etudiants';

  constructor(private http: HttpClient) { }

  // Récupérer tous les étudiants
  getAllEtudiants(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  // Récupérer un étudiant par ID
  getEtudiantById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  // Ajouter un étudiant
  addEtudiant(etudiant: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, etudiant);
  }

  // Mettre à jour un étudiant
  updateEtudiant(id: number, etudiant: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, etudiant);
  }

  // Supprimer un étudiant
  deleteEtudiant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Récupérer étudiants d'une classe
  getEtudiantsByClasse(idClasse: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/classe/${idClasse}`);
  }

  // Envoyer un email (POST)
  sendEmail(etudiantId: number, teacherEmail: string, subject: string, message: string): Observable<string> {
    const payload = { teacherEmail, subject, message };
    return this.http.post<string>(`${this.baseUrl}/${etudiantId}/send-email`, payload);
  }

  // Récupérer email d'un étudiant
  getEtudiantEmail(id: number): Observable<string> {
    return this.http.get<string>(`${this.baseUrl}/${id}/email`);
  }

  // Récupérer cours d'un étudiant
  getCoursByEtudiant(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}/cours`);
  }

  // Récupérer notes d'un étudiant
  getNotesByEtudiant(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}/notes`);
  }

  // Récupérer absences d'un étudiant
  getAbsencesByEtudiant(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}/absences`);
  }

  // Récupérer tous les cours de tous les étudiants
  getAllCoursForAllEtudiants(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/all/cours`);
  }
}
