import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../core/services/api.service';

@Component({
    selector: 'app-lesson-management',
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatListModule
    ],
    templateUrl: './lesson-management.component.html',
    styleUrls: ['./lesson-management.component.scss']
})
export class LessonManagementComponent implements OnInit {
  lessonForm: FormGroup;
  lessons: any[] = [];

  constructor(private fb: FormBuilder, private apiService: ApiService) {
    this.lessonForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required],
      subTopicId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadLessons();
  }

  loadLessons() {
    this.apiService.get<any[]>('lesson').subscribe(lessons => this.lessons = lessons);
  }

  addLesson() {
    if (this.lessonForm.valid) {
      this.apiService.post('lesson', this.lessonForm.value).subscribe(() => {
        this.loadLessons();
        this.lessonForm.reset();
      });
    }
  }

  deleteLesson(id: number) {
    this.apiService.delete(`lesson/${id}`).subscribe(() => this.loadLessons());
  }
}