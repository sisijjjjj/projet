import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AbsenceService {

  // Simuler les données des absences
  private absences = [
    { enseignantId: 1, studentName: 'Student A', present: false },
    { enseignantId: 1, studentName: 'Student B', present: true },
    { enseignantId: 1, studentName: 'Student C', present: false },
  ];

  // Récupérer les absences pour un enseignant
  getAbsences(enseignantId: number): any[] {
    return this.absences.filter(absence => absence.enseignantId === enseignantId);
  }

  // Vérifier si un étudiant est absent
  estAbsent(enseignantId: number, studentName: string): boolean {
    const absence = this.absences.find(
      a => a.enseignantId === enseignantId && a.studentName === studentName
    );
    return absence ? !absence.present : false;
  }

  // Mettre à jour l'absence d'un étudiant
  updateAbsence(enseignantId: number, studentName: string, present: boolean): void {
    const absence = this.absences.find(
      a => a.enseignantId === enseignantId && a.studentName === studentName
    );
    if (absence) {
      absence.present = present;
    } else {
      this.absences.push({ enseignantId, studentName, present });
    }
  }
}
