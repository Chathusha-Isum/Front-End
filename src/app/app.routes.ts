import { Routes } from '@angular/router';

import { CarDetails } from './pages/car-details/car-details';
import { Aboutus } from './pages/aboutus/aboutus';
import { Contact } from './pages/contact/contact';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Cars } from './pages/cars/cars';
import { Parts } from './pages/parts/parts';
import { Buyer } from './pages/buyer/buyer';
import { Admin } from './pages/admin/admin';
import { EditProfile } from './pages/edit-profile/edit-profile';
import { PartDetails } from './pages/part-details/part-details';
import { Cart } from './pages/cart/cart';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { ManageCars } from './pages/manage-cars/manage-cars';
import { ManageParts } from './pages/manage-parts/manage-parts';

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
        path: "contact",
        component: Contact
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
        path: "admin-dashboard",
        component: Admin
    },
    {
        path: "edit-profile",
        component: EditProfile
    },
    {
        path: "cart",
        component: Cart
    },
    {
        path: "forgotpassword",
        component: ForgotPassword
    },
    {
        path: "manage-products",
        component: ManageCars
    },
    {
        path: "manage-parts",
        component: ManageParts
    },
    
];
