import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { JwtModule } from '@auth0/angular-jwt';
import { ToastrModule } from 'ngx-toastr';
import { MatDialogModule } from '@angular/material/dialog';
import { authInterceptor } from './app/shared/interceptors/auth.interceptor';
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { registerLicense } from '@syncfusion/ej2-base';
import { environment } from './environments/environment'; // Added

export function tokenGetter() {
  return localStorage.getItem('token');
}

// Register Syncfusion license key from environment
registerLicense(environment.syncfusionLicenseKey);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(JwtModule.forRoot({
      config: {
        tokenGetter,
        allowedDomains: ['localhost:7238'],
        disallowedRoutes: []
      }
    })),
    importProvidersFrom(ToastrModule.forRoot({
      timeOut: 5000,
      positionClass: 'toast-top-right',
      preventDuplicates: true
    })),
    importProvidersFrom(MatDialogModule),
    importProvidersFrom(TreeViewModule)
  ]
}).catch(err => console.error(err));