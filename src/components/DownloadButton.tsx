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
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error("Fetch failed")

      const blob = await res.blob()
      const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg"
      const filename = `${data.title.replace(/[^a-z0-9]/gi, "_").slice(0, 60)}.${ext}`

      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)

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
