import { useEffect } from "react"
import { FaHeart, FaReddit, FaSadTear, FaSync } from "react-icons/fa"
import { PuffLoader } from "react-spinners"

import Config from "./components/Config"
import Menu from "./components/Menu"
import Image from "./components/Image"
import { TimeDate } from "./components/TimeDate"
import WeatherWidget from "./components/WeatherWidget"
import DownloadButton from "./components/DownloadButton"

import pkg from "../package.json"

import { useSnapshot } from "valtio"
import "./App.scss"
import {
  AppStore,
  LoadState,
  setLoaded,
} from "./stores/AppStore"
import { CacheStore } from "./stores/CacheStore"
import { ConfigStore } from "./stores/ConfigStore"
import {
  HistoryStore,
  pushPostToHistory,
  type RedditPost,
} from "./stores/HistoryStore"
import { fetchPosts } from "./utils/fetchPosts"
import MenuButton from "./components/MenuButton"
import { getAllWallpapers } from "./utils/offlineGallery"
import { OfflineGalleryStore, addToSavedUrls, updateStorageInfo } from "./stores/OfflineGalleryStore"

function App() {
  const { loaded, showRollOverlay } = useSnapshot(AppStore)
  const config = useSnapshot(ConfigStore)
  const cache = useSnapshot(CacheStore)
  const { history, i } = useSnapshot(HistoryStore)
  useSnapshot(OfflineGalleryStore) // subscribe agar re-render saat savedUrls berubah

  // Inisialisasi offline gallery store dari IndexedDB
  useEffect(() => {
    getAllWallpapers().then((all) => {
      const urls = all.map((w) => w.url)
      urls.forEach((u) => addToSavedUrls(u))
      const usedMB = all.reduce((s, w) => s + w.blob.size, 0) / 1024 / 1024
      updateStorageInfo(Math.round(usedMB * 10) / 10, all.length)
    })
  }, [])

  // const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary",
      config.theme.primary
    )

    document.documentElement.style.setProperty(
      "--background-dim",
      String(config.theme.backgroundDim)
    )
  }, [config.theme.primary, config.theme.backgroundDim])

  useEffect(() => {
    if (config.pinned && loaded === LoadState.FETCH_NEW) {
      setLoaded(LoadState.LOADING)
    }
  }, [config.pinned, loaded])

  useEffect(() => {
    // No-op if incognito or pinned
    if (config.incognito || config.pinned || loaded !== LoadState.FETCH_NEW)
      return

    let ignore = false

    async function run() {
      let posts: RedditPost[] = []

      // Cache for 24 hours (hanya gunakan cache jika memang ada isinya)
      const shouldFetch =
        cache.lastUpdated === -1 ||
        !cache.data?.length ||
        Date.now() - cache.lastUpdated >= 1000 * 60 * 60 * 24

      if (shouldFetch) {
        if (import.meta.env.DEV) console.log("[i] Fetching w/ config:", config)
        posts = await fetchPosts(config)

        if (!ignore) {
          if (posts.length > 0) {
            CacheStore.lastUpdated = Date.now()
            CacheStore.data = posts
          } else if (cache.data?.length) {
            // Gunakan data cache lama jika fetch gagal
            posts = cache.data as RedditPost[]
          }
        }
      } else {
        if (import.meta.env.DEV) console.log("[i] Using cached posts")
        posts = cache.data as RedditPost[]
      }

      if (!posts.length || ignore) {
        if (!ignore) {
          // Jika fetch kosong namun history memiliki wallpaper lain, cycle agar tidak stuck di 1 gambar
          if (history.length > 1) {
            const nextIndex = (i + 1) % history.length
            HistoryStore.i = nextIndex
          }
          setLoaded(LoadState.LOADED)
        }
        return
      }

      // Hindari memilih kembali wallpaper yang sedang aktif jika ada pilihan lain
      const currentUrl = history[i]?.url
      const candidates = posts.filter((p) => p.url !== currentUrl)
      const list = candidates.length > 0 ? candidates : posts
      const num = Math.floor(Math.random() * list.length)
      const post = list[num]
      const originalIndex = posts.indexOf(post)

      if (import.meta.env.DEV) console.log("[i] Loading post:", post)

      pushPostToHistory(post, originalIndex >= 0 ? originalIndex : num, posts.length)
      setLoaded(LoadState.LOADING)
    }

    run()

    return () => {
      ignore = true
    }
  }, [cache.data, cache.lastUpdated, config, loaded])

  const data =
    loaded !== LoadState.FETCH_NEW
      ? history.length
        ? history[i] || history[history.length - 1]
        : null
      : undefined

  return (
    <div className={showRollOverlay ? "roll-flashing" : ""}>
      {showRollOverlay && (
        <div className="roll-overlay" aria-label="Rolling wallpaper">
          <FaSync size={48} />
        </div>
      )}

      <div
        className={
          "app-frame " +
          (!config.incognito && loaded === LoadState.LOADED ? "load" : "") +
          " " +
          (config.hideGui ? "hidden" : "")
        }
      >
        <div className="content">
          <header>
            <div className="header-left">
              <TimeDate />
              <WeatherWidget />

              <div className="details hideable">
                <p className="to-load to-delay-1">{data?.title}</p>
                <p className="to-load to-delay-2">{data?.res}</p>
              </div>
            </div>

            <div className="header-right">
              <Config />
            </div>
          </header>

          <footer className="to-bottom">
            <div className="attr hideable">
              <p className="attr-from to-load to-delay-3">
                {data === null ? (
                  <strong>
                    No images found <FaSadTear size={20} />
                  </strong>
                ) : (
                  <>
                    Image from{" "}
                    <a href="https://reddit.com/r/animewallpaper">
                      <FaReddit size={20} /> r/Animewallpaper
                    </a>
                  </>
                )}
              </p>

              <p className="attr-bottom to-load to-delay-4">
                {data === null ? (
                  <>Try different filters! • Reddit down perhaps?</>
                ) : (
                  <>
                    Post <strong>#{(data?.nums[0] || 0) + 1}</strong> of{" "}
                    <strong>{data?.nums[1]}</strong> •{" "}
                    <a href={data?.link}>{data?.link}</a>
                  </>
                )}
              </p>

              {loaded !== LoadState.LOADED && !config.incognito && (
                <span className="attr-loader">
                  <PuffLoader color="white" size={18} />
                </span>
              )}
            </div>

            <div className="credits hideable">
              <p>
                Created with <FaHeart /> •{" "}
                <a href="https://github.com/cf12/atarashii-tab">v{pkg.version}</a>
              </p>
            </div>

            <div className="footer-actions">
              <DownloadButton data={data} />
              <MenuButton />
            </div>
            <Menu />
          </footer>
        </div>

        {data === null ? null : (
          <Image
            className="bg to-load-bg"
            src={data?.backgroundUrl || data?.url}
            isPortrait={data?.isPortrait}
            alt=""
            onLoad={() => {
              setLoaded(LoadState.LOADED)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default App
