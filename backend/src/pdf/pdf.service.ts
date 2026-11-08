import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

/**
 * PDF service: renders HTML report in headless Chrome (Puppeteer) and exports to PDF.
 * PDF content matches the HTML report (styles, progress bars, tables).
 */
@Injectable()
export class PdfService {
  async htmlToPdf(html: string): Promise<string> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });

      return Buffer.from(pdfBuffer).toString('base64');
    } finally {
      await browser.close();
    }
  }
}