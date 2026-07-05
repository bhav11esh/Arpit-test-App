import React, { useState, useEffect } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

const isUrlHeic = (url?: string): boolean => {
  if (!url) return false;
  try {
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.heic') || cleanUrl.endsWith('.heif');
  } catch {
    return false;
  }
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null)

  const { src, alt, style, className, fallback, ...rest } = props

  // Reset states when src changes
  useEffect(() => {
    setDidError(false);
    setConvertedUrl(null);
    setConverting(false);
  }, [src]);

  // Handle HEIC conversion
  useEffect(() => {
    if (!src || !isUrlHeic(src)) return;

    let active = true;
    let objectUrl: string | null = null;

    const performConversion = async () => {
      setConverting(true);
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();

        if (!active) return;

        // Dynamically import heic2any to keep bundle size small
        const heic2anyModule = await import('heic2any');
        const heic2any = heic2anyModule.default;

        if (!active) return;

        const conversionResult = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.8
        });

        if (!active) return;

        const convertedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
        objectUrl = URL.createObjectURL(convertedBlob);

        if (active) {
          setConvertedUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (err) {
        console.error('HEIC conversion failed:', err);
        if (active) {
          setDidError(true);
        }
      } finally {
        if (active) {
          setConverting(false);
        }
      }
    };

    performConversion();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  const handleError = () => {
    setDidError(true)
  }

  if (converting) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-50 p-6 border border-dashed border-gray-200 rounded-lg text-center ${className ?? ''}`}
        style={style}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <span className="text-xs text-gray-500 font-medium animate-pulse">Converting HEIC Image...</span>
      </div>
    );
  }

  const renderSrc = convertedUrl || src;

  return didError ? (
    fallback ? (
      <div className={className} style={style}>{fallback}</div>
    ) : (
      <div
        className={`flex flex-col items-center justify-center bg-gray-50 p-6 border border-dashed border-gray-200 rounded-lg text-center ${className ?? ''}`}
        style={style}
      >
        <img src={ERROR_IMG_SRC} alt="Error loading image" className="h-12 w-12 opacity-60 mb-2" {...rest} data-original-url={src} />
        <span className="text-xs text-gray-500 font-medium mb-1">Image failed to load or format unsupported (e.g. HEIC)</span>
        {src && (
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-semibold mt-1"
          >
            Open Original Image in New Tab ↗
          </a>
        )}
      </div>
    )
  ) : (
    <img src={renderSrc} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}
