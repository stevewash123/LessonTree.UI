import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LessonInfoPanelComponent } from './lesson-info-panel.component';

describe('LessonInfoPanelComponent', () => {
  let component: LessonInfoPanelComponent;
  let fixture: ComponentFixture<LessonInfoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LessonInfoPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LessonInfoPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
