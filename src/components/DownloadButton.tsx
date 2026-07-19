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

    let imageUrl = data.backgroundUrl || data.url

    // Jika URL adalah wrapper media dari Reddit, ekstrak URL gambar aslinya
    try {
      const urlObj = new URL(imageUrl)
      if (urlObj.hostname.includes("reddit.com") && urlObj.pathname.includes("/media")) {
        const innerUrl = urlObj.searchParams.get("url")
        if (innerUrl) imageUrl = innerUrl
      }
    } catch {
      // Abaikan jika URL tidak valid
    }
    setState("loading")

    try {
      // Gunakan chrome.downloads API — bekerja langsung tanpa CORS issue
      const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg"
      // Bersihkan nama file dari karakter invalid
      const safeTitle = data.title.replace(/[^a-zA-Z0-9\s_-]/g, "").trim() || "wallpaper"
      const filename = `${safeTitle.slice(0, 60).trim()}.${ext}`

      if (typeof chrome !== "undefined" && chrome.downloads) {
        await new Promise<void>((resolve, reject) => {
          chrome.downloads.download(
            { url: imageUrl, filename },
            (downloadId?: number) => {
              if (chrome.runtime.lastError || downloadId === undefined) {
                reject(chrome.runtime.lastError || new Error("Download failed (no ID returned)"))
              } else {
                resolve()
              }
            }
          )
        })
      } else {
        // Fallback untuk environment dev / localhost
        const a = document.createElement("a")
        a.href = imageUrl
        a.download = filename
        a.target = "_blank"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      setState("done")
      setTimeout(() => setState("idle"), 2000)
    } catch (err) {
      console.error("Download error:", err)
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
