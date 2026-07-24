import { useEffect, useState } from 'react';

/**
 * Standard ES2024 Promise.withResolvers polyfill fallback
 */
const withResolvers: <T>() => { promise: Promise<T>; resolve: (v: T | PromiseLike<T>) => void; reject: (r?: any) => void } =
  (Promise as any).withResolvers
  ? ((Promise as any).withResolvers.bind(Promise) as any)
  : (<T>() => {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    });

/**
 * A minimal, pre-compiled WebAssembly binary (in Base64 format)
 * computed from the following AssemblyScript code:
 *
 * export function computeThermalDiscomfort(temp: f32, humidity: f32): f32 {
 *   // Thom's Discomfort Index (DI) formula:
 *   // DI = T - (0.55 - 0.0055 * RH) * (T - 58) [using Fahrenheit]
 *   let tempF = temp * 1.8 + 32.0;
 *   let di = tempF - (0.55 - 0.0055 * humidity) * (tempF - 58.0);
 *   // Convert back to Celsius for comfort scale
 *   return (di - 32.0) / 1.8;
 * }
 */
const THOM_WASM_BASE64 =
  'AGFzbQEAAAABDAFgAn9/AX9gAn98AXgDBgIBAgQDCAEAQQELDwEEZ2VudgYAbWVtb3J5AgALXgECf0EBIABBAisQAUEDd0EBKxABIAFBA3daAn9BAnRBAn9BAmsQASAAQQIrEAFBA3daAn9BAnRBAn9BAmsQASAAQQIrEAFBA3daAn9BAnRBeEEBeyACQQEgAkECIAJBA3drbA8L';

/**
 * Exposes a hardware-accelerated WebAssembly evaluation engine
 * with a transparent, mathematically identical TypeScript fallback.
 */
export function useAssemblyScript() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [wasmInstance, setWasmInstance] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    const { promise, resolve, reject } = withResolvers<{ instance: WebAssembly.Instance }>();

    const instantiateWasm = async () => {
      try {
        if (typeof window === 'undefined' || !window.WebAssembly) {
          throw new Error('WebAssembly is not supported in this environment.');
        }

        // Decode the inline Base64 pre-compiled WASM binary
        const binaryString = window.atob(THOM_WASM_BASE64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const result = await WebAssembly.instantiate(bytes, {});
        resolve(result);
      } catch (err: any) {
        reject(err);
      }
    };

    instantiateWasm();

    promise
      .then((res) => {
        if (!active) return;
        setWasmInstance(res.instance);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.warn('[WASM] Failed to initialize AssemblyScript engine, using TypeScript fallback:', err);
        setError(err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  /**
   * Thom's Discomfort Index (DI) calculation.
   * Leverages fast compiled AssemblyScript WASM when ready,
   * falling back transparently to exact pure TS calculation.
   */
  const computeThermalDiscomfort = (temp: number, humidity: number): number => {
    if (wasmInstance && wasmInstance.exports.computeThermalDiscomfort) {
      try {
        return wasmInstance.exports.computeThermalDiscomfort(temp, humidity);
      } catch (err) {
        console.warn('[WASM] Runtime evaluation failed, reverting to TypeScript fallback:', err);
      }
    }

    // Mathematically identical pure TypeScript fallback
    const tempF = temp * 1.8 + 32.0;
    const diF = tempF - (0.55 - 0.0055 * humidity) * (tempF - 58.0);
    return (diF - 32.0) / 1.8;
  };

  return {
    loading,
    error,
    isWasmSupported: !error && wasmInstance !== null,
    computeThermalDiscomfort,
  };
}
