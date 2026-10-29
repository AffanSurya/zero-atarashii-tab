import React, { useEffect, useRef, useState } from "react"
import NProgress from "nprogress"
import { getWallpaper } from "../utils/offlineGallery"

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  isPortrait?: boolean
}

function Image({
  src,
  isPortrait: propIsPortrait,
  onLoad,
  onError,
  className,
  ...props
}: ImageProps) {
  const [loadedSrc, setLoadedSrc] = useState(src)
  const currentSrc = useRef<string | undefined>(undefined)
  const blobUrl = useRef<string | null>(null)
  const [isPortrait, setIsPortrait] = useState<boolean>(Boolean(propIsPortrait))

  useEffect(() => {
    if (propIsPortrait !== undefined) {
      setIsPortrait(propIsPortrait)
    }
  }, [propIsPortrait])

  useEffect(() => {
    if (!src) return
    if (src === currentSrc.current) return

    currentSrc.current = src
    NProgress.start()
    setLoadedSrc(src)

    // Cleanup blob URL sebelumnya jika ada
    return () => {
      NProgress.done()
      if (blobUrl.current) {
        URL.revokeObjectURL(blobUrl.current)
        blobUrl.current = null
      }
    }
  }, [src])

  const handleError = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    // Coba fallback ke IndexedDB offline gallery
    if (src) {
      try {
        const saved = await getWallpaper(src)
        if (saved) {
          if (blobUrl.current) URL.revokeObjectURL(blobUrl.current)
          blobUrl.current = URL.createObjectURL(saved.blob)
          setLoadedSrc(blobUrl.current)
          NProgress.done()
          return // jangan panggil onError, kita sudah handle
        }
      } catch {
        // IndexedDB tidak tersedia, lanjut ke onError normal
      }
    }
    NProgress.done()
    onError?.(event)
  }

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget
    if (img.naturalWidth && img.naturalHeight) {
      const portrait = img.naturalWidth / img.naturalHeight < 1.15
      setIsPortrait(portrait)
    }
    NProgress.done()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => onLoad?.(event))
    })
  }

  return (
    <div
      className={`bg-container ${className || ""} ${
        isPortrait ? "is-portrait" : "is-landscape"
      }`}
    >
      {isPortrait && (
        <img
          src={loadedSrc}
          className="bg-backdrop"
          aria-hidden="true"
          alt=""
        />
      )}
      <img
        src={loadedSrc}
        className={`bg-main ${isPortrait ? "portrait" : "landscape"}`}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
}

export default Image
