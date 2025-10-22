import { Injectable } from '@angular/core';
import * as jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  // ... gardez la méthode printElement existante ...

  async exportToPdf(elementId: string, filename: string = 'planning'): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: true,
        useCORS: true
      });

      const pdf = new jsPDF.jsPDF('landscape', 'mm', 'a3');
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}