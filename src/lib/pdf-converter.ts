import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFSettings {
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  quality: 'low' | 'medium' | 'high';
  layout: 'one-per-page' | 'multiple-per-page';
}

export interface ImageData {
  id: string;
  file: File;
  preview: string;
  name: string;
  dimensions: { width: number; height: number };
}

export class PDFConverter {
  private settings: PDFSettings;

  constructor(settings: PDFSettings) {
    this.settings = settings;
  }

  /**
   * Convert images to PDF
   */
  async convertToPDF(images: ImageData[]): Promise<Blob> {
    if (images.length === 0) {
      throw new Error('No images provided for conversion');
    }

    // Create PDF document
    const pdf = this.createPDFDocument();
    
    if (this.settings.layout === 'one-per-page') {
      await this.convertOnePerPage(pdf, images);
    } else {
      await this.convertMultiplePerPage(pdf, images);
    }

    // Generate PDF blob
    return pdf.output('blob');
  }

  /**
   * Create PDF document with proper settings
   */
  private createPDFDocument(): jsPDF {
    const pageSize = this.getPageDimensions();
    
    return new jsPDF({
      orientation: this.settings.orientation,
      unit: 'mm',
      format: this.settings.pageSize,
      compress: true
    });
  }

  /**
   * Get page dimensions based on settings
   */
  private getPageDimensions(): { width: number; height: number } {
    switch (this.settings.pageSize) {
      case 'A4':
        return this.settings.orientation === 'portrait' 
          ? { width: 210, height: 297 }
          : { width: 297, height: 210 };
      case 'Letter':
        return this.settings.orientation === 'portrait'
          ? { width: 215.9, height: 279.4 }
          : { width: 279.4, height: 215.9 };
      case 'Legal':
        return this.settings.orientation === 'portrait'
          ? { width: 215.9, height: 355.6 }
          : { width: 355.6, height: 215.9 };
      default:
        return { width: 210, height: 297 }; // Default to A4
    }
  }

  /**
   * Convert images with one image per page
   */
  private async convertOnePerPage(pdf: jsPDF, images: ImageData[]): Promise<void> {
    const pageDimensions = this.getPageDimensions();
    const margin = 20; // 20mm margin on all sides
    const maxWidth = pageDimensions.width - (margin * 2);
    const maxHeight = pageDimensions.height - (margin * 2);

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        // Convert image to canvas
        const canvas = await this.imageToCanvas(image.preview);
        
        // Calculate image dimensions to fit on page
        const { width, height } = this.calculateImageDimensions(
          canvas.width,
          canvas.height,
          maxWidth,
          maxHeight
        );

        // Add new page for each image (except first)
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate position to center image on page
        const x = margin + (maxWidth - width) / 2;
        const y = margin + (maxHeight - height) / 2;

        // Add image to PDF
        const imgData = canvas.toDataURL('image/jpeg', this.getQualityValue());
        pdf.addImage(imgData, 'JPEG', x, y, width, height);

        // Add image filename as caption
        const captionY = y + height + 10;
        if (captionY < pageDimensions.height - margin) {
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text(image.name, x, captionY);
        }

      } catch (error) {
        console.error(`Error processing image ${image.name}:`, error);
        // Continue with next image
      }
    }
  }

  /**
   * Convert images with multiple images per page
   */
  private async convertMultiplePerPage(pdf: jsPDF, images: ImageData[]): Promise<void> {
    const pageDimensions = this.getPageDimensions();
    const margin = 15;
    const maxWidth = pageDimensions.width - (margin * 2);
    const maxHeight = pageDimensions.height - (margin * 2);
    
    // Calculate grid layout (2x2 for most page sizes)
    const cols = 2;
    const rows = 2;
    const imageWidth = (maxWidth - (margin * (cols - 1))) / cols;
    const imageHeight = (maxHeight - (margin * (rows - 1))) / rows;

    let currentPage = 0;
    let imagesOnCurrentPage = 0;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      // Add new page if needed
      if (imagesOnCurrentPage === 0) {
        if (i > 0) {
          pdf.addPage();
        }
        currentPage++;
        imagesOnCurrentPage = 0;
      }

      try {
        // Convert image to canvas
        const canvas = await this.imageToCanvas(image.preview);
        
        // Calculate position in grid
        const col = imagesOnCurrentPage % cols;
        const row = Math.floor(imagesOnCurrentPage / rows);
        
        const x = margin + col * (imageWidth + margin);
        const y = margin + row * (imageHeight + margin);

        // Add image to PDF
        const imgData = canvas.toDataURL('image/jpeg', this.getQualityValue());
        pdf.addImage(imgData, 'JPEG', x, y, imageWidth, imageHeight);

        // Add image filename
        const captionY = y + imageHeight + 5;
        if (captionY < pageDimensions.height - margin) {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(image.name, x, captionY);
        }

        imagesOnCurrentPage++;
        
        // If page is full, reset counter for next page
        if (imagesOnCurrentPage >= cols * rows) {
          imagesOnCurrentPage = 0;
        }

      } catch (error) {
        console.error(`Error processing image ${image.name}:`, error);
        // Continue with next image
      }
    }
  }

  /**
   * Convert image URL to canvas
   */
  private async imageToCanvas(imageUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0);
        
        resolve(canvas);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  /**
   * Calculate image dimensions to fit on page
   */
  private calculateImageDimensions(
    imgWidth: number,
    imgHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = imgWidth / imgHeight;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width, height };
  }

  /**
   * Get quality value for image conversion
   */
  private getQualityValue(): number {
    switch (this.settings.quality) {
      case 'low': return 0.5;
      case 'medium': return 0.7;
      case 'high': return 0.9;
      default: return 0.7;
    }
  }
}

/**
 * Utility function to convert images to PDF
 */
export async function convertImagesToPDF(
  images: ImageData[],
  settings: PDFSettings
): Promise<Blob> {
  const converter = new PDFConverter(settings);
  return converter.convertToPDF(images);
}
