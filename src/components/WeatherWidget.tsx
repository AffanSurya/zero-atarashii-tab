import { useEffect, useState } from "react"
import { useSnapshot } from "valtio"
import {
  WeatherStore,
  WEATHER_CODE_MAP,
  fetchWeather,
  fetchLocationName,
  isWeatherCacheValid,
} from "../stores/WeatherStore"
import "./styles/WeatherWidget.scss"

type Status = "idle" | "requesting" | "loading" | "loaded" | "denied" | "error"

export default function WeatherWidget() {
  const weather = useSnapshot(WeatherStore)
  const [status, setStatus] = useState<Status>(() => {
    if (WeatherStore.permissionDenied) return "denied"
    if (isWeatherCacheValid()) return "loaded"
    if (WeatherStore.lat !== null) return "loading"
    return "idle"
  })

  // Auto-load jika sudah ada koordinat dan cache habis
  useEffect(() => {
    if (
      status === "loading" &&
      WeatherStore.lat !== null &&
      WeatherStore.lon !== null
    ) {
      loadWeather(WeatherStore.lat, WeatherStore.lon)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadWeather = async (lat: number, lon: number) => {
    setStatus("loading")
    const [data, name] = await Promise.all([
      fetchWeather(lat, lon),
      WeatherStore.locationName
        ? Promise.resolve(WeatherStore.locationName)
        : fetchLocationName(lat, lon),
    ])

    if (!data) {
      WeatherStore.error = true
      setStatus("error")
      return
    }

    WeatherStore.data = data
    WeatherStore.lastUpdated = Date.now()
    WeatherStore.locationName = name
    WeatherStore.error = false
    setStatus("loaded")
  }

  const requestLocation = () => {
    setStatus("requesting")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        WeatherStore.lat = lat
        WeatherStore.lon = lon
        WeatherStore.permissionDenied = false
        await loadWeather(lat, lon)
      },
      () => {
        WeatherStore.permissionDenied = true
        setStatus("denied")
      },
      { timeout: 10000 }
    )
  }

  const weatherInfo = weather.data
    ? WEATHER_CODE_MAP[weather.data.weatherCode] ?? { emoji: "🌡️", label: "Unknown" }
    : null

  if (status === "idle") {
    return (
      <button className="weather-widget weather-widget--btn" onClick={requestLocation}>
        🌤️ Enable weather
      </button>
    )
  }

  if (status === "requesting" || status === "loading") {
    return (
      <div className="weather-widget weather-widget--loading">
        <span className="weather-spinner" /> Fetching weather…
      </div>
    )
  }

  if (status === "denied") {
    return (
      <div className="weather-widget weather-widget--denied">
        📍 Location unavailable
      </div>
    )
  }

  if (status === "error" || !weatherInfo || !weather.data) {
    return (
      <button className="weather-widget weather-widget--btn" onClick={requestLocation}>
        ⚠️ Retry weather
      </button>
    )
  }

  return (
    <div className="weather-widget weather-widget--loaded" title={weatherInfo.label}>
      <span className="weather-emoji">{weatherInfo.emoji}</span>
      <span className="weather-temp">
        {weather.data.temperature}{weather.data.unit}
      </span>
      {weather.locationName && (
        <span className="weather-location">{weather.locationName}</span>
      )}
    </div>
  )
}
