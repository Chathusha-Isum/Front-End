import { Component } from '@angular/core';
import { Carlist } from '../../component/carlist/carlist';

@Component({
  selector: 'app-item',
  standalone: true,
  imports: [Carlist],
  templateUrl: './cars.html',
  styleUrls: ['./cars.css']
})
export class Cars {}