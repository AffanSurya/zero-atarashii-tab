import "./styles/Menu.scss"
import "./styles/OfflineGallery.scss"
import { type CSSProperties, useEffect, useRef, useState } from "react"
import {
  FaCog,
  FaCloudDownloadAlt,
  FaEyeDropper,
  FaHistory,
  FaStar,
  FaThumbtack,
  FaTrash,
  FaWifi,
} from "react-icons/fa"
import {
  ConfigStore,
  PRIMARY_COLOR_PRESETS,
  WALLPAPER_SOURCES,
  type WallpaperSourceId,
} from "../stores/ConfigStore"
import { useSnapshot } from "valtio"
import {
  clearHistory,
  HistoryStore,
  removeHistoryAt,
  toggleFavoriteAt,
} from "../stores/HistoryStore"
import { LoadState, setLoaded } from "../stores/AppStore"
import { clearCache } from "../stores/CacheStore"
import {
  OfflineGalleryStore,
  addToSavedUrls,
  removeFromSavedUrls,
  updateStorageInfo,
} from "../stores/OfflineGalleryStore"
import {
  saveWallpaper,
  deleteWallpaper,
  getAllWallpapers,
  getStorageInfo,
  type SavedWallpaper,
} from "../utils/offlineGallery"
import type { ImageData } from "../types/ImageData"

type MenuTab = "history" | "offline" | "settings"

// ─────────────────────────────────────────────
// MenuCard
// ─────────────────────────────────────────────
type MenuCardProps = {
  data: (typeof HistoryStore.history)[number]
  index: number
  isCurrent: boolean
  isEntering: boolean
  isNewest: boolean
  isPinned: boolean
  isSaved: boolean
  isSaving: boolean
  onFavorite: () => void
  onRemove: () => void
  onSaveOffline: () => void
}

