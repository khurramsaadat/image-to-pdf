/**
 * Mobile utilities for enhanced mobile experience
 * Handles touch gestures, mobile detection, and PWA functionality
 */

// PWA types
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface TouchGesture {
  type: 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'pinch' | 'long-press';
  distance?: number;
  duration?: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'small' | 'medium' | 'large';
  platform: 'ios' | 'android' | 'desktop';
}

/**
 * Detect mobile device information
 */
export function detectMobile(): MobileInfo {
  const userAgent = navigator.userAgent;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Detect platform
  let platform: 'ios' | 'android' | 'desktop' = 'desktop';
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    platform = 'ios';
  } else if (/Android/.test(userAgent)) {
    platform = 'android';
  }
  
  // Detect screen size
  const width = window.innerWidth;
  let screenSize: 'small' | 'medium' | 'large' = 'large';
  if (width < 640) screenSize = 'small';
  else if (width < 1024) screenSize = 'medium';
  
  // Detect orientation
  const orientation: 'portrait' | 'landscape' = 
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  
  // Determine device type
  const isMobile = width < 768 && hasTouch;
  const isTablet = width >= 768 && width < 1024 && hasTouch;
  const isDesktop = width >= 1024 || !hasTouch;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    hasTouch,
    orientation,
    screenSize,
    platform
  };
}

/**
 * Touch gesture handler
 */
export class TouchGestureHandler {
  private element: HTMLElement;
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private startDistance: number = 0;
  private isTracking: boolean = false;
  private onGesture: (gesture: TouchGesture) => void;
  
  constructor(element: HTMLElement, onGesture: (gesture: TouchGesture) => void) {
    this.element = element;
    this.onGesture = onGesture;
    this.init();
  }
  
  private init() {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }
  
  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.startX = e.touches[0].clientX;
      this.startY = e.touches[0].clientY;
      this.startTime = Date.now();
      this.isTracking = true;
    } else if (e.touches.length === 2) {
      // Pinch gesture
      this.startDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.isTracking = true;
    }
  }
  
  private handleTouchMove(e: TouchEvent) {
    if (!this.isTracking) return;
    
    if (e.touches.length === 2) {
      // Handle pinch
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const pinchDistance = Math.abs(currentDistance - this.startDistance);
      
      if (pinchDistance > 50) {
        this.onGesture({
          type: 'pinch',
          distance: pinchDistance
        });
        this.isTracking = false;
      }
    }
  }
  
  private handleTouchEnd(e: TouchEvent) {
    if (!this.isTracking) return;
    
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    if (e.changedTouches.length === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - this.startX;
      const deltaY = endY - this.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Minimum distance for swipe
      if (distance > 50 && duration < 500) {
        let gestureType: TouchGesture['type'] = 'swipe-right';
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          gestureType = deltaX > 0 ? 'swipe-right' : 'swipe-left';
        } else {
          // Vertical swipe
          gestureType = deltaY > 0 ? 'swipe-down' : 'swipe-up';
        }
        
        this.onGesture({
          type: gestureType,
          distance,
          duration,
          startX: this.startX,
          startY: this.startY,
          endX,
          endY
        });
      } else if (duration > 500) {
        // Long press
        this.onGesture({
          type: 'long-press',
          duration
        });
      }
    }
    
    this.isTracking = false;
  }
  
  private getDistance(touch1: Touch, touch2: Touch): number {
    const deltaX = touch1.clientX - touch2.clientX;
    const deltaY = touch1.clientY - touch2.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }
  
  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
  }
}

/**
 * PWA installation handler
 */
export class PWAInstallHandler {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private installButton?: HTMLElement;
  private onInstall?: () => void;
  
  constructor(onInstall?: () => void) {
    this.onInstall = onInstall;
    this.init();
  }
  
