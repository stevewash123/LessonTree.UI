import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../shared/services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'landing-page',
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule
    ],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
    loginForm: FormGroup;
    isLoading = false;
    errorMessage: string | null = null;
  
    constructor(
      private fb: FormBuilder,
      private authService: AuthService,
      private router: Router
    ) {
      this.loginForm = this.fb.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
      });
    }

  ngOnInit(): void { }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const { username, password } = this.loginForm.value;
      this.authService.login(username, password).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('[LandingComponent] Login error:', error);
          
          // Handle different types of errors
          if (error.status === 401) {
            this.errorMessage = 'Invalid username or password';
          } else if (error.status === 0 || error.status >= 500) {
            this.errorMessage = 'Unable to connect to server. Please try again later.';
          } else if (error.status === 400) {
            this.errorMessage = error.error?.message || 'Invalid request. Please check your input.';
          } else {
            this.errorMessage = 'Login failed. Please try again.';
          }
        }
      });
    }
  }
}