import { ComponentFixture, TestBed } from '@angular/shared/testing';

import { TopicPanelComponent } from './topic-panel.component';

describe('TopicPanelComponent', () => {
  let component: TopicPanelComponent;
  let fixture: ComponentFixture<TopicPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopicPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopicPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
