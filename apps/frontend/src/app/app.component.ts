import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LayoutComponent],
  template: `
    @if (showLayout()) {
      <app-layout>
        <router-outlet />
      </app-layout>
    } @else {
      <router-outlet />
    }
  `,
  styles: [],
})
export class AppComponent {
  private router = inject(Router);

  showLayout() {
    const url = this.router.url;
    return !url.includes('/login') && !url.includes('/register');
  }
}
