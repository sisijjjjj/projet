import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Enseignant, Cours, Etudiant, Note, Conge, Absence, EnseignantService } from '../services/enseignant.service';

@Component({
  selector: 'app-enseignant',
  templateUrl: './enseignant.component.html',
  styleUrls: ['./enseignant.component.css']
})
export class EnseignantComponent implements OnInit {
  enseignants: Enseignant[] = [];
  selectedEnseignant: Enseignant | null = null;
  cours: Cours[] = [];
  etudiants: Etudiant[] = [];
  notes: Note[] = [];
  conges: Conge[] = [];
  absences: Absence[] = [];

  // Forms
  coursForm: FormGroup;
  noteForm: FormGroup;
  congeForm: FormGroup;
  absenceForm: FormGroup;

  // UI State
  isCoursFormVisible = false;
  isNoteFormVisible = false;
  isCongeFormVisible = false;
  isAbsenceFormVisible = false;
  selectedCours: Cours | null = null;
  selectedNote: Note | null = null;
  selectedConge: Conge | null = null;
  selectedAbsence: Absence | null = null;

  constructor(
    private enseignantService: EnseignantService,
    private fb: FormBuilder,
    private cdRef: ChangeDetectorRef,
    private zone: NgZone // Ajout important
  ) {
    this.coursForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      niveau: ['', Validators.required],
      heureDebut: ['', Validators.required],
      heureFin: ['', Validators.required],
      classeId: [null]
    });

    this.noteForm = this.fb.group({
      etudiantId: [null, Validators.required],
      coursId: [null, Validators.required],
      tp: [0, [Validators.required, Validators.min(0), Validators.max(20)]],
      exam: [0, [Validators.required, Validators.min(0), Validators.max(20)]],
      absences: [0, [Validators.required, Validators.min(0)]]
    });

    this.congeForm = this.fb.group({
      type: ['ANNUEL', Validators.required],
      motif: ['', [Validators.required, Validators.minLength(10)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required]
    });

    this.absenceForm = this.fb.group({
      etudiantId: [null, Validators.required],
      coursId: [null, Validators.required],
      date: ['', Validators.required],
      justifiee: [false],
      motif: ['']
    });
  }

  ngOnInit(): void {
    this.loadEnseignants();
  }
  // Ajoutez cette méthode dans le composant
trackByCoursId(index: number, cours: Cours): number {
  return cours.id; // Utilisez un identifiant unique
}

  loadEnseignants(): void {
    this.enseignantService.getAllEnseignants().subscribe({
      next: (data) => {
        this.enseignants = data;
        this.cdRef.detectChanges();
      },
      error: (err: HttpErrorResponse) => this.showError('Erreur chargement enseignants', err)
    });
  }

  onEnseignantSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value ? Number(target.value) : null;
    this.selectEnseignant(selectedId !== null 
      ? this.enseignants.find(e => e.id === selectedId) || null
      : null);
  }

  selectEnseignant(enseignant: Enseignant | null): void {
    this.selectedEnseignant = enseignant;
    if (enseignant?.id) {
      this.loadCours(enseignant.id);
      this.loadEtudiants(enseignant.id);
      this.loadNotes(enseignant.id);
      this.loadConges(enseignant.id);
      this.loadAbsences(enseignant.id);
    } else {
      this.cours = [];
      this.etudiants = [];
      this.notes = [];
      this.conges = [];
      this.absences = [];
    }
  }

 loadCours(enseignantId: number): void {
    this.enseignantService.getCoursByEnseignant(enseignantId).subscribe({
      next: (data: Cours[]) => {
        this.zone.run(() => { // Encapsulation dans NgZone
          this.cours = data;
          console.log('Cours chargés:', this.cours); // Vérification console
          this.cdRef.markForCheck(); // Changement important
        });
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.zone.run(() => {
          this.cours = [];
          this.cdRef.markForCheck();
        });
      }
    });
  }


  loadEtudiants(enseignantId: number): void {
    this.enseignantService.getEtudiantsByEnseignant(enseignantId).subscribe({
      next: (data) => this.etudiants = data,
      error: (err: HttpErrorResponse) => this.showError('Erreur chargement étudiants', err)
    });
  }

  loadNotes(enseignantId: number): void {
    this.enseignantService.getNotesByEnseignant(enseignantId).subscribe({
      next: (data) => this.notes = data,
      error: (err: HttpErrorResponse) => this.showError('Erreur chargement notes', err)
    });
  }

  loadConges(enseignantId: number): void {
    this.enseignantService.getCongesByEnseignant(enseignantId).subscribe({
      next: (data) => this.conges = data,
      error: (err: HttpErrorResponse) => this.showError('Erreur chargement congés', err)
    });
  }

  loadAbsences(enseignantId: number): void {
    this.enseignantService.getAbsencesByEnseignant(enseignantId).subscribe({
      next: (data) => this.absences = data,
      error: (err: HttpErrorResponse) => this.showError('Erreur chargement absences', err)
    });
  }

  showCoursForm(cours?: Cours): void {
    this.isCoursFormVisible = true;
    this.selectedCours = cours || null;
    
    if (cours) {
      this.coursForm.patchValue({
        nom: cours.nom,
        description: cours.description,
        niveau: cours.niveau,
        heureDebut: cours.heureDebut,
        heureFin: cours.heureFin,
        classeId: cours.classe?.id
      });
    } else {
      this.coursForm.reset();
    }
  }

  closeCoursForm(): void {
    this.isCoursFormVisible = false;
    this.coursForm.reset();
    this.selectedCours = null;
  }

  submitCoursForm(): void {
    if (this.coursForm.invalid) {
      alert('Veuillez remplir correctement le formulaire');
      return;
    }

    if (!this.selectedEnseignant?.id) {
      alert('Aucun enseignant sélectionné');
      return;
    }

    const formData = this.coursForm.value;
    const enseignantId = this.selectedEnseignant.id;

    const operation = this.selectedCours?.id
      ? this.enseignantService.updateCours(enseignantId, this.selectedCours.id, formData)
      : this.enseignantService.createCours(enseignantId, formData);

    operation.subscribe({
      next: () => {
        alert(this.selectedCours?.id ? 'Cours modifié avec succès' : 'Cours créé avec succès');
        this.loadCours(enseignantId);
        this.closeCoursForm();
      },
      error: (err: HttpErrorResponse) => this.showError(
        this.selectedCours?.id ? 'Erreur modification cours' : 'Erreur création cours', 
        err
      )
    });
  }

  deleteCours(cours: Cours): void {
    if (!this.selectedEnseignant?.id || !cours?.id) {
      console.error('IDs invalides pour la suppression');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) {
      return;
    }

    this.enseignantService.deleteCours(this.selectedEnseignant.id, cours.id)
      .subscribe({
        next: () => {
          this.cours = this.cours.filter(c => c.id !== cours.id);
          alert('Cours supprimé avec succès');
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          this.showError('Erreur suppression cours', err);
        }
      });
  }

  showNoteForm(note?: Note): void {
    this.isNoteFormVisible = true;
    this.selectedNote = note || null;
    
    if (note) {
      this.noteForm.patchValue({
        etudiantId: note.etudiant?.id,
        coursId: note.cours?.id,
        tp: note.tp,
        exam: note.exam,
        absences: note.absences
      });
    } else {
      this.noteForm.reset();
    }
  }

  closeNoteForm(): void {
    this.isNoteFormVisible = false;
    this.noteForm.reset();
    this.selectedNote = null;
  }

  submitNoteForm(): void {
    if (this.noteForm.invalid) {
      alert('Veuillez remplir correctement le formulaire');
      return;
    }

    if (!this.selectedEnseignant?.id) {
      alert('Aucun enseignant sélectionné');
      return;
    }

    const formData = this.noteForm.value;
    const enseignantId = this.selectedEnseignant.id;

    if (this.selectedNote?.id) {
      this.enseignantService.updateNote(enseignantId, this.selectedNote.id, formData)
        .subscribe({
          next: () => {
            alert('Note modifiée avec succès');
            this.loadNotes(enseignantId);
            this.closeNoteForm();
          },
          error: (err: HttpErrorResponse) => this.showError('Erreur modification note', err)
        });
    } else {
      this.enseignantService.addNote(enseignantId, formData)
        .subscribe({
          next: () => {
            alert('Note ajoutée avec succès');
            this.loadNotes(enseignantId);
            this.closeNoteForm();
          },
          error: (err: HttpErrorResponse) => this.showError('Erreur ajout note', err)
        });
    }
  }

  deleteNote(note: Note): void {
    if (!this.selectedEnseignant?.id || !note?.id) {
      console.error('IDs invalides pour la suppression');
      return;
    }

    if (!confirm('Voulez-vous vraiment supprimer cette note ?')) {
      return;
    }

    this.enseignantService.deleteNote(this.selectedEnseignant.id, note.id)
      .subscribe({
        next: () => {
          this.notes = this.notes.filter(n => n.id !== note.id);
          alert('Note supprimée avec succès');
        },
        error: (err: HttpErrorResponse) => this.showError('Erreur suppression note', err)
      });
  }

  showCongeForm(): void {
    this.isCongeFormVisible = true;
    this.congeForm.reset({ type: 'ANNUEL' });
  }

  closeCongeForm(): void {
    this.isCongeFormVisible = false;
    this.congeForm.reset();
  }

  submitCongeForm(): void {
    if (this.congeForm.invalid) {
      alert('Veuillez remplir correctement le formulaire');
      return;
    }

    if (!this.selectedEnseignant?.id) {
      alert('Aucun enseignant sélectionné');
      return;
    }

    const congeData = {
      ...this.congeForm.value,
      statut: 'EN_ATTENTE'
    };

    this.enseignantService.demanderConge(this.selectedEnseignant.id, congeData)
      .subscribe({
        next: () => {
          alert('Demande de congé envoyée avec succès');
          this.loadConges(this.selectedEnseignant!.id!);
          this.closeCongeForm();
        },
        error: (err: HttpErrorResponse) => this.showError('Erreur demande congé', err)
      });
  }

  getCongeStatusClass(status: string): string {
    switch (status) {
      case 'APPROUVE': return 'badge-success';
      case 'EN_ATTENTE': return 'badge-warning';
      case 'REJETE': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  showAbsenceForm(absence?: Absence): void {
    this.isAbsenceFormVisible = true;
    this.selectedAbsence = absence || null;
    
    if (absence) {
      this.absenceForm.patchValue({
        etudiantId: absence.etudiant?.id,
        coursId: absence.cours?.id,
        date: absence.date,
        justifiee: absence.justifiee,
        motif: absence.motif
      });
    } else {
      this.absenceForm.reset({ justifiee: false });
    }
  }

  closeAbsenceForm(): void {
    this.isAbsenceFormVisible = false;
    this.absenceForm.reset();
    this.selectedAbsence = null;
  }

  submitAbsenceForm(): void {
    if (this.absenceForm.invalid) {
      alert('Veuillez remplir correctement le formulaire');
      return;
    }

    if (!this.selectedEnseignant?.id) {
      alert('Aucun enseignant sélectionné');
      return;
    }

    const formData = this.absenceForm.value;
    const enseignantId = this.selectedEnseignant.id;

    if (this.selectedAbsence?.id) {
      this.enseignantService.updateAbsence(enseignantId, this.selectedAbsence.id, formData)
        .subscribe({
          next: () => {
            alert('Absence modifiée avec succès');
            this.loadAbsences(enseignantId);
            this.closeAbsenceForm();
          },
          error: (err: HttpErrorResponse) => this.showError('Erreur modification absence', err)
        });
    } else {
      this.enseignantService.createAbsence(enseignantId, formData)
        .subscribe({
          next: () => {
            alert('Absence enregistrée avec succès');
            this.loadAbsences(enseignantId);
            this.closeAbsenceForm();
          },
          error: (err: HttpErrorResponse) => this.showError('Erreur enregistrement absence', err)
        });
    }
  }

  deleteAbsence(absence: Absence): void {
    if (!this.selectedEnseignant?.id || !absence?.id) {
      console.error('IDs invalides pour la suppression');
      return;
    }

    if (!confirm('Voulez-vous vraiment supprimer cette absence ?')) {
      return;
    }

    this.enseignantService.deleteAbsence(this.selectedEnseignant.id, absence.id)
      .subscribe({
        next: () => {
          this.absences = this.absences.filter(a => a.id !== absence.id);
          alert('Absence supprimée avec succès');
        },
        error: (err: HttpErrorResponse) => this.showError('Erreur suppression absence', err)
      });
  }

  getStudentName(etudiantId: number | undefined): string {
    if (etudiantId === undefined) return 'Inconnu';
    const etudiant = this.etudiants.find(e => e.id === etudiantId);
    return etudiant ? `${etudiant.prenom} ${etudiant.nom}` : 'Inconnu';
  }

  getCoursName(coursId: number | undefined): string {
    if (coursId === undefined) return 'Inconnu';
    const cours = this.cours.find(c => c.id === coursId);
    return cours ? cours.nom : 'Inconnu';
  }

  formatHeure(heure: string): string {
    if (!heure) return '';
    return heure.substring(0, 5); // Format HH:mm
  }

  private showError(context: string, error: HttpErrorResponse): void {
    console.error(context, error);
    alert(`${context}: ${error.message}`);
  }
}