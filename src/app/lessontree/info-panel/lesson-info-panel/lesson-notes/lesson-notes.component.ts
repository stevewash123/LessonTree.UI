// Full File: src/app/lessontree/info-panel/lesson-info-panel/lesson-notes/lesson-notes.component.ts
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Note } from '../../../../models/note'; 
import { ApiService } from '../../../../core/services/api.service'; 

@Component({
  selector: 'lesson-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './lesson-notes.component.html',
  styleUrls: ['./lesson-notes.component.css']
})
export class LessonNotesComponent {
  @Input() notes: Note[] = [];
  @Input() lessonId: number = 0;
  @Input() isEditing: boolean = false;
  @Output() notesChanged = new EventEmitter<Note[]>();
  @ViewChild('newNoteTextarea') newNoteTextarea!: ElementRef<HTMLTextAreaElement>;

  newNote: Note = this.createEmptyNote();

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.resetNewNote();
    this.sortNotes();
  }

  ngAfterViewInit(): void {
    this.focusNewNoteTextarea();
  }

  private createEmptyNote(): Note {
    return {
      id: 0,
      content: '',
      author: '',
      visibility: 'Private',
      createdDate: new Date().toISOString(),
      lessonId: this.lessonId
    };
  }

  private resetNewNote(): void {
    this.newNote = this.createEmptyNote();
    console.log(`[LessonNotes] Reset new note, lessonId: ${this.lessonId}, timestamp: ${new Date().toISOString()}`);
  }

  private focusNewNoteTextarea(): void {
    setTimeout(() => {
      if (this.newNoteTextarea) {
        this.newNoteTextarea.nativeElement.focus();
        console.log(`[LessonNotes] Focused new note textarea, lessonId: ${this.lessonId}, timestamp: ${new Date().toISOString()}`);
      }
    }, 0);
  }

  private sortNotes(): void {
    if (this.notes) {
      this.notes.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
      console.log(`[LessonNotes] Sorted notes, count: ${this.notes.length}, lessonId: ${this.lessonId}, timestamp: ${new Date().toISOString()}`);
    }
  }

  saveNote(note: Note): void {
    if (!this.lessonId) {
      console.error(`[LessonNotes] Cannot save note: lessonId is missing, timestamp: ${new Date().toISOString()}`);
      return;
    }

    if (note.id === 0) {
      const noteToCreate: Partial<Note> = {
        content: note.content,
        visibility: note.visibility || 'Private',
        lessonId: this.lessonId
      };
      this.apiService.createNote(noteToCreate).subscribe({
        next: (createdNote: Note) => {
          this.notes = this.notes || [];
          this.notes.push(createdNote);
          this.sortNotes();
          this.notesChanged.emit([...this.notes]);
          this.resetNewNote();
          this.focusNewNoteTextarea();
          console.log(`[LessonNotes] Created note, id: ${createdNote.id}, content: "${createdNote.content}", lessonId: ${this.lessonId}, timestamp: ${new Date().toISOString()}`);
        },
        error: (error: unknown) => {
          console.error(`[LessonNotes] Error creating note, lessonId: ${this.lessonId}, error:`, error, `timestamp: ${new Date().toISOString()}`);
        }
      });
    }
  }

  deleteNote(note: Note): void {
    if (!this.lessonId) {
      console.error(`[LessonNotes] Cannot delete note: lessonId is missing, timestamp: ${new Date().toISOString()}`);
      return;
    }

    if (note.id === 0) {
      this.notes = this.notes.filter(n => n !== note);
      this.notesChanged.emit([...this.notes]);
      console.log(`[LessonNotes] Deleted unsaved note, content: "${note.content}", lessonId: ${this.lessonId}, timestamp: ${new Date().toISOString()}`);
    } else {
      this.apiService.deleteNote(note.id).subscribe({
        next: () => {
          this.notes = this.notes.filter(n => n.id !== note.id);
          this.notesChanged.emit([...this.notes]);
          console.log(`[LessonNotes] Deleted note, id: ${note.id}, content: "${note.content}", lessonId: ${this.lessonId}, timestamp: ${new Date().toISOString()}`);
        },
        error: (error: unknown) => {
          console.error(`[LessonNotes] Error deleting note, id: ${note.id}, lessonId: ${this.lessonId}, error:`, error, `timestamp: ${new Date().toISOString()}`);
        }
      });
    }
  }

  clearNewNote(): void {
    this.resetNewNote();
    this.focusNewNoteTextarea();
    console.log(`[LessonNotes] Cleared new note, lessonId: ${this.lessonId}, timestamp: ${new Date().toISOString()}`);
  }
}