import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MainLayoutComponent } from './components/layout/main-layout.component';
import { MovieListComponent } from './components/movie-list/movie-list.component';
import { ActorListComponent } from './components/actors/actor-list.component';
import { CollectionListComponent } from './components/collection-list/collection-list.component';
import { UserWatchingListComponent } from './components/user-watching/user-watching-list.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            { path: 'watchlist', component: UserWatchingListComponent },
            { path: 'movies', component: MovieListComponent },
            { path: 'actors', component: ActorListComponent },
            { path: 'collections', component: CollectionListComponent },
            { path: '', redirectTo: 'watchlist', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: 'login' }
];