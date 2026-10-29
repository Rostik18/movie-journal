import { Route, Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { Type } from '@angular/core';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { MovieListComponent } from './components/movie-list/movie-list.component';
import { ActorListComponent } from './components/actors/actor-list.component';
import { CollectionListComponent } from './components/collection-list/collection-list.component';
import { UserWatchingListComponent } from './components/user-watching/user-watching-list.component';
import { SeedDataFormComponent } from './components/seed-data-form/seed-data-form.component';
import { UserListComponent } from './components/user-list/user-list.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { adminGuard, authGuard, guestGuard } from './guards/auth.guard';

/**
 * Маршрут `path` та `path/:id` з ОДНИМ записом конфігурації: Angular перевикористовує компонент
 * при переході між ними (список не перезавантажується, сайдбар просто відкривається/закривається).
 */
const withOptionalId = (path: string, component: Type<unknown>): Route => ({
    matcher: (segments: UrlSegment[]): UrlMatchResult | null => {
        if (segments.length === 0 || segments.length > 2 || segments[0].path !== path) {
            return null;
        }
        return segments.length === 2
            ? { consumed: segments, posParams: { id: segments[1] } }
            : { consumed: segments };
    },
    component
});

export const routes: Routes = [
    { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
    {
        path: '',
        component: MainLayoutComponent,
        // Захищає весь layout і всі дочірні маршрути (також прямі посилання /movies/:id тощо)
        canActivate: [authGuard],
        children: [
            withOptionalId('watchlist', UserWatchingListComponent),
            withOptionalId('movies', MovieListComponent),
            withOptionalId('actors', ActorListComponent),
            withOptionalId('collections', CollectionListComponent),
            { path: 'users', component: UserListComponent },
            { path: 'profile', component: UserProfileComponent },
            { path: 'seed-data', component: SeedDataFormComponent, canActivate: [adminGuard] },
            { path: 'statistics', component: StatisticsComponent, canActivate: [adminGuard] },
            { path: '', redirectTo: 'watchlist', pathMatch: 'full' }
        ]
    },
    // Невідомий URL: guard вирішить, куди далі (авторизованим — на головну, іншим — на логін)
    { path: '**', redirectTo: '' }
];