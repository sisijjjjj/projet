import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Note {
  student: string;
  courseName: string;
  tp: number | null;
  exam: number | null;
  absences: number;
}

interface CourseContent {
  title: string;
  chapters: string[];
  resources: string[];
}

interface Course {
  name: string;
  instructor: string;
  instructorEmail: string;
  image?: string;
  notes: Note[];
  courseContent: CourseContent;
}

interface EmailPayload {
  teacherEmail: string;
  subject: string;
  message: string;
}

@Component({
  selector: 'app-espace-etudiant',
  templateUrl: './espace-etudiant.component.html',
  styleUrls: ['./espace-etudiant.component.css']
})
export class EspaceEtudiantComponent implements OnInit {
  activeSection: { id: string; type: 'course' | 'notes' | 'contact' } | null = null;
  selectedCourse: Course | null = null;
  emailForm: FormGroup;
  emailSent = false;
  emailError = false;

  currentStudent = 'Sirine Mimouni';  // Étudiant courant fictif (à modifier selon connexion)

  allNotes: Note[] = [];
  courses: Course[] = [];

  constructor(
    private fb: FormBuilder,
  ) {
    this.emailForm = this.fb.group({
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.loadFakeCoursesAndNotes();
  }

  loadFakeCoursesAndNotes(): void {
    // Données de cours avec notes des étudiants
    this.courses = [
      {
        name: 'Mathématiques',
        instructor: 'Mme Dupont',
        instructorEmail: 'dupont@example.com',
        image: 'https://via.placeholder.com/150',
        courseContent: {
          title: 'Introduction aux mathématiques',
          chapters: ['Algèbre', 'Analyse', 'Géométrie'],
          resources: ['Chapitre1.pdf', 'Exercices.docx']
        },
        notes: [
          { student: 'John Doe', courseName: 'Mathématiques', tp: 12, exam: 15, absences: 2 },
          { student: 'Sirine Mimouni', courseName: 'Mathématiques', tp: 14, exam: 13, absences: 1 },
          { student: 'Jean Dupont', courseName: 'Mathématiques', tp: 10, exam: 14, absences: 0 },
        ]
      },
      {
        name: 'Physique',
        instructor: 'M. Martin',
        instructorEmail: 'martin@example.com',
        image: 'https://via.placeholder.com/150',
        courseContent: {
          title: 'Bases de la physique',
          chapters: ['Mécanique', 'Thermodynamique', 'Optique'],
          resources: ['Physique_Chap1.pdf', 'TP_Physique.docx']
        },
        notes: [
          { student: 'John Doe', courseName: 'Physique', tp: 11, exam: 16, absences: 1 },
          { student: 'Sirine Mimouni', courseName: 'Physique', tp: 13, exam: 15, absences: 3 },
          { student: 'Jean Dupont', courseName: 'Physique', tp: 12, exam: 14, absences: 0 },
        ]
      }
    ];

    // Liste à plat des notes pour traitement
    this.allNotes = this.courses.flatMap(course => course.notes);
    this.injectNotesIntoCourses();
  }

  injectNotesIntoCourses(): void {
    this.courses.forEach(course => {
      course.notes = this.allNotes.filter(note =>
        note.courseName?.toLowerCase() === course.name.toLowerCase()
      );
    });
  }

  showContent(course: Course, type: 'course' | 'notes' | 'contact'): void {
    this.selectedCourse = course;
    this.activeSection = { id: this.getSectionId(course.name, type), type };

    setTimeout(() => {
      const element = document.getElementById(this.activeSection?.id ?? '');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  getSectionId(courseName: string, type: 'course' | 'notes' | 'contact'): string {
    const baseId = courseName.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprime accents
      .replace(/\s+/g, '-');
    return type === 'course' ? baseId : `${type}-${baseId}`;
  }

  isActive(course: Course, type: 'course' | 'notes' | 'contact'): boolean {
    return this.activeSection?.id === this.getSectionId(course.name, type) &&
           this.selectedCourse?.name === course.name;
  }

  getStudentNotes(notes: Note[]): Note | null {
    if (!notes) return null;
    return notes.find(note => note.student === this.currentStudent) ?? null;
  }

  hasCriticalAbsences(notes: Note[]): boolean {
    const note = this.getStudentNotes(notes);
    return note ? note.absences > 3 : false;
  }

  sendEmail(): void {
    if (this.emailForm.valid && this.selectedCourse) {
      // Simule envoi d'email réussi
      this.emailSent = true;
      this.emailError = false;
      this.emailForm.reset();

      setTimeout(() => this.emailSent = false, 5000);
    } else {
      this.emailError = true;
    }
  }

  logout(): void {
    console.log('Déconnexion de l\'étudiant', this.currentStudent);
    alert(`Au revoir ${this.currentStudent}, vous êtes maintenant déconnecté`);
    // TODO : redirection vers la page de login
  }
}
