import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Enseignant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export interface Cours {
  id: number;
  nom: string;
  description: string;
  niveau: string;
  heureDebut: string;
  heureFin: string;
  classe?: {
    id: number;
    nom: string;
  };
}

export interface Etudiant {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  classe?: {
    id: number;
    nom: string;
  };
}

export interface Note {
  id: number;
  tp: number;
  exam: number;
  absences: number;
  moyenne: number;
  etudiant: Etudiant;
  cours: Cours;
}

export interface Conge {
  id: number;
  type: string;
  motif: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  motifRejet?: string;
}

export interface Absence {
  id: number;
  date: string;
  justifiee: boolean;
  motif: string;
  etudiant: Etudiant;
  cours: Cours;
}

@Injectable({
  providedIn: 'root'
})
export class EnseignantService {
  private apiUrl = 'http://localhost:8081/api/enseignants';

  constructor(private http: HttpClient) {}

  // Headers avec token JWT (si utilisé)
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}` // Optionnel pour l'authentification
    });
  }

  // Gestion centralisée des erreurs
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      errorMessage = `Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error?.message) {
        errorMessage += `\nDétails: ${error.error.message}`;
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /* ========== ENSEIGNANTS ========== */
  getAllEnseignants(): Observable<Enseignant[]> {
    return this.http.get<Enseignant[]>(this.apiUrl, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getEnseignantById(id: number): Observable<Enseignant> {
    return this.http.get<Enseignant>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  createEnseignant(enseignant: Omit<Enseignant, 'id'>): Observable<Enseignant> {
    return this.http.post<Enseignant>(this.apiUrl, enseignant, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateEnseignant(id: number, enseignant: Partial<Enseignant>): Observable<Enseignant> {
    return this.http.put<Enseignant>(`${this.apiUrl}/${id}`, enseignant, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteEnseignant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /* ========== COURS ========== */
  getCoursByEnseignant(enseignantId: number): Observable<Cours[]> {
    return this.http.get<Cours[]>(`${this.apiUrl}/${enseignantId}/cours`, { headers: this.getHeaders() })
      .pipe(
        map(coursList => coursList.map(c => this.formatCoursTimes(c))),
        catchError(this.handleError)
      );
  }

  getCoursById(enseignantId: number, coursId: number): Observable<Cours> {
    return this.http.get<Cours>(`${this.apiUrl}/${enseignantId}/cours/${coursId}`, { headers: this.getHeaders() })
      .pipe(
        map(cours => this.formatCoursTimes(cours)),
        catchError(this.handleError)
      );
  }

  createCours(enseignantId: number, cours: Omit<Cours, 'id'>): Observable<Cours> {
    return this.http.post<Cours>(`${this.apiUrl}/${enseignantId}/cours`, cours, { headers: this.getHeaders() })
      .pipe(
        map(newCours => this.formatCoursTimes(newCours)),
        catchError(this.handleError)
      );
  }

  updateCours(enseignantId: number, coursId: number, cours: Partial<Cours>): Observable<Cours> {
    return this.http.put<Cours>(`${this.apiUrl}/${enseignantId}/cours/${coursId}`, cours, { headers: this.getHeaders() })
      .pipe(
        map(updatedCours => this.formatCoursTimes(updatedCours)),
        catchError(this.handleError)
      );
  }

  deleteCours(enseignantId: number, coursId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${enseignantId}/cours/${coursId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Formatage des heures pour les cours
  private formatCoursTimes(cours: Cours): Cours {
    return {
      ...cours,
      heureDebut: this.formatTime(cours.heureDebut),
      heureFin: this.formatTime(cours.heureFin)
    };
  }

  private formatTime(timeString: string): string {
    if (!timeString) return '';
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
    
    const timeParts = timeString.split(':');
    return `${timeParts[0].padStart(2, '0')}:${(timeParts[1] || '00').padStart(2, '0')}`;
  }

  /* ========== ÉTUDIANTS ========== */
  getEtudiantsByEnseignant(enseignantId: number): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.apiUrl}/${enseignantId}/etudiants`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getEtudiantsByCours(enseignantId: number, coursId: number): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.apiUrl}/${enseignantId}/cours/${coursId}/etudiants`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /* ========== NOTES ========== */
  getNotesByEnseignant(enseignantId: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.apiUrl}/${enseignantId}/notes`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getNoteById(enseignantId: number, noteId: number): Observable<Note> {
    return this.http.get<Note>(`${this.apiUrl}/${enseignantId}/notes/${noteId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }
addNote(enseignantId: number, noteRequest: Note): Observable<Note> {
  return this.http.post<Note>(
    `${this.apiUrl}/${enseignantId}/notes`,
    noteRequest,
    { 
      headers: this.getHeaders(),
      observe: 'response' // Pour avoir accès à toute la réponse
    }
  ).pipe(
    map(response => {
      if (response.body) {
        return response.body;
      }
      throw new Error('Le corps de la réponse est vide');
    }),
    catchError((error: HttpErrorResponse) => {
      let errorMessage = `Code: ${error.status}\nMessage: `;
      
      // Essayez d'extraire le message d'erreur du backend
      if (error.error && typeof error.error === 'string') {
        errorMessage += error.error;
      } else if (error.error && error.error.message) {
        errorMessage += error.error.message;
      } else {
        errorMessage += error.message || 'Erreur inconnue';
      }
      
      console.error('Erreur lors de l\'ajout de la note:', errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
}

  updateNote(enseignantId: number, noteId: number, note: Partial<Note>): Observable<Note> {
    return this.http.put<Note>(`${this.apiUrl}/${enseignantId}/notes/${noteId}`, note, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteNote(enseignantId: number, noteId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${enseignantId}/notes/${noteId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /* ========== CONGÉS ========== */
  getCongesByEnseignant(enseignantId: number): Observable<Conge[]> {
    return this.http.get<Conge[]>(`${this.apiUrl}/${enseignantId}/conges`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getCongeById(enseignantId: number, congeId: number): Observable<Conge> {
    return this.http.get<Conge>(`${this.apiUrl}/${enseignantId}/conges/${congeId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  demanderConge(enseignantId: number, conge: Omit<Conge, 'id'|'statut'>): Observable<Conge> {
    return this.http.post<Conge>(`${this.apiUrl}/${enseignantId}/conges`, conge, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  annulerConge(enseignantId: number, congeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${enseignantId}/conges/${congeId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  /* ========== ABSENCES ========== */
  getAbsencesByEnseignant(enseignantId: number): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/${enseignantId}/absences`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getAbsenceById(enseignantId: number, absenceId: number): Observable<Absence> {
    return this.http.get<Absence>(`${this.apiUrl}/${enseignantId}/absences/${absenceId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  createAbsence(enseignantId: number, absence: Omit<Absence, 'id'>): Observable<Absence> {
    return this.http.post<Absence>(`${this.apiUrl}/${enseignantId}/absences`, absence, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateAbsence(enseignantId: number, absenceId: number, absence: Partial<Absence>): Observable<Absence> {
    return this.http.put<Absence>(`${this.apiUrl}/${enseignantId}/absences/${absenceId}`, absence, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteAbsence(enseignantId: number, absenceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${enseignantId}/absences/${absenceId}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }
}