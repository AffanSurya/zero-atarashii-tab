import { persist } from "valtio-persist"

export const PRIMARY_COLOR_PRESETS = [
  "#ffc400",
  "#ff6b6b",
  "#7c5cff",
  "#00d2ff",
  "#2ee59d",
] as const

export const WALLPAPER_SOURCES = [
  { id: "animewallpaper", label: "r/Animewallpaper", subreddit: "Animewallpaper" },
  { id: "animeart",       label: "r/AnimeART",       subreddit: "AnimeART" },
  { id: "moescape",       label: "r/Moescape",       subreddit: "Moescape" },
  { id: "imaginarycolorscapes", label: "r/ImaginaryColorscapes", subreddit: "ImaginaryColorscapes" },
] as const

export type WallpaperSourceId = (typeof WALLPAPER_SOURCES)[number]["id"]

export const CONFIG_STATE_PICKABLE_FIELDS_MAP = {
  orientation: ["all", "desktop", "mobile"],
  sort: ["relevance", "hot", "top", "new"],
  t: ["hour", "day", "week", "month", "year", "all"],
} as const

export const CONFIG_STATE_TOGGLEABLE_FIELDS = [
  "nsfw",
  "incognito",
  "hideGui",
  "pinned",
] as const

export type ConfigState = {
  num?: number
  q: string
  orientation: (typeof CONFIG_STATE_PICKABLE_FIELDS_MAP.orientation)[number]
  sort: (typeof CONFIG_STATE_PICKABLE_FIELDS_MAP.sort)[number]
  t: (typeof CONFIG_STATE_PICKABLE_FIELDS_MAP.t)[number]

  nsfw: boolean
  incognito: boolean
  hideGui: boolean
  pinned: boolean

  isMenuVisible: boolean

  sources: WallpaperSourceId[]

  theme: {
    primary: string
    backgroundDim: number
  }

  settings: {
    soundEffects: boolean
    rerollFlash: boolean
  }
}

export type ConfigStatePickableFields = {
  [K in keyof typeof CONFIG_STATE_PICKABLE_FIELDS_MAP]: ConfigState[K]
}

export type ConfigStateToggleableFields = {
  [K in (typeof CONFIG_STATE_TOGGLEABLE_FIELDS)[number]]: ConfigState[K]
}

export const { store: ConfigStore } = await persist<ConfigState>(
  {
    num: undefined,
    q: `flair:"Desktop"`,
    orientation: "all",
    sort: "top",
    t: "year",

    nsfw: false,
    incognito: false,
    hideGui: false,
    pinned: false,

    isMenuVisible: false,

    sources: ["animewallpaper"],

    theme: {
      primary: PRIMARY_COLOR_PRESETS[0],
      backgroundDim: 0.35,
    },

    settings: {
      soundEffects: true,
      rerollFlash: true,
    },
  },
  "config"
)

export const toggle = (key: keyof ConfigStateToggleableFields) => {
  ConfigStore[key] = !ConfigStore[key]
}

export const toggleNsfw = () => {
  ConfigStore.nsfw = !ConfigStore.nsfw
}

export const pickValue = <K extends keyof ConfigStatePickableFields>(
  key: K,
  value: ConfigState[K]
) => {
  // Sorting by new on Reddit needs to be all
  if (key === "sort" && value === "new") ConfigStore.t = "all"
  ConfigStore[key] = value
}

export const toggleMenu = () => {
  ConfigStore.isMenuVisible = !ConfigStore.isMenuVisible
}
