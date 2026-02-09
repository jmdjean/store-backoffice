import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  private theme = inject(ThemeService);
  sidebarOpen = signal(false);
  currentYear = new Date().getFullYear();

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  toggleTheme() {
    this.theme.toggle();
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}
