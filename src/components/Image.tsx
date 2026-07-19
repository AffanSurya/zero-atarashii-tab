import React, { useEffect, useRef, useState } from "react"
import NProgress from "nprogress"
import { getWallpaper } from "../utils/offlineGallery"

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement>

function Image({ src, onLoad, onError, ...props }: ImageProps) {
  const [loadedSrc, setLoadedSrc] = useState(src)
  const currentSrc = useRef<string | undefined>(undefined)
  const blobUrl = useRef<string | null>(null)

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

  return (
    <img
      src={loadedSrc}
      onLoad={(event) => {
        NProgress.done()
        requestAnimationFrame(() => {
          requestAnimationFrame(() => onLoad?.(event))
        })
      }}
      onError={handleError}
      {...props}
    />
  )
}

export default Image
