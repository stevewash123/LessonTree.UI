import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonAttachmentTableComponent } from './lesson-attachment-table.component';

describe('LessonAttachmentTableComponent', () => {
  let component: LessonAttachmentTableComponent;
  let fixture: ComponentFixture<LessonAttachmentTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonAttachmentTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonAttachmentTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
