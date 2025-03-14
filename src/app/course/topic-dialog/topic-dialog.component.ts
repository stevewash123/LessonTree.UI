import { Component, Inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { Topic } from '../../models/topic';

@Component({
  selector: 'app-topic-dialog',
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
  templateUrl: './topic-dialog.component.html',
  styleUrls: ['./topic-dialog.component.scss']
})
export class TopicDialogComponent {
  topicForm: FormGroup;
  subTopics = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['title', 'actions'];
  isEditingSubTopic: number | null = null;
  subTopicEditControl = new FormControl('', Validators.required);

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TopicDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Topic,
    private toastr: ToastrService
  ) {
    this.topicForm = this.fb.group({
      id: [{ value: this.data?.id || 0, disabled: true }],
      title: [this.data?.title || '', Validators.required]
    });
    if (this.data?.subTopics) {
      this.subTopics.data = this.data.subTopics;
    }
  }

  onSubmit() {
    if (this.topicForm.valid) {
      const result = {
        id: this.data?.id || 0,
        title: this.topicForm.get('title')?.value,
        subTopics: this.subTopics.data
      };
      console.log('Submitting Topic:', result);
      this.dialogRef.close(result);
      const action = this.data?.id ? 'edited' : 'added';
      this.toastr.success(`Topic successfully ${action}`, 'Success', { timeOut: 3000 });
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