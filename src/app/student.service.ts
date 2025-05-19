import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://localhost:8080/api/student'; // URL de votre API backend

  constructor(private http: HttpClient) {}

  // Récupérer les cours de l'étudiant
  getCourses(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses/${studentId}`);
  }

  // Récupérer les absences de l'étudiant
  getAbsences(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/absences/${studentId}`);
  }

  // Récupérer les notes de l'étudiant
  getGrades(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/grades/${studentId}`);
  }
}
