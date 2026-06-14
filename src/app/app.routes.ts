import { Routes } from '@angular/router';

import {Upload} from './pages/upload/upload';
import { Aboutus } from './pages/aboutus/aboutus';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

export const routes: Routes = [
    {
        path: "",
        component:Home
    },
    {
        path: "upload",
        component: Upload
    },
    {
        path: "about-us",
        component: Aboutus
    },
    {
        path: "login",
        component: Login
    },
    {
        path: "register",
        component: Register
    },
    
];
