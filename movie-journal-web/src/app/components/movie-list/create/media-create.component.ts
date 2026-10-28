import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MediaFormComponent } from '../../shared/media-form/media-form.component';

@Component({
  selector: 'app-media-create',
  standalone: true,
  imports: [MediaFormComponent],
  template: `
    <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
      <app-media-form (mediaCreated)="onCreated()"></app-media-form>
    </div>
  `
})
export class MediaCreateComponent {
  private router = inject(Router);

  onCreated() {
    this.router.navigate(['/movies']);
  }
}