  private init() {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.showInstallPrompt();
    });
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.hideInstallPrompt();
      this.onInstall?.();
    });
  }
  
  private showInstallPrompt() {
    if (!this.deferredPrompt) return;
    
    // Create install prompt element
    const prompt = document.createElement('div');
    prompt.className = 'pwa-install-prompt';
    prompt.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <strong>Install Image to PDF Converter</strong>
          <p style="margin: 0.5rem 0 0 0; opacity: 0.8; font-size: 0.9rem;">
            Add to home screen for quick access
          </p>
        </div>
        <div>
          <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; border: none; color: inherit; font-size: 1.5rem; cursor: pointer; padding: 0.25rem;">×</button>
        </div>
      </div>
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button onclick="window.pwaHandler.install()" style="background: white; color: #3b82f6; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600;">
          Install
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
          Later
        </button>
      </div>
    `;
    
    document.body.appendChild(prompt);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (prompt.parentElement) {
        prompt.remove();
      }
    }, 10000);
  }
  
  private hideInstallPrompt() {
    const prompt = document.querySelector('.pwa-install-prompt');
    if (prompt) {
      prompt.remove();
    }
  }
  
  async install() {
    if (!this.deferredPrompt) {
      console.log('Install prompt not available');
      return;
    }
    
    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  }
  
  isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }
}

/**
 * Mobile performance optimizations
 */
export class MobilePerformanceOptimizer {
  private mobileInfo: MobileInfo;
  
  constructor() {
    this.mobileInfo = detectMobile();
    this.optimize();
  }
  
  private optimize() {
    if (this.mobileInfo.isMobile) {
      // Reduce animation complexity on mobile
      this.reduceAnimations();
      
      // Optimize touch interactions
      this.optimizeTouchInteractions();
      
      // Adjust rendering quality
      this.adjustRenderingQuality();
    }
  }
  
  private reduceAnimations() {
    // Add reduced motion support
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
    }
    
    // Reduce complex animations on low-end devices
    if (this.mobileInfo.screenSize === 'small') {
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
    }
  }
  
  private optimizeTouchInteractions() {
    // Optimize scroll performance
    document.documentElement.style.setProperty('scroll-behavior', 'auto');
    
    // Enable hardware acceleration
    document.documentElement.style.setProperty('transform', 'translateZ(0)');
  }
  
  private adjustRenderingQuality() {
    // Adjust image quality based on device capabilities
    if (this.mobileInfo.screenSize === 'small') {
      // Lower image quality on small screens for better performance
      document.documentElement.style.setProperty('--image-quality', '0.8');
    }
  }
  
  // Get mobile-specific settings
  getMobileSettings() {
    return {
      animationDuration: this.mobileInfo.screenSize === 'small' ? '0.2s' : '0.3s',
      imageQuality: this.mobileInfo.screenSize === 'small' ? 0.8 : 1.0,
      enableComplexAnimations: this.mobileInfo.screenSize !== 'small',
      touchOptimized: true
    };
  }
}

/**
 * Initialize mobile optimizations
 */
export function initializeMobileOptimizations() {
  const mobileInfo = detectMobile();
  
  // Add mobile-specific classes to body
  document.body.classList.add(`device-${mobileInfo.platform}`);
  document.body.classList.add(`screen-${mobileInfo.screenSize}`);
  document.body.classList.add(`orientation-${mobileInfo.orientation}`);
  
  if (mobileInfo.hasTouch) {
    document.body.classList.add('has-touch');
  }
  
  // Initialize performance optimizer
  const optimizer = new MobilePerformanceOptimizer();
  
  // Initialize PWA handler
  const pwaHandler = new PWAInstallHandler(() => {
    console.log('PWA installed successfully');
  });
  
  // Make PWA handler globally accessible
  Object.defineProperty(window, 'pwaHandler', {
    value: pwaHandler,
    writable: true,
    configurable: true
  });
  
  return {
    mobileInfo,
    optimizer,
    pwaHandler
  };
}
