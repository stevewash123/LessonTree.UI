import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './shared/services/auth.service';
import { LoadingService, LoadingState } from './shared/services/loading.service';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-root',
    imports: [
        MatSidenavModule,
        MatToolbarModule,
        MatListModule,
        MatButtonModule,
        RouterOutlet,
        LoadingComponent
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
    loadingState: LoadingState = {
        isLoading: false,
        message: '',
        showTimeout: false,
        timeoutMessage: ''
    };

    private loadingSubscription?: Subscription;

    constructor(
        public authService: AuthService,
        private loadingService: LoadingService
    ) { }

    ngOnInit(): void {
        this.loadingSubscription = this.loadingService.loadingState$.subscribe(
            state => this.loadingState = state
        );

        this.loadingService.initializeApp().subscribe({
            next: () => {
                console.log('App initialization completed successfully');
            },
            error: (error) => {
                console.error('App initialization failed', error);
            }
        });
    }

    ngOnDestroy(): void {
        if (this.loadingSubscription) {
            this.loadingSubscription.unsubscribe();
        }
    }

    onRetry(): void {
        this.loadingService.retryInitialization().subscribe({
            next: () => {
                console.log('App retry initialization completed successfully');
            },
            error: (error) => {
                console.error('App retry initialization failed', error);
            }
        });
    }

    logout() {
        this.authService.logout();
    }
}