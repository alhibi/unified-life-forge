import { type ClassValue,clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Clamp a value between min and max
 * 
 * @param value - The value to clamp
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Debounce a function
 * 
 * @param func - The function to debounce
 * @param wait - The debounce delay in milliseconds
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle a function
 * 
 * @param func - The function to throttle
 * @param cooldown - The throttle cooldown in milliseconds
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  cooldown: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= cooldown) {
      lastCall = now;
      func(...args);
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, cooldown - (now - lastCall));
    }
  };
}

/**
 * Deep merge two objects
 * 
 * @param target - The target object
 * @param source - The source object
 * @returns The merged object
 */
export function deepMerge<T extends Record<string, any>, U extends Record<string, any>>(target: T, source: U): T & U {
  const output = { ...target };

  Object.keys(source).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (typeof output[key] === 'object' && output[key] !== null && !Array.isArray(output[key])) {
          (output[key] as any) = deepMerge(output[key], source[key]);
        } else {
          (output[key] as any) = source[key];
        }
      } else {
        (output[key] as any) = source[key];
      }
    }
  });

  return output as T & U;
}

/**
 * Generate a unique ID
 * 
 * @param prefix - Optional prefix for the ID
 * @returns A unique ID string
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Math.random().toString(36).substr(2, 9)}${Date.now().toString(36)}`;
}

/**
 * Safe JSON parse with error handling
 * 
 * @param json - The JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @returns The parsed object or default value
 */
export function safeParse<T = any>(json: string, defaultValue?: T): T | undefined {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe JSON stringify with error handling
 * 
 * @param value - The value to stringify
 * @param defaultValue - Default value if stringification fails
 * @returns The JSON string or default value
 */
export function safeStringify(value: any, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, or empty object)
 * 
 * @param value - The value to check
 * @returns True if the value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Check if value is not empty
 * 
 * @param value - The value to check
 * @returns True if the value is not empty
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value);
}

/**
 * Wait for a specified time
 * 
 * @param ms - The time to wait in milliseconds
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep alias for wait
 * 
 * @param ms - The time to sleep in milliseconds
 * @returns A promise that resolves after the specified time
 */
export async function sleep(ms: number): Promise<void> {
  return wait(ms);
}

/**
 * Format a number with commas
 * 
 * @param number - The number to format
 * @returns The formatted number as a string
 */
export function formatNumber(number: number): string {
  return number.toLocaleString();
}

/**
 * Format a date to a human-readable string
 * 
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns The formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(dateObj);
}

/**
 * Truncate a string to a maximum length
 * 
 * @param str - The string to truncate
 * @param maxLength - The maximum length
 * @param suffix - The suffix to append if truncated
 * @returns The truncated string
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Get the first n elements of an array
 * 
 * @param array - The array to slice
 * @param count - The number of elements to get
 * @returns The sliced array
 */
export function first<T>(array: T[], count: number = 1): T[] {
  return array.slice(0, count);
}

/**
 * Get the last n elements of an array
 * 
 * @param array - The array to slice
 * @param count - The number of elements to get
 * @returns The sliced array
 */
export function last<T>(array: T[], count: number = 1): T[] {
  return array.slice(-count);
}

/**
 * Get a random item from an array
 * 
 * @param array - The array to get a random item from
 * @returns A random item from the array
 */
export function randomItem<T>(array: T[]): T | undefined {
  if (array.length === 0) {
    return undefined;
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Check if an object is a DOM element
 * 
 * @param value - The value to check
 * @returns True if the value is a DOM element
 */
export function isElement(value: any): value is Element {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.nodeType === Node.ELEMENT_NODE
  );
}

/**
 * Check if a value is a valid CSS color
 * 
 * @param color - The color to check
 * @returns True if the color is valid
 */
export function isValidColor(color: string): boolean {
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

/**
 * Convert hex color to RGB
 * 
 * @param hex - The hex color
 * @returns The RGB color object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Get contrasting text color for a background color
 * 
 * @param backgroundColor - The background color in hex
 * @returns 'black' or 'white'
 */
export function getContrastColor(backgroundColor: string): 'black' | 'white' {
  const rgb = hexToRgb(backgroundColor);
  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Get scroll position
 * 
 * @returns Object with x and y scroll positions
 */
export function getScrollPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }
  return {
    x: window.pageXOffset,
    y: window.pageYOffset,
  };
}

/**
 * Debounce a function and return a cancel function
 * 
 * @param func - The function to debounce
 * @param wait - The debounce delay
 * @returns Object with the debounced function and cancel function
 */
export function debounceWithCancel<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { debounced, cancel };
}

/**
 * Throttle a function and return a cancel function
 * 
 * @param func - The function to throttle
 * @param cooldown - The throttle cooldown
 * @returns Object with the throttled function and cancel function
 */
export function throttleWithCancel<T extends (...args: any[]) => any>(
  func: T,
  cooldown: number
): {
  throttled: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= cooldown) {
      lastCall = now;
      func(...args);
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, cooldown - (now - lastCall));
    }
  };

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { throttled, cancel };
}
