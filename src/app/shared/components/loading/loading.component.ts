import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-loading',
    standalone: true,
    imports: [CommonModule, MatProgressSpinnerModule],
    templateUrl: './loading.component.html',
    styleUrls: ['./loading.component.scss']
})
export class LoadingComponent {
    @Input() message: string = 'Loading demo environment... Thank you for your patience.';
    @Input() show: boolean = false;
    @Input() showTimeout: boolean = false;
    @Input() timeoutMessage: string = 'The demo environment is taking longer than expected. Please check your connection and try again.';
    @Output() retry = new EventEmitter<void>();

    onRetry(): void {
        this.retry.emit();
    }
}