import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-config',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './user-config.component.html',
  styleUrls: ['./user-config.component.scss']
})
export class UserConfigComponent {
  constructor(private router: Router) { }

  save() {
    // Placeholder for save logic
    this.router.navigate(['/home/courses']);
  }

  cancel() {
    this.router.navigate(['/home/courses']);
  }
}