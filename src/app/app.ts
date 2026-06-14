import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {Navbar} from './component/navbar/navbar';
import { Hero } from './component/hero/hero';
import { Footer } from './component/footer/footer';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, Hero],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('testing');
}
