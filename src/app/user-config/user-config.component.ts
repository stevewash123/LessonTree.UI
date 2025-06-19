// **COMPLETE FILE** - user-config.component.ts Phase 2
// RESPONSIBILITY: Simple modal for user profile management only
// DOES NOT: Handle schedule, periods, or teaching configuration  
// CALLED BY: Header/profile components via MatDialog service

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from './user.service';

@Component({
  selector: 'app-user-config',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './user-config.component.html',
  styleUrls: ['./user-config.component.css']
})
export class UserConfigComponent implements OnInit {
  profileForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserConfigComponent>,
    private snackBar: MatSnackBar,
    private userService: UserService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['']
    });
  }

  ngOnInit(): void {
    console.log('[UserConfig] Simple profile component initializing');
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    const currentUser = this.userService.getCurrentUser();
    
    this.profileForm.patchValue({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      phoneNumber: currentUser?.phone || ''
    });
    console.log('[UserConfig] User profile data loaded');
  }

  saveUserProfile(): void {
    this.profileForm.markAllAsTouched();

    if (!this.profileForm.valid) {
      this.snackBar.open('Please correct highlighted errors', 'Close', { duration: 5000 });
      return;
    }

    const profileUpdate = {
      firstName: this.profileForm.get('firstName')?.value || '',
      lastName: this.profileForm.get('lastName')?.value || '',
      email: this.profileForm.get('email')?.value || '',
      phone: this.profileForm.get('phoneNumber')?.value || ''
    };

    this.userService.updateUserProfile(profileUpdate).subscribe({
      next: (updatedUser) => {
        this.snackBar.open('Profile saved successfully', 'Close', { duration: 3000 });
        this.dialogRef.close({ saved: true, profile: updatedUser });
      },
      error: (error) => {
        console.error('[UserConfig] Profile save failed:', error);
        this.snackBar.open('Failed to save profile. Please try again.', 'Close', { duration: 5000 });
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}