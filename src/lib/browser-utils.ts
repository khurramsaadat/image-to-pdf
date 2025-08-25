/**
 * Browser detection and compatibility utilities
 * Provides cross-browser compatibility features and fallbacks
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isIE: boolean;
  supportsCSSGrid: boolean;
  supportsFlexbox: boolean;
  supportsCSSVariables: boolean;
  supportsTransform3D: boolean;
  supportsWebP: boolean;
}

/**
 * Detect browser information and capabilities
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  let isChrome = false;
  let isFirefox = false;
  let isSafari = false;
  let isEdge = false;
  let isIE = false;

  // Detect browser type and version
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    isChrome = true;
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('Firefox')) {
    isFirefox = true;
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    isSafari = true;
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('Edg')) {
    isEdge = true;
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) version = match[1];
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
    isIE = true;
    name = 'Internet Explorer';
    const match = userAgent.match(/(?:MSIE |rv:)(\d+)/);
    if (match) version = match[1];
  }

  // Detect CSS feature support
  const supportsCSSGrid = CSS.supports('display', 'grid');
  const supportsFlexbox = CSS.supports('display', 'flex');
  const supportsCSSVariables = CSS.supports('--custom-property', 'value');
  const supportsTransform3D = CSS.supports('transform', 'translateZ(0)');
  
  // Detect WebP support
  const supportsWebP = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  })();

  return {
    name,
    version,
    isChrome,
    isFirefox,
    isSafari,
    isEdge,
    isIE,
    supportsCSSGrid,
    supportsFlexbox,
    supportsCSSVariables,
    supportsTransform3D,
    supportsWebP
  };
}

/**
 * Get CSS fallbacks for unsupported properties
 */
export function getCSSFallbacks(property: string, value: string): string {
  const fallbacks: Record<string, Record<string, string>> = {
    'transform': {
      'translateY': 'top',
      'translateX': 'left',
      'scale': 'zoom'
    },
    'transition': {
      'all': 'opacity, color, background-color'
    },
    'filter': {
      'brightness': 'opacity',
      'contrast': 'opacity'
    }
  };

  return fallbacks[property]?.[value] || '';
}

/**
 * Apply browser-specific CSS fixes
 */
export function applyBrowserFixes(): void {
  const browser = detectBrowser();
  
  // Add browser-specific classes to body
  document.body.classList.add(`browser-${browser.name.toLowerCase()}`);
  document.body.classList.add(`browser-version-${browser.version.split('.')[0]}`);
  
  // Add feature support classes
  if (!browser.supportsCSSGrid) {
    document.body.classList.add('no-css-grid');
  }
  if (!browser.supportsFlexbox) {
    document.body.classList.add('no-flexbox');
  }
  if (!browser.supportsCSSVariables) {
    document.body.classList.add('no-css-variables');
  }
  if (!browser.supportsTransform3D) {
    document.body.classList.add('no-transform-3d');
  }
}

/**
 * Check if a CSS property is supported
 */
export function isCSSPropertySupported(property: string): boolean {
  return CSS.supports(property, 'initial');
}

/**
 * Get vendor-prefixed CSS property
 */
export function getVendorPrefixedProperty(property: string): string[] {
  const prefixes = ['', '-webkit-', '-moz-', '-ms-', '-o-'];
  return prefixes.map(prefix => `${prefix}${property}`);
}
