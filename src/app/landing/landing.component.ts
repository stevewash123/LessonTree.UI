import { Component, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../shared/services/auth.service';
import { LoadingService, LoadingState } from '../shared/services/loading.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
    selector: 'landing-page',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule,
        MatProgressBarModule,
        MatIconModule
    ],
    templateUrl: './landing.component.html',
    styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
    loginForm: FormGroup;
    isLoading = false;
    errorMessage: string | null = null;
    loadingState: LoadingState = {
        isLoading: false,
        message: '',
        showTimeout: false,
        timeoutMessage: ''
    };
    isReseedingDemo = false;
    guestCredentials = {
        username: 'guest',
        password: 'Guest123!'
    };

    private loadingSubscription?: Subscription;

    constructor(
      private fb: FormBuilder,
      private authService: AuthService,
      private loadingService: LoadingService,
      private router: Router,
      private http: HttpClient
    ) {
      this.loginForm = this.fb.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
      });
    }

  ngOnInit(): void {
    this.loadingSubscription = this.loadingService.loadingState$.subscribe(
      state => this.loadingState = state
    );
  }

  ngOnDestroy(): void {
    if (this.loadingSubscription) {
      this.loadingSubscription.unsubscribe();
    }
  }

  get isLoginDisabled(): boolean {
    return this.loginForm.invalid || this.isLoading || this.loadingState.isLoading || this.isReseedingDemo;
  }

  onSubmit() {
    if (this.loginForm.valid && !this.isLoginDisabled) {
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

  onReseedDemo() {
    if (this.isReseedingDemo) return;

    this.isReseedingDemo = true;
    this.errorMessage = null;

    const reseedUrl = `${environment.apiUrl}/api/admin/reset-demo-data`;
    this.http.post(reseedUrl, {}).subscribe({
      next: (response: any) => {
        console.log('Demo data reset successful:', response);
        this.isReseedingDemo = false;
        // Optionally show success message
      },
      error: (error) => {
        console.error('Demo data reset failed:', error);
        this.isReseedingDemo = false;
        this.errorMessage = 'Failed to reset demo data. Please try again.';
      }
    });
  }

  fillGuestCredentials() {
    this.loginForm.patchValue({
      username: this.guestCredentials.username,
      password: this.guestCredentials.password
    });
  }
}