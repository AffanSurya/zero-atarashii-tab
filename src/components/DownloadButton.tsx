import { useState } from "react"
import { FaDownload } from "react-icons/fa"
import type { ImageData } from "../types/ImageData"
import "./styles/DownloadButton.scss"

type Props = {
  data: ImageData | null | undefined
}

type DownloadState = "idle" | "loading" | "done" | "error"

export default function DownloadButton({ data }: Props) {
  const [state, setState] = useState<DownloadState>("idle")

  const handleDownload = async () => {
    if (!data || state === "loading") return

    const imageUrl = data.backgroundUrl || data.url
    setState("loading")

    try {
      // Gunakan chrome.downloads API — bekerja langsung tanpa CORS issue
      const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg"
      const filename = `${data.title.replace(/[^a-z0-9]/gi, "_").slice(0, 60)}.${ext}`

      await new Promise<void>((resolve, reject) => {
        chrome.downloads.download(
          { url: imageUrl, filename },
          (downloadId?: number) => {
            if (chrome.runtime.lastError || downloadId === undefined) {
              reject(chrome.runtime.lastError)
            } else {
              resolve()
            }
          }
        )
      })

      setState("done")
      setTimeout(() => setState("idle"), 2000)
    } catch {
      setState("error")
      setTimeout(() => setState("idle"), 2000)
    }
  }

  const label =
    state === "loading" ? "Downloading…"
    : state === "done"  ? "Downloaded!"
    : state === "error" ? "Failed!"
    : "Download"

  return (
    <button
      className={`download-btn download-btn--${state}`}
      onClick={handleDownload}
      disabled={!data || state === "loading"}
      title={label}
      aria-label={label}
    >
      <FaDownload size={14} />
      <span>{label}</span>
    </button>
  )
}
