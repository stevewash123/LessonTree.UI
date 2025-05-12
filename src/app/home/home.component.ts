import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
    selector: 'app-home',
    imports: [
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        RouterOutlet,
        RouterLink
    ],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements AfterViewInit {
    @ViewChild('toolbar') toolbar!: ElementRef;
    toolbarHeight: number | undefined;
  
    constructor(public authService: AuthService) { }
  
    ngAfterViewInit() {
        if(this.toolbar && this.toolbar.nativeElement){
            this.toolbarHeight = this.toolbar.nativeElement.offsetHeight;
        }
    }
  
    logout() {
      this.authService.logout();
    }
  }