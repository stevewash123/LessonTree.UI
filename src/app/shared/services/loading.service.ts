import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer, throwError, of } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, timeout, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface LoadingState {
    isLoading: boolean;
    message: string;
    showTimeout: boolean;
    timeoutMessage: string;
}

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private loadingStateSubject = new BehaviorSubject<LoadingState>({
        isLoading: false,
        message: 'Loading demo environment... Thank you for your patience.',
        showTimeout: false,
        timeoutMessage: 'The demo environment is taking longer than expected. Please check your connection and try again.'
    });

    public loadingState$ = this.loadingStateSubject.asObservable();

    constructor(private http: HttpClient) {}

    private updateState(updates: Partial<LoadingState>): void {
        const currentState = this.loadingStateSubject.value;
        this.loadingStateSubject.next({ ...currentState, ...updates });
    }

    startLoading(message?: string): void {
        this.updateState({
            isLoading: true,
            message: message || 'Loading demo environment... Thank you for your patience.',
            showTimeout: false
        });
    }

    stopLoading(): void {
        this.updateState({
            isLoading: false,
            showTimeout: false
        });
    }

    showTimeout(): void {
        this.updateState({
            showTimeout: true
        });
    }

    checkApiHealth(): Observable<any> {
        const healthUrl = `${environment.apiUrl}/api/admin/health`;
        console.log('LoadingService: Checking API health at', healthUrl);

        return this.http.get(healthUrl).pipe(
            timeout(60000), // 60 second timeout
            tap(response => {
                console.log('LoadingService: API health check successful', response);
            }),
            switchMap(() => this.checkAndReseedIfNeeded()),
            catchError((error: HttpErrorResponse) => {
                console.error('LoadingService: API health check failed', error);
                return throwError(() => error);
            })
        );
    }

    private checkAndReseedIfNeeded(): Observable<any> {
        const configUrl = `${environment.apiUrl}/api/admin/config`;
        console.log('LoadingService: Checking last seed date');

        return this.http.get<any>(configUrl).pipe(
            switchMap(config => {
                const lastSeeded = config.lastSeededDate;
                if (!lastSeeded) {
                    console.log('LoadingService: No last seeded date found, triggering reseed');
                    return this.reseedDatabase();
                }

                const lastSeededDate = new Date(lastSeeded);
                const now = new Date();
                const hoursDiff = (now.getTime() - lastSeededDate.getTime()) / (1000 * 60 * 60);

                if (hoursDiff > 24) {
                    console.log(`LoadingService: Last seeded ${hoursDiff.toFixed(1)} hours ago, triggering reseed`);
                    return this.reseedDatabase();
                } else {
                    console.log(`LoadingService: Last seeded ${hoursDiff.toFixed(1)} hours ago, no reseed needed`);
                    return of({ status: 'no-reseed-needed' });
                }
            }),
            catchError((error: HttpErrorResponse) => {
                console.warn('LoadingService: Could not check last seed date, proceeding without reseed', error);
                return of({ status: 'check-failed' });
            })
        );
    }

    private reseedDatabase(): Observable<any> {
        this.updateState({
            message: 'Initializing demo environment with fresh data... This may take a moment.'
        });

        const reseedUrl = `${environment.apiUrl}/api/admin/reset-and-reseed`;
        console.log('LoadingService: Triggering database reseed');

        return this.http.post(reseedUrl, {}).pipe(
            timeout(180000), // 3 minute timeout for reseed
            tap(response => {
                console.log('LoadingService: Database reseed successful', response);
            }),
            catchError((error: HttpErrorResponse) => {
                console.error('LoadingService: Database reseed failed', error);
                return throwError(() => error);
            })
        );
    }

    initializeApp(): Observable<any> {
        this.startLoading('Connecting to LessonTree API...');

        return this.checkApiHealth().pipe(
            timeout(60000),
            tap(response => {
                console.log('LoadingService: App initialization successful');
                this.stopLoading();
            }),
            catchError((error: any) => {
                console.error('LoadingService: App initialization failed', error);

                if (error.name === 'TimeoutError') {
                    this.showTimeout();
                } else {
                    this.updateState({
                        message: 'Failed to connect to LessonTree API',
                        showTimeout: true,
                        timeoutMessage: 'Unable to connect to the server. Please check your internet connection and try again.'
                    });
                }

                return throwError(() => error);
            })
        );
    }

    retryInitialization(): Observable<any> {
        console.log('LoadingService: Retrying app initialization');
        this.updateState({
            showTimeout: false,
            message: 'Retrying connection to LessonTree API...'
        });

        return this.initializeApp();
    }
}