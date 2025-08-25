"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileImage, Download, Trash2, RotateCw, SortAsc, SortDesc, Eye } from "lucide-react";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  dimensions: { width: number; height: number };
  uploadTime: Date;
}

type SortOption = "name" | "size" | "date" | "dimensions";
type SortOrder = "asc" | "desc";
type PageSize = "A4" | "Letter" | "Legal";
type Orientation = "portrait" | "landscape";

export default function ImageToPDFConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [isConverting, setIsConverting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newImages: ImageFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => {
        const id = Math.random().toString(36).substr(2, 9);
        const preview = URL.createObjectURL(file);
        
        return {
          id,
          file,
          preview,
          name: file.name,
          size: file.size,
          dimensions: { width: 0, height: 0 },
          uploadTime: new Date()
        };
      });

    // Load image dimensions
    newImages.forEach(img => {
      const imgElement = new Image();
      imgElement.onload = () => {
        setImages(prev => prev.map(p => 
          p.id === img.id 
            ? { ...p, dimensions: { width: imgElement.width, height: imgElement.height } }
            : p
        ));
      };
      imgElement.src = img.preview;
    });

    setImages(prev => [...prev, ...newImages]);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Remove image
  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  // Toggle image selection
  const toggleImageSelection = useCallback((id: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Remove selected images
  const removeSelectedImages = useCallback(() => {
    setImages(prev => prev.filter(img => !selectedImages.has(img.id)));
    setSelectedImages(new Set());
  }, [selectedImages]);

  // Sort images
  const sortedImages = useCallback(() => {
    return [...images].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size":
          comparison = a.size - b.size;
          break;
        case "date":
          comparison = a.uploadTime.getTime() - b.uploadTime.getTime();
          break;
        case "dimensions":
          comparison = (a.dimensions.width * a.dimensions.height) - (b.dimensions.width * b.dimensions.height);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [images, sortBy, sortOrder]);

  // Convert to PDF
  const convertToPDF = useCallback(async () => {
    if (images.length === 0) return;
    
    setIsConverting(true);
    
    try {
      // This is a placeholder for the actual PDF conversion logic
      // In a real implementation, you would use jsPDF and html2canvas
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate conversion
      
      // Create a download link for the PDF
      const link = document.createElement('a');
      link.href = '#';
      link.download = `converted-images-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      
    } catch (error) {
      console.error('PDF conversion failed:', error);
    } finally {
      setIsConverting(false);
    }
  }, [images]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Image to PDF Converter</h1>
              <p className="text-muted-foreground mt-2">Convert your images to professional PDF documents</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Next.js 15</Badge>
              <Badge variant="outline">Tailwind CSS v4</Badge>
              <Badge variant="default">shadcn/ui</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Images</CardTitle>
              <CardDescription>
                Drag and drop images or click to browse. Supports JPG, PNG, GIF, BMP, TIFF, WebP formats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  Drop images here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Maximum 50 images, 10MB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Management Section */}
          {images.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Image Management</CardTitle>
                    <CardDescription>
                      {images.length} image{images.length !== 1 ? 's' : ''} uploaded
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedImages.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={removeSelectedImages}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Selected ({selectedImages.size})
                      </Button>
                    )}
                    <Button
                      onClick={convertToPDF}
                      disabled={isConverting || images.length === 0}
                      className="flex items-center gap-2"
                    >
                      {isConverting ? (
                        <>
                          <RotateCw className="h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Convert to PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Sorting Controls */}
                <div className="flex items-center gap-4 mb-6">
                  <Label htmlFor="sort-by">Sort by:</Label>
                  <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="dimensions">Dimensions</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                    className="flex items-center gap-2"
                  >
                    {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    {sortOrder === "asc" ? "Ascending" : "Descending"}
                  </Button>
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedImages().map((image) => (
                    <Card key={image.id} className="relative group">
                      <CardContent className="p-4">
                        <div className="relative">
                          <img
                            src={image.preview}
                            alt={image.name}
                            className="w-full h-32 object-cover rounded-md mb-3"
                          />
                          <div className="absolute top-2 right-2">
                            <input
                              type="checkbox"
                              checked={selectedImages.has(image.id)}
                              onChange={() => toggleImageSelection(image.id)}
                              className="w-4 h-4"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(image.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="font-medium text-sm truncate" title={image.name}>
                            {image.name}
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Size: {formatFileSize(image.size)}</p>
                            <p>Dimensions: {image.dimensions.width} × {image.dimensions.height}</p>
                            <p>Uploaded: {image.uploadTime.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PDF Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle>PDF Settings</CardTitle>
              <CardDescription>Configure the output PDF format and quality</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="page-size">Page Size</Label>
                    <Select value={pageSize} onValueChange={(value: PageSize) => setPageSize(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                        <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                        <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="orientation">Orientation</Label>
                    <Select value={orientation} onValueChange={(value: Orientation) => setOrientation(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quality">Quality</Label>
                    <Select defaultValue="high">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (72 DPI)</SelectItem>
                        <SelectItem value="medium">Medium (150 DPI)</SelectItem>
                        <SelectItem value="high">High (300 DPI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="layout">Layout</Label>
                    <Select defaultValue="one-per-page">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-per-page">One image per page</SelectItem>
                        <SelectItem value="multiple-per-page">Multiple images per page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Built with Next.js, Tailwind CSS, and shadcn/ui
            </p>
            <div className="flex items-center gap-4">
              <Badge variant="outline">v1.0.0</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
