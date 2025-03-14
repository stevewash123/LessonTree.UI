import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonDocumentTableComponent } from './lesson-document-table.component';

describe('LessonDocumentTableComponent', () => {
  let component: LessonDocumentTableComponent;
  let fixture: ComponentFixture<LessonDocumentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonDocumentTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonDocumentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
