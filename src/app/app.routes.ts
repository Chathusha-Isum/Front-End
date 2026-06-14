import { Routes } from '@angular/router';

import {Upload} from './pages/upload/upload';
import { Aboutus } from './pages/aboutus/aboutus';
import { Home } from './pages/home/home';

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
        path: "aboutus",
        component: Aboutus
    },
    
];
