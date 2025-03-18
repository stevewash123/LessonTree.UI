import { Component, Input } from '@angular/core';
import { Standard } from '../../../../models/standard';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'standard-table',
  imports: [CommonModule],
  templateUrl: './standard-table.component.html',
  styleUrl: './standard-table.component.css'
})
export class StandardTableComponent {
    @Input() standards: Standard[] = [];
}
