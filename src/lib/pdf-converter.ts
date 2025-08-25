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
  rotation: number; // New: rotation in degrees (0, 90, 180, 270)
  brightness: number; // New: brightness adjustment (-100 to 100)
  contrast: number; // New: contrast adjustment (-100 to 100)
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
        // Convert image to canvas with rotation and editing
        const canvas = await this.processImage(image);
        
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
        // Convert image to canvas with rotation and editing
        const canvas = await this.processImage(image);
        
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
   * Process image with rotation and editing effects
   */
  private async processImage(image: ImageData): Promise<HTMLCanvasElement> {
    // Convert image URL to canvas
    let canvas = await this.imageToCanvas(image.preview);
    
    // Apply rotation
    if (image.rotation !== 0) {
      canvas = this.rotateCanvas(canvas, image.rotation);
    }
    
    // Apply brightness and contrast adjustments
    if (image.brightness !== 0 || image.contrast !== 0) {
      canvas = this.adjustBrightnessContrast(canvas, image.brightness, image.contrast);
    }
    
    return canvas;
  }

  /**
   * Rotate canvas by specified degrees
   */
  private rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Calculate new dimensions for rotated canvas
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    
    const newWidth = Math.ceil(canvas.width * cos + canvas.height * sin);
    const newHeight = Math.ceil(canvas.width * sin + canvas.height * cos);
    
    // Create new canvas with rotated dimensions
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = newWidth;
    rotatedCanvas.height = newHeight;
    
    const rotatedCtx = rotatedCanvas.getContext('2d');
    if (!rotatedCtx) return canvas;
    
    // Move to center of new canvas
    rotatedCtx.translate(newWidth / 2, newHeight / 2);
    
    // Rotate
    rotatedCtx.rotate(radians);
    
    // Draw rotated image
    rotatedCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    
    return rotatedCanvas;
  }

  /**
   * Adjust brightness and contrast of canvas
   */
  private adjustBrightnessContrast(
    canvas: HTMLCanvasElement, 
    brightness: number, 
    contrast: number
  ): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply brightness and contrast adjustments
    const brightnessFactor = 1 + (brightness / 100);
    const contrastFactor = 1 + (contrast / 100);
    
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness
      data[i] = Math.max(0, Math.min(255, data[i] * brightnessFactor));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * brightnessFactor));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * brightnessFactor));
      
      // Apply contrast
      data[i] = Math.max(0, Math.min(255, ((data[i] - 128) * contrastFactor) + 128));
      data[i + 1] = Math.max(0, Math.min(255, ((data[i + 1] - 128) * contrastFactor) + 128));
      data[i + 2] = Math.max(0, Math.min(255, ((data[i + 2] - 128) * contrastFactor) + 128));
    }
    
    // Put modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    return canvas;
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

/**
 * Utility function to rotate image
 */
export function rotateImage(imageData: ImageData, degrees: number): ImageData {
  return {
    ...imageData,
    rotation: (imageData.rotation + degrees) % 360
  };
}

/**
 * Utility function to adjust brightness
 */
export function adjustBrightness(imageData: ImageData, brightness: number): ImageData {
  return {
    ...imageData,
    brightness: Math.max(-100, Math.min(100, brightness))
  };
}

/**
 * Utility function to adjust contrast
 */
export function adjustContrast(imageData: ImageData, contrast: number): ImageData {
  return {
    ...imageData,
    contrast: Math.max(-100, Math.min(100, contrast))
  };
}
