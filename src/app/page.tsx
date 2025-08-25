"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, RotateCw, SortAsc, SortDesc, Eye, AlertCircle, CheckCircle, RotateCcw, Sun, Contrast, GripVertical, X, FileText, Settings } from "lucide-react";
import { convertImagesToPDF, PDFSettings, ImageData } from "@/lib/pdf-converter";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  dimensions: { width: number; height: number };
  uploadTime: Date;
  rotation: number;
  brightness: number;
  contrast: number;
  order: number; // New: for drag and drop reordering
}

type SortOption = "name" | "size" | "date" | "dimensions" | "custom";
type SortOrder = "asc" | "desc";
type PageSize = "A4" | "Letter" | "Legal";
type Orientation = "portrait" | "landscape";
type Quality = "low" | "medium" | "high";
type Layout = "one-per-page" | "multiple-per-page";

interface UserPreferences {
  defaultPageSize: PageSize;
  defaultOrientation: Orientation;
  defaultQuality: Quality;
  defaultLayout: Layout;
  customFilename: string;
  rememberSettings: boolean;
}

export default function ImageToPDFConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("custom"); // Default to custom order
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [quality, setQuality] = useState<Quality>("high");
  const [layout, setLayout] = useState<Layout>("one-per-page");
  const [isConverting, setIsConverting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dragOverImage, setDragOverImage] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultPageSize: "A4",
    defaultOrientation: "portrait",
    defaultQuality: "high",
    defaultLayout: "one-per-page",
    customFilename: "converted-images-{date}",
    rememberSettings: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    try {
      const saved = localStorage.getItem('imageToPdfPreferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences(prev => ({ ...prev, ...parsed }));
        
        // Apply remembered settings if enabled
        if (parsed.rememberSettings) {
          setPageSize(parsed.defaultPageSize || "A4");
          setOrientation(parsed.defaultOrientation || "portrait");
          setQuality(parsed.defaultQuality || "high");
          setLayout(parsed.defaultLayout || "one-per-page");
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    try {
      const updated = { ...preferences, ...newPreferences };
      setPreferences(updated);
      localStorage.setItem('imageToPdfPreferences', JSON.stringify(updated));
      setSuccess('Preferences saved successfully');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError('Failed to save preferences');
    }
  }, [preferences]);

  // Reset preferences to defaults
  const resetPreferences = useCallback(() => {
    const defaults: UserPreferences = {
      defaultPageSize: "A4",
      defaultOrientation: "portrait",
      defaultQuality: "high",
      defaultLayout: "one-per-page",
      customFilename: "converted-images-{date}",
      rememberSettings: true
    };
    setPreferences(defaults);
    localStorage.removeItem('imageToPdfPreferences');
    setSuccess('Preferences reset to defaults');
  }, []);

  // Load preferences on component mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);





  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    setError(null);
    setSuccess(null);
    
    // Validate file count
    if (images.length + files.length > 50) {
      setError("Maximum 50 images allowed per session");
      return;
    }
    
    // Validate file types and sizes
    const validFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('image/')) {
        setError(`File ${file.name} is not a valid image`);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError(`File ${file.name} exceeds 10MB limit`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    const newImages: ImageFile[] = validFiles.map((file, index) => {
      const id = Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      
      return {
        id,
        file,
        preview,
        name: file.name,
        size: file.size,
        dimensions: { width: 0, height: 0 },
        uploadTime: new Date(),
        rotation: 0,
        brightness: 0,
        contrast: 0,
        order: images.length + index // Maintain order
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
      imgElement.onerror = () => {
        setError(`Failed to load image ${img.name}`);
      };
      imgElement.src = img.preview;
    });

                    setImages(prev => [...prev, ...newImages]);
                setSuccess(`Successfully uploaded ${validFiles.length} image${validFiles.length !== 1 ? 's' : ''}`);
                
                // Auto-preview functionality will be implemented later
              }, [images]);

  // Handle file upload drag and drop
  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Remove image
  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview); // Clean up memory
      }
      return prev.filter(img => img.id !== id);
    });
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setError(null);
    setSuccess(null);
    setEditingImage(null);
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
    setImages(prev => {
      const toRemove = prev.filter(img => selectedImages.has(img.id));
      toRemove.forEach(img => URL.revokeObjectURL(img.preview)); // Clean up memory
      return prev.filter(img => !selectedImages.has(img.id));
    });
    setSelectedImages(new Set());
    setError(null);
    setSuccess(null);
    setEditingImage(null);
  }, [selectedImages]);

  // Drag and drop reordering
  const handleImageDragStart = useCallback((e: React.DragEvent, imageId: string) => {
    setDraggedImage(imageId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleImageDragOver = useCallback((e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedImage && draggedImage !== imageId) {
      setDragOverImage(imageId);
    }
  }, [draggedImage]);

  const handleImageDragLeave = useCallback(() => {
    setDragOverImage(null);
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    if (!draggedImage || draggedImage === targetImageId) {
      setDraggedImage(null);
      setDragOverImage(null);
      return;
    }

    setImages(prev => {
      const draggedImg = prev.find(img => img.id === draggedImage);
      const targetImg = prev.find(img => img.id === targetImageId);
      
      if (!draggedImg || !targetImg) return prev;

      const newImages = [...prev];
      const draggedIndex = newImages.findIndex(img => img.id === draggedImage);
      const targetIndex = newImages.findIndex(img => img.id === targetImageId);

      // Remove dragged image
      newImages.splice(draggedIndex, 1);

      // Insert at target position
      newImages.splice(targetIndex, 0, draggedImg);

      // Update order numbers
      newImages.forEach((img, index) => {
        img.order = index;
      });

      return newImages;
    });

    setDraggedImage(null);
    setDragOverImage(null);
    setSortBy("custom"); // Switch to custom order after manual reordering
  }, [draggedImage]);

  // Rotate image
  const rotateImageHandler = useCallback((id: string, degrees: number) => {
    setImages(prev => prev.map(img => 
      img.id === id 
        ? { ...img, rotation: (img.rotation + degrees) % 360 }
        : img
    ));
  }, []);

  // Adjust brightness
  const adjustBrightnessHandler = useCallback((id: string, brightness: number) => {
    setImages(prev => prev.map(img => 
      img.id === id 
        ? { ...img, brightness: Math.max(-100, Math.min(100, brightness)) }
        : img
    ));
  }, []);

  // Adjust contrast
  const adjustContrastHandler = useCallback((id: string, contrast: number) => {
    setImages(prev => prev.map(img => 
      img.id === id 
        ? { ...img, contrast: Math.max(-100, Math.min(100, contrast)) }
        : img
    ));
  }, []);

  // Toggle editing mode
  const toggleEditing = useCallback((id: string) => {
    setEditingImage(prev => prev === id ? null : id);
  }, []);

  // Sort images
  const sortedImages = useCallback(() => {
    if (sortBy === "custom") {
      return [...images].sort((a, b) => a.order - b.order);
    }

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
        default:
          return 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [images, sortBy, sortOrder]);

  // Generate PDF preview
  const generatePdfPreview = useCallback(async () => {
    if (images.length === 0) return;
    
    setPreviewLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare images for conversion in current order
      const imagesForConversion: ImageData[] = sortedImages().map(img => ({
        id: img.id,
        file: img.file,
        preview: img.preview,
        name: img.name,
        dimensions: img.dimensions,
        rotation: img.rotation,
        brightness: img.brightness,
        contrast: img.contrast
      }));
      
      // Prepare PDF settings
      const pdfSettings: PDFSettings = {
        pageSize: pageSize,
        orientation: orientation,
        quality: quality,
        layout: layout
      };
      
      // Convert to PDF
      const pdfBlob = await convertImagesToPDF(imagesForConversion, pdfSettings);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(pdfBlob);
      setPdfPreview(previewUrl);
      setShowPdfPreview(true);
      setSuccess(`PDF preview generated successfully`);
      
    } catch (error) {
      console.error('PDF preview generation failed:', error);
      setError(`PDF preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPreviewLoading(false);
    }
  }, [images, pageSize, orientation, quality, layout, sortedImages]);

  // Generate custom filename
  const generateCustomFilename = useCallback(() => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    return preferences.customFilename
      .replace('{date}', date)
      .replace('{time}', time)
      .replace('{count}', images.length.toString());
  }, [preferences.customFilename, images.length]);

  // Convert to PDF
  const convertToPDF = useCallback(async () => {
    if (images.length === 0) return;
    
    setIsConverting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare images for conversion in current order
      const imagesForConversion: ImageData[] = sortedImages().map(img => ({
        id: img.id,
        file: img.file,
        preview: img.preview,
        name: img.name,
        dimensions: img.dimensions,
        rotation: img.rotation,
        brightness: img.brightness,
        contrast: img.contrast
      }));
      
      // Prepare PDF settings
      const pdfSettings: PDFSettings = {
        pageSize: pageSize,
        orientation: orientation,
        quality: quality,
        layout: layout
      };
      
      // Convert to PDF
      const pdfBlob = await convertImagesToPDF(imagesForConversion, pdfSettings);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generateCustomFilename()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      setSuccess(`Successfully converted ${images.length} image${images.length !== 1 ? 's' : ''} to PDF`);
      
    } catch (error) {
      console.error('PDF conversion failed:', error);
      setError(`PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  }, [images, pageSize, orientation, quality, layout, sortedImages]);

  // Close PDF preview
  const closePdfPreview = useCallback(() => {
    setShowPdfPreview(false);
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview);
      setPdfPreview(null);
    }
  }, [pdfPreview]);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Clear messages after 5 seconds
  const clearMessages = useCallback(() => {
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
  }, []);

  // Auto-clear messages when they change
  if (error || success) {
    clearMessages();
  }

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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreferences(true)}
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:bg-primary/10"
              >
                <Settings className="h-4 w-4" />
                Preferences
              </Button>

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Status Messages */}
        {(error || success) && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-500">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive animate-in slide-in-from-left-2 duration-300">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 animate-in slide-in-from-right-2 duration-300">
                <CheckCircle className="h-5 w-5" />
                <span>{success}</span>
              </div>
            )}
          </div>
        )}

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
                            onDragOver={handleFileDragOver}
                            onDrop={handleFileDrop}
                            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-all duration-300 ease-in-out cursor-pointer hover:scale-[1.02] hover:shadow-lg"
                            onClick={() => fileInputRef.current?.click()}
                          >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4 transition-transform duration-300 hover:scale-110 hover:text-foreground" />
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
                      {sortBy === "custom" && " - Drag and drop to reorder"}
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
                      onClick={generatePdfPreview}
                      disabled={previewLoading || images.length === 0}
                      variant="outline"
                      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
                    >
                      {previewLoading ? (
                        <>
                          <RotateCw className="h-4 w-4 animate-spin" />
                          Generating Preview...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Preview PDF
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={convertToPDF}
                      disabled={isConverting || images.length === 0}
                      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg"
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
                      <SelectItem value="custom">Custom Order</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="dimensions">Dimensions</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {sortBy !== "custom" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:bg-primary/10"
                    >
                      {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      {sortOrder === "asc" ? "Ascending" : "Descending"}
                    </Button>
                  )}
                </div>

                {/* Image Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedImages().map((image, index) => (
                    <Card 
                      key={image.id} 
                      className={`relative group transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 animate-in slide-in-from-bottom-2 duration-500 ${
                        draggedImage === image.id ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverImage === image.id ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      draggable={sortBy === "custom"}
                      onDragStart={(e) => handleImageDragStart(e, image.id)}
                      onDragOver={(e) => handleImageDragOver(e, image.id)}
                      onDragLeave={handleImageDragLeave}
                      onDrop={(e) => handleImageDrop(e, image.id)}
                    >
                      <CardContent className="p-4">
                        <div className="relative">
                          <div className="relative w-full h-32 mb-3">
                            <NextImage
                              src={image.preview}
                              alt={image.name}
                              fill
                              className="object-cover rounded-md"
                              style={{
                                transform: `rotate(${image.rotation}deg)`,
                                filter: `brightness(${100 + image.brightness}%) contrast(${100 + image.contrast}%)`
                              }}
                              unoptimized // Since we're using blob URLs
                            />
                          </div>
                          
                          {/* Drag Handle */}
                          {sortBy === "custom" && (
                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-background/80 rounded p-1 cursor-move">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute top-2 right-2">
                            <input
                              type="checkbox"
                              checked={selectedImages.has(image.id)}
                              onChange={() => toggleImageSelection(image.id)}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeImage(image.id)}
                              className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEditing(image.id)}
                              className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate" title={image.name}>
                              {image.name}
                            </p>
                            {sortBy === "custom" && (
                              <Badge variant="secondary" className="text-xs">
                                #{image.order + 1}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Size: {formatFileSize(image.size)}</p>
                            <p>Dimensions: {image.dimensions.width} × {image.dimensions.height}</p>
                            <p>Uploaded: {image.uploadTime.toLocaleTimeString()}</p>
                            {(image.rotation !== 0 || image.brightness !== 0 || image.contrast !== 0) && (
                              <div className="flex gap-1 flex-wrap">
                                {image.rotation !== 0 && (
                                  <Badge variant="outline" className="text-xs">Rotated {image.rotation}°</Badge>
                                )}
                                {image.brightness !== 0 && (
                                  <Badge variant="outline" className="text-xs">Brightness {image.brightness > 0 ? '+' : ''}{image.brightness}</Badge>
                                )}
                                {image.contrast !== 0 && (
                                  <Badge variant="outline" className="text-xs">Contrast {image.contrast > 0 ? '+' : ''}{image.contrast}</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Image Editing Controls */}
                        {editingImage === image.id && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Image Editing</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingImage(null)}
                                className="h-6 w-6 p-0"
                              >
                                ×
                              </Button>
                            </div>
                            
                            {/* Rotation Controls */}
                            <div className="space-y-2">
                              <Label className="text-xs">Rotation</Label>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rotateImageHandler(image.id, -90)}
                                  className="h-8 w-8 p-0"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rotateImageHandler(image.id, 90)}
                                  className="h-8 w-8 p-0"
                                >
                                  <RotateCw className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rotateImageHandler(image.id, 180)}
                                  className="h-8 w-8 p-0 text-xs"
                                >
                                  180°
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rotateImageHandler(image.id, -image.rotation)}
                                  className="h-8 w-8 p-0 text-xs"
                                >
                                  Reset
                                </Button>
                              </div>
                            </div>

                            {/* Brightness Control */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs flex items-center gap-1">
                                  <Sun className="h-3 w-3" />
                                  Brightness
                                </Label>
                                <span className="text-xs text-muted-foreground">{image.brightness}</span>
                              </div>
                              <input
                                type="range"
                                min="-100"
                                max="100"
                                value={image.brightness}
                                onChange={(e) => adjustBrightnessHandler(image.id, parseInt(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                              />
                            </div>

                            {/* Contrast Control */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs flex items-center gap-1">
                                  <Contrast className="h-3 w-3" />
                                  Contrast
                                </Label>
                                <span className="text-xs text-muted-foreground">{image.contrast}</span>
                              </div>
                              <input
                                type="range"
                                min="-100"
                                max="100"
                                value={image.contrast}
                                onChange={(e) => adjustContrastHandler(image.id, parseInt(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                              />
                            </div>

                            {/* Reset All */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                rotateImageHandler(image.id, -image.rotation);
                                adjustBrightnessHandler(image.id, -image.brightness);
                                adjustContrastHandler(image.id, -image.contrast);
                              }}
                              className="w-full h-8 text-xs"
                            >
                              Reset All
                            </Button>
                          </div>
                        )}
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
                    <Select value={quality} onValueChange={(value: Quality) => setQuality(value)}>
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
                    <Select value={layout} onValueChange={(value: Layout) => setLayout(value)}>
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

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-background rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">User Preferences</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferences(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 space-y-6">
              {/* Default PDF Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Default PDF Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="default-page-size">Default Page Size</Label>
                    <Select 
                      value={preferences.defaultPageSize} 
                      onValueChange={(value: PageSize) => savePreferences({ defaultPageSize: value })}
                    >
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
                    <Label htmlFor="default-orientation">Default Orientation</Label>
                    <Select 
                      value={preferences.defaultOrientation} 
                      onValueChange={(value: Orientation) => savePreferences({ defaultOrientation: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="default-quality">Default Quality</Label>
                    <Select 
                      value={preferences.defaultQuality} 
                      onValueChange={(value: Quality) => savePreferences({ defaultQuality: value })}
                    >
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
                    <Label htmlFor="default-layout">Default Layout</Label>
                    <Select 
                      value={preferences.defaultLayout} 
                      onValueChange={(value: Layout) => savePreferences({ defaultLayout: value })}
                    >
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

              {/* Custom Filename */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Custom Filename</h4>
                <div className="space-y-2">
                  <Label htmlFor="custom-filename">Filename Template</Label>
                  <Input
                    id="custom-filename"
                    value={preferences.customFilename}
                    onChange={(e) => savePreferences({ customFilename: e.target.value })}
                    placeholder="converted-images-{date}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {'{date}'}, {'{time}'}, {'{count}'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Example: {generateCustomFilename()}.pdf
                  </p>
                </div>
              </div>

              {/* Behavior Settings */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Behavior Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember-settings"
                      checked={preferences.rememberSettings}
                      onChange={(e) => savePreferences({ rememberSettings: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="remember-settings">Remember last used settings</Label>
                  </div>
                  

                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Preferences are saved automatically
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetPreferences}
                >
                  Reset to Defaults
                </Button>
                <Button
                  onClick={() => setShowPreferences(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && pdfPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-background rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">PDF Preview</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePdfPreview}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 p-4 overflow-hidden">
              <iframe
                src={pdfPreview}
                className="w-full h-full border rounded-lg"
                title="PDF Preview"
              />
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Preview generated with current settings
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closePdfPreview}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    closePdfPreview();
                    convertToPDF();
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
