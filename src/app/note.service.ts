import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NoteService {

  private apiUrl = 'http://localhost:8080/api/enseignants/1/cours/id/etudiant/1/note'; // Remplace avec l'URL correcte

  constructor(private http: HttpClient) { }

  updateNote(studentId: number, coursId: number, type: string, note: number): Observable<any> {
    const body = { studentId, coursId, type, note };
    return this.http.put<any>(`${this.apiUrl}/update`, body);  // Exemple d'endpoint
  }
}
