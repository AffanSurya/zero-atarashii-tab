import { persist } from "valtio-persist"

export type WeatherData = {
  temperature: number
  weatherCode: number
  windspeed: number
  unit: string
}

export type WeatherState = {
  data: WeatherData | null
  lastUpdated: number
  locationName: string
  lat: number | null
  lon: number | null
  permissionDenied: boolean
  error: boolean
}

export const { store: WeatherStore } = await persist<WeatherState>(
  {
    data: null,
    lastUpdated: -1,
    locationName: "",
    lat: null,
    lon: null,
    permissionDenied: false,
    error: false,
  },
  "weather"
)

// WMO Weather Code → emoji + label
export const WEATHER_CODE_MAP: Record<number, { emoji: string; label: string }> = {
  0:  { emoji: "☀️",  label: "Clear sky" },
  1:  { emoji: "🌤️", label: "Mainly clear" },
  2:  { emoji: "⛅",  label: "Partly cloudy" },
  3:  { emoji: "☁️",  label: "Overcast" },
  45: { emoji: "🌫️", label: "Foggy" },
  48: { emoji: "🌫️", label: "Icy fog" },
  51: { emoji: "🌦️", label: "Light drizzle" },
  53: { emoji: "🌦️", label: "Drizzle" },
  55: { emoji: "🌧️", label: "Heavy drizzle" },
  61: { emoji: "🌧️", label: "Slight rain" },
  63: { emoji: "🌧️", label: "Moderate rain" },
  65: { emoji: "🌧️", label: "Heavy rain" },
  71: { emoji: "❄️",  label: "Slight snow" },
  73: { emoji: "❄️",  label: "Moderate snow" },
  75: { emoji: "❄️",  label: "Heavy snow" },
  77: { emoji: "🌨️", label: "Snow grains" },
  80: { emoji: "🌦️", label: "Slight showers" },
  81: { emoji: "🌧️", label: "Moderate showers" },
  82: { emoji: "⛈️", label: "Violent showers" },
  85: { emoji: "🌨️", label: "Snow showers" },
  86: { emoji: "🌨️", label: "Heavy snow showers" },
  95: { emoji: "⛈️", label: "Thunderstorm" },
  96: { emoji: "⛈️", label: "Thunderstorm w/ hail" },
  99: { emoji: "⛈️", label: "Heavy thunderstorm" },
}

const CACHE_DURATION_MS = 30 * 60 * 1000 // 30 menit

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=celsius`
    )
    if (!res.ok) return null
    const json = await res.json()
    const current = json.current
    return {
      temperature: Math.round(current.temperature_2m),
      weatherCode: current.weathercode,
      windspeed: Math.round(current.windspeed_10m),
      unit: "°C",
    }
  } catch {
    return null
  }
}

export async function fetchLocationName(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&count=1`
    )
    if (!res.ok) return ""
    const json = await res.json()
    return json.results?.[0]?.name || ""
  } catch {
    return ""
  }
}

export function isWeatherCacheValid(): boolean {
  return (
    WeatherStore.lastUpdated !== -1 &&
    Date.now() - WeatherStore.lastUpdated < CACHE_DURATION_MS &&
    WeatherStore.data !== null
  )
}
