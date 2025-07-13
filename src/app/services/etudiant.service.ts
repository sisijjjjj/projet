import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ==================== INTERFACES ====================
export interface Etudiant {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  classe?: Classe;
  cours?: Cours[];
  notes?: Note[];
  absences?: Absence[];
}

export interface Classe {
  id?: number;
  nom?: string;
  niveau?: string;
}

export interface Cours {
  id?: number;
  nom?: string;
  description?: string;
  enseignant?: Enseignant;
}

export interface Enseignant {
  id?: number;
  nom?: string;
  prenom?: string;
  email?: string;
}

export interface Note {
  id?: number;
  valeur?: number;
  appreciation?: string;
  date?: Date;
  cours?: Cours;
}

export interface Absence {
  id?: number;
  date?: Date;
  justifiee?: boolean;
  motif?: string;
  cours?: Cours;
}

export interface EmailRequest {
  teacherEmail: string;
  subject?: string;
  message: string;
}

// ==================== SERVICE ====================
@Injectable({
  providedIn: 'root'
})
export class EtudiantService {
  private apiUrl = 'http://localhost:8080/api/etudiants';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  // Student CRUD Operations
  createEtudiant(etudiant: Etudiant): Observable<Etudiant> {
    return this.http.post<Etudiant>(this.apiUrl, etudiant, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAllEtudiants(): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getEtudiantById(id: number): Observable<Etudiant> {
    return this.http.get<Etudiant>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateEtudiant(id: number, etudiant: Etudiant): Observable<Etudiant> {
    return this.http.put<Etudiant>(`${this.apiUrl}/${id}`, etudiant, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteEtudiant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Related Data Operations
  getEtudiantsByClasse(idClasse: number): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.apiUrl}/classe/${idClasse}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getCoursByEtudiant(id: number): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${this.apiUrl}/${id}/cours`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getNotesByEtudiant(id: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.apiUrl}/${id}/notes`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAbsencesByEtudiant(id: number): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/${id}/absences`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAllCoursForAllEtudiants(): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${this.apiUrl}/all/cours`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Email Operations
  sendEmailToTeacherGet(
    etudiantId: number,
    teacherEmail: string,
    message: string,
    subject?: string
  ): Observable<string> {
    let url = `${this.apiUrl}/${etudiantId}/send-email?teacherEmail=${encodeURIComponent(teacherEmail)}&message=${encodeURIComponent(message)}`;
    if (subject) {
      url += `&subject=${encodeURIComponent(subject)}`;
    }
    return this.http.get<string>(url, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  sendEmailToTeacherPost(
    etudiantId: number,
    emailRequest: EmailRequest
  ): Observable<string> {
    return this.http.post<string>(
      `${this.apiUrl}/${etudiantId}/send-email`,
      emailRequest,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

 
  

  getEtudiantEmail(id: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/${id}/email`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }
  // In your EnseignantService
updateCours(enseignantId: number, coursId: number, coursData: any): Observable<Cours> {
  return this.http.put<Cours>(`${this.apiUrl}/${enseignantId}/cours/${coursId}`, coursData, { headers: this.getHeaders() })
    .pipe(catchError(this.handleError));
}

deleteCours(coursId: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/cours/${coursId}`, { headers: this.getHeaders() })
    .pipe(catchError(this.handleError));
}
}