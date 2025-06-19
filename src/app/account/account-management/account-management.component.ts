import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../shared/services/api.service';

@Component({
    selector: 'app-account-management',
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatListModule
    ],
    templateUrl: './account-management.component.html',
    styleUrls: ['./account-management.component.css']
})
export class AccountManagementComponent implements OnInit {
  userForm: FormGroup;
  users: any[] = [];

  constructor(private fb: FormBuilder, private apiService: ApiService) {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.apiService.get<any[]>('user').subscribe(users => this.users = users);
  }

  addUser() {
    if (this.userForm.valid) {
        this.apiService.createUser(this.userForm.value).subscribe({
            next: () => {
                this.loadUsers();
                this.userForm.reset();
                console.log('[AccountManagement] User added', { username: this.userForm.value.username, timestamp: new Date().toISOString() });
            },
            error: (error) => console.error('[AccountManagement] Error adding user', { error, timestamp: new Date().toISOString() })
        });
    }
  }

  deleteUser(id: number) {
    this.apiService.delete(`user/${id}`).subscribe(() => this.loadUsers());
  }
}