import { ComponentFixture, TestBed } from '@angular/shared/testing';

import { SubtopicPanelComponent } from './subtopic-panel.component';

describe('SubtopicPanelComponent', () => {
  let component: SubtopicPanelComponent;
  let fixture: ComponentFixture<SubtopicPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubtopicPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubtopicPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
