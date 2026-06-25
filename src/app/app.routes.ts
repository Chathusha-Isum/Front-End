import { Routes } from '@angular/router';

import { CarDetails } from './pages/car-details/car-details';
import { Aboutus } from './pages/aboutus/aboutus';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Cars } from './pages/cars/cars';
import { Parts } from './pages/parts/parts';
import { Buyer } from './pages/buyer/buyer';
import { EditProfile } from './pages/edit-profile/edit-profile';
import { Addproduct } from './pages/addproduct/addproduct';
import { Addpart } from './pages/addpart/addpart';
import { PartDetails } from './pages/part-details/part-details';
import { Cart } from './pages/cart/cart';

export const routes: Routes = [
    {
        path: "",
        component:Home
    },
    {
        path: "car-details",
        component: CarDetails
    },
    {
        path: "part-details",
        component: PartDetails
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
    {
        path: "cars",
        component: Cars
    },
    {
        path: "parts",
        component: Parts
    },
    {
        path: "buyer-dashboard",
        component: Buyer
    },
    {
        path: "edit-profile",
        component: EditProfile
    },
    {
        path: "add-product",
        component: Addproduct
    },
    {
        path: "add-part",
        component: Addpart
    },
    {
        path: "cart",
        component: Cart
    },
    
];
