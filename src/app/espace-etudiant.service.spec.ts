import { TestBed } from '@angular/core/testing';

import { EspaceEtudiantService } from './espace-etudiant.service';

describe('EspaceEtudiantService', () => {
  let service: EspaceEtudiantService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EspaceEtudiantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