function MenuCard({
  data,
  index,
  isCurrent,
  isEntering,
  isNewest,
  isPinned,
  isSaved,
  isSaving,
  onFavorite,
  onRemove,
  onSaveOffline,
}: MenuCardProps) {
  return (
    <div
      data-index={index}
      className={`card ${isPinned ? "pinned" : ""} ${isCurrent ? "current" : ""} ${isEntering ? "entering" : ""}`}
      onClick={() => {
        if (isPinned) {
          ConfigStore.pinned = false
          setLoaded(LoadState.LOADED)
        } else {
          ConfigStore.pinned = true
          HistoryStore.i = index
          setLoaded(isCurrent ? LoadState.LOADED : LoadState.LOADING)
        }
      }}
    >
      <div className="card-image">
        <img
          src={data.thumbnailUrl || data.url}
          loading="lazy"
          decoding="async"
          onLoad={(event) => {
            event.currentTarget.classList.add("loaded")
          }}
        />
      </div>

      <p className="card-details">
        <strong title={data.title || "Untitled Wallpaper"}>
          {data.title || "Untitled Wallpaper"}
        </strong>
        {data.res && <small>{data.res}</small>}
      </p>

      <p className="card-status">
        <span>#{String(index + 1).padStart(2, "0")}</span>
        {isPinned ? <FaThumbtack size={14} /> : isNewest ? "NEW" : null}
      </p>

      <div className="card-actions">
        <button
          type="button"
          className={`card-action-button card-favorite-button ${data.favorite ? "active" : ""}`}
          aria-label={`${data.favorite ? "Remove" : "Add"} ${data.title || "wallpaper"} ${data.favorite ? "from" : "to"} favorites`}
          onClick={(event) => { event.stopPropagation(); onFavorite() }}
        >
          <FaStar size={13} />
        </button>

        <button
          type="button"
          className={`card-action-button card-offline-button ${isSaved ? "active" : ""} ${isSaving ? "saving" : ""}`}
          aria-label={isSaved ? "Saved offline" : "Save offline"}
          title={isSaved ? "Saved offline — click to remove" : "Save offline"}
          onClick={(event) => { event.stopPropagation(); onSaveOffline() }}
          disabled={isSaving}
        >
          <FaCloudDownloadAlt size={13} />
        </button>

        <button
          type="button"
          className="card-action-button card-remove-button"
          aria-label={`Remove ${data.title || "wallpaper"} from history`}
          onClick={(event) => { event.stopPropagation(); onRemove() }}
        >
          <FaTrash size={13} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// OfflineCard
// ─────────────────────────────────────────────
type OfflineCardProps = {
  wallpaper: SavedWallpaper
  onLoad: () => void
  onDelete: () => void
}

function OfflineCard({ wallpaper, onLoad, onDelete }: OfflineCardProps) {
  const objUrl = URL.createObjectURL(wallpaper.blob)

  return (
    <div className="card offline-card">
      <div className="card-image">
        <img
          src={objUrl}
          loading="lazy"
          decoding="async"
          onLoad={(e) => {
            e.currentTarget.classList.add("loaded")
            URL.revokeObjectURL(objUrl)
          }}
        />
      </div>
      <p className="card-details">
        <strong title={wallpaper.meta.title || "Untitled"}>
          {wallpaper.meta.title || "Untitled"}
        </strong>
        {wallpaper.meta.res && <small>{wallpaper.meta.res}</small>}
      </p>
      <div className="card-actions">
        <button
          type="button"
          className="card-action-button"
          aria-label="Load this wallpaper"
          title="Load wallpaper"
          onClick={onLoad}
        >
          <FaWifi size={13} />
        </button>
        <button
          type="button"
          className="card-action-button card-remove-button"
          aria-label="Delete from offline gallery"
          onClick={onDelete}
        >
          <FaTrash size={13} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Menu (main)
// ─────────────────────────────────────────────
export default function Menu() {
  const { history, i: historyIndex } = useSnapshot(HistoryStore)
  const { pinned, isMenuVisible, theme, settings, sources } = useSnapshot(ConfigStore)
  const { savedUrls, storageUsedMB, count, maxItems } = useSnapshot(OfflineGalleryStore)

  const [activeTab, setActiveTab] = useState<MenuTab>("history")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [offlineWallpapers, setOfflineWallpapers] = useState<SavedWallpaper[]>([])
  const [savingUrls, setSavingUrls] = useState<Set<string>>(new Set())

  const previousHistoryLength = useRef(history.length)
  const [enteringIndex, setEnteringIndex] = useState<number | null>(null)

  const primaryColor = theme.primary
  const isCustomPrimaryColor = !PRIMARY_COLOR_PRESETS.includes(
    primaryColor as (typeof PRIMARY_COLOR_PRESETS)[number]
  )
  const backgroundDim = theme.backgroundDim ?? 0.35

  const historyCards = [...history]
    .map((data, index) => ({ data, index }))
    .filter(({ data }) => !showFavoritesOnly || data.favorite)
    .reverse()

  useEffect(() => {
    if (history.length > previousHistoryLength.current) {
      setEnteringIndex(history.length - 1)
    }
    previousHistoryLength.current = history.length
  }, [history.length])

  // Load offline wallpapers ketika tab offline dibuka
  useEffect(() => {
    if (activeTab === "offline") {
      getAllWallpapers().then(setOfflineWallpapers)
    }
  }, [activeTab, count])

  const clearAllHistory = () => {
    ConfigStore.pinned = false
    clearHistory()
  }

  const removeHistoryCard = (index: number) => {
    if (pinned && historyIndex === index) ConfigStore.pinned = false
    removeHistoryAt(index)
  }

  const toggleHistoryFavorite = (index: number) => toggleFavoriteAt(index)

  const handleSaveOffline = async (data: ImageData) => {
    const imageUrl = data.backgroundUrl || data.url
    if (savingUrls.has(imageUrl)) return

    if (savedUrls.includes(imageUrl)) {
      // Hapus dari offline
      await deleteWallpaper(imageUrl)
      removeFromSavedUrls(imageUrl)
      const info = await getStorageInfo()
      updateStorageInfo(info.usedMB, info.count)
      return
    }

    if (count >= maxItems) {
      alert(`Offline gallery penuh (maksimal ${maxItems} gambar). Hapus beberapa dulu.`)
      return
    }

    setSavingUrls((prev) => new Set(prev).add(imageUrl))
    try {
      await saveWallpaper(data)
      addToSavedUrls(imageUrl)
      const info = await getStorageInfo()
      updateStorageInfo(info.usedMB, info.count)
    } catch (e) {
      console.error("Failed to save wallpaper offline:", e)
      alert("Gagal menyimpan wallpaper. Coba lagi.")
    } finally {
      setSavingUrls((prev) => {
        const next = new Set(prev)
        next.delete(imageUrl)
        return next
      })
    }
  }

  const handleDeleteOffline = async (url: string) => {
    await deleteWallpaper(url)
    removeFromSavedUrls(url)
    const info = await getStorageInfo()
    updateStorageInfo(info.usedMB, info.count)
    setOfflineWallpapers((prev) => prev.filter((w) => w.url !== url))
  }

  const toggleSource = (id: WallpaperSourceId) => {
    const current = [...ConfigStore.sources] as WallpaperSourceId[]
    if (current.includes(id)) {
      if (current.length === 1) return // minimal 1 source
      ConfigStore.sources = current.filter((s) => s !== id)
    } else {
      ConfigStore.sources = [...current, id]
    }
    // Reset cache supaya fetch ulang dengan source baru
    clearCache()
    setLoaded(LoadState.FETCH_NEW)
  }

  return (
    <div className={`menu ${isMenuVisible ? "visible" : ""}`}>
      <aside className="menu-sidebar" aria-label="Menu tabs">
        <button
          type="button"
          className={activeTab === "history" ? "active" : ""}
          onClick={() => setActiveTab("history")}
        >
          <FaHistory size={16} />
          History
        </button>

        <button
          type="button"
          className={activeTab === "offline" ? "active" : ""}
          onClick={() => setActiveTab("offline")}
        >
          <FaCloudDownloadAlt size={16} />
          Offline
          {count > 0 && <span className="sidebar-badge">{count}</span>}
        </button>

        <button
          type="button"
          className={activeTab === "settings" ? "active" : ""}
          onClick={() => setActiveTab("settings")}
        >
          <FaCog size={16} />
          Settings
        </button>
      </aside>

      <div className="menu-content">
        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <section className="history-panel" aria-label="History">
            <div className="cards-container">
              {historyCards.map(({ data, index }) => {
                const isPinned = pinned && historyIndex === index
                const isCurrent = historyIndex === index
                const isEntering = enteringIndex === index
                const isNewest = index === history.length - 1
                const imageUrl = data.backgroundUrl || data.url
                const isSaved = savedUrls.includes(imageUrl)
                const isSaving = savingUrls.has(imageUrl)

                return (
                  <MenuCard
                    key={`menu-card-${index}`}
                    data={data}
                    index={index}
                    isCurrent={isCurrent}
                    isEntering={isEntering}
                    isNewest={isNewest}
                    isPinned={isPinned}
                    isSaved={isSaved}
                    isSaving={isSaving}
                    onFavorite={() => toggleHistoryFavorite(index)}
                    onRemove={() => removeHistoryCard(index)}
                    onSaveOffline={() => handleSaveOffline(data)}
                  />
                )
              })}
            </div>

            <nav className="history-actions" aria-label="History actions">
              <button
                type="button"
                className={showFavoritesOnly ? "active" : ""}
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <FaStar size={14} />
                Favorites
              </button>

              <button
                type="button"
                disabled={!history.some(({ favorite }) => !favorite)}
                onClick={clearAllHistory}
              >
                <FaTrash size={14} />
                Clear
              </button>
            </nav>
          </section>
        )}

        {/* ── OFFLINE TAB ── */}
        {activeTab === "offline" && (
          <section className="offline-panel" aria-label="Offline Gallery">
            <div className="offline-header">
              <p className="offline-usage">
                <strong>{count}</strong> / {maxItems} wallpapers saved
                {storageUsedMB > 0 && (
                  <span className="offline-usage-mb"> · {storageUsedMB} MB</span>
                )}
              </p>
            </div>

            {offlineWallpapers.length === 0 ? (
              <div className="offline-empty">
                <FaCloudDownloadAlt size={32} />
                <p>No wallpapers saved yet.</p>
                <p className="offline-hint">
                  Tap the <FaCloudDownloadAlt size={12} /> icon on any history card to save it offline.
                </p>
              </div>
            ) : (
              <div className="cards-container">
                {[...offlineWallpapers].reverse().map((w) => (
                  <OfflineCard
                    key={w.url}
                    wallpaper={w}
                    onLoad={() => {
                      const objUrl = URL.createObjectURL(w.blob)
                      // Set gambar sebagai background langsung dari blob
                      const img = document.querySelector<HTMLImageElement>(".bg")
                      if (img) {
                        img.src = objUrl
                        img.classList.add("load")
                      }
                    }}
                    onDelete={() => handleDeleteOffline(w.url)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div className="settings-panel" aria-label="Settings">
            {/* Wallpaper Sources */}
            <section className="settings-section">
              <div className="settings-header">
                <h2>Wallpaper Sources</h2>
                <p>Choose which subreddits to pull wallpapers from.</p>
              </div>
              <div className="source-toggles">
                {WALLPAPER_SOURCES.map((source) => {
                  const isActive = sources.includes(source.id)
                  return (
                    <label key={source.id} className="toggle-picker-row">
                      <span>{source.label}</span>
                      <button
                        type="button"
                        className={isActive ? "active" : ""}
                        onClick={() => toggleSource(source.id)}
                        disabled={isActive && sources.length === 1}
                        title={isActive && sources.length === 1 ? "At least one source required" : ""}
                      >
                        {isActive ? "on" : "off"}
                      </button>
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Accent Color */}
            <section className="settings-section">
              <div className="settings-header">
                <h2>Accent Color</h2>
                <p>Customize the primary color used for highlights and links.</p>
              </div>

              <div className="color-presets" aria-label="Primary color presets">
                {PRIMARY_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={primaryColor === color ? "active" : ""}
                    style={{ "--preset-color": color } as CSSProperties}
                    aria-label={`Set primary color to ${color}`}
                    onClick={() => { ConfigStore.theme.primary = color }}
                  />
                ))}
                <label
                  className={"custom-color-button" + (isCustomPrimaryColor ? " active" : "")}
                  style={{ "--preset-color": primaryColor } as CSSProperties}
                  aria-label="Choose custom primary color"
                >
                  <FaEyeDropper size={15} aria-hidden="true" />
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(event) => {
                      ConfigStore.theme.primary = event.currentTarget.value
                    }}
                  />
                </label>
              </div>
            </section>

            {/* Background Dim */}
            <section className="settings-section">
              <div className="settings-header">
                <h2>Background Dim</h2>
                <p>Choose the background dim opacity percentage.</p>
              </div>

              <label className="range-picker-row">
                <span>Opacity</span>
                <strong>{Math.round(backgroundDim * 100)}%</strong>
              </label>

              <input
                className="dim-opacity-slider"
                type="range"
                min="0"
                max="0.75"
                step="0.01"
                value={backgroundDim}
                onChange={(event) => {
                  ConfigStore.theme.backgroundDim = Number(event.currentTarget.value)
                }}
              />
            </section>

            {/* Reroll Effects */}
            <section className="settings-section">
              <div className="settings-header">
                <h2>Reroll Effects</h2>
                <p>Choose which effects play when rolling a new wallpaper.</p>
              </div>

              <span className="small-section">
                <label className="toggle-picker-row">
                  <span>Reroll jingle</span>
                  <button
                    type="button"
                    className={settings.soundEffects ? "active" : ""}
                    onClick={() => {
                      ConfigStore.settings.soundEffects = !ConfigStore.settings.soundEffects
                    }}
                  >
                    {settings.soundEffects ? "on" : "off"}
                  </button>
                </label>

                <label className="toggle-picker-row">
                  <span>Large flash</span>
                  <button
                    type="button"
                    className={settings.rerollFlash ? "active" : ""}
                    onClick={() => {
                      ConfigStore.settings.rerollFlash = !ConfigStore.settings.rerollFlash
                    }}
                  >
                    {settings.rerollFlash ? "on" : "off"}
                  </button>
                </label>
              </span>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
