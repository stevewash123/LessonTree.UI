import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonTreeContainerComponent } from './lesson-tree-container.component';

describe('LessonTreeContainerComponent', () => {
  let component: LessonTreeContainerComponent;
  let fixture: ComponentFixture<LessonTreeContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonTreeContainerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonTreeContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
