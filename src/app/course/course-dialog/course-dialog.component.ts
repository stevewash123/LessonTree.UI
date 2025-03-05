import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr'; // Added for Toastr

@Component({
  selector: 'app-course-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatTableModule,
    MatIconModule
  ],
  templateUrl: './course-dialog.component.html',
  styleUrls: ['./course-dialog.component.scss']
})
export class CourseDialogComponent {
  courseForm: FormGroup;
  dialogTitle: string;
  subTopics = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['title', 'actions'];
  isEditingSubTopic: number | null = null;
  subTopicEditControl = new FormControl('', Validators.required);

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CourseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private toastr: ToastrService // Added
  ) {
    this.dialogTitle = data?.id && !data.action ? 'Edit Course' : 'Add Course';
    this.dialogTitle = data?.action === 'Add Topic' ? 'Add Topic' : this.dialogTitle;
    this.courseForm = this.fb.group({
      id: [{ value: data?.id || 0, disabled: true }], // Still in form, not displayed
      title: [data?.title || '', Validators.required],
      description: [data?.description || '', Validators.required]
    });
  }

  onSubmit() {
    if (this.courseForm.valid) {
      const result = {
        id: this.data?.id || 0,
        title: this.courseForm.get('title')?.value,
        description: this.courseForm.get('description')?.value,
        ...(this.dialogTitle === 'Add Topic' ? { subTopics: this.subTopics.data } : {})
      };
      console.log('Submitting Course:', result); // Debug log
      this.dialogRef.close(result);
      // Add Toastr notification
      const action = this.data?.id ? 'edited' : 'added';
      const entity = this.dialogTitle.includes('Course') ? 'Course' : 'Topic';
      this.toastr.success(`${entity} successfully ${action}`, 'Success', { timeOut: 3000 });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  addSubTopic() {
    const newSubTopic = { title: 'New SubTopic' };
    this.subTopics.data = [...this.subTopics.data, newSubTopic];
  }

  editSubTopic(subTopic: any, index: number) {
    this.isEditingSubTopic = index;
    this.subTopicEditControl.setValue(subTopic.title);
  }

  saveSubTopic(index: number) {
    if (this.subTopicEditControl.valid) {
      this.subTopics.data[index].title = this.subTopicEditControl.value;
      this.subTopics.data = [...this.subTopics.data];
      this.isEditingSubTopic = null;
    }
  }

  deleteSubTopic(index: number) {
    this.subTopics.data.splice(index, 1);
    this.subTopics.data = [...this.subTopics.data];
  }
}