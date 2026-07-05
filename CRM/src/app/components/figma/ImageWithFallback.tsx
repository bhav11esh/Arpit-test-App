import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, fallback, ...rest } = props

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
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  )
}
