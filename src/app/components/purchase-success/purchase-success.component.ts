import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-purchase-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './purchase-success.component.html',
  styleUrl: './purchase-success.component.css'

  })
export class PurchaseSuccessComponent { }
