import type { ImageData } from "../types/ImageData"

const DB_NAME = "atarashii-db"
const DB_VERSION = 1
const STORE_NAME = "wallpapers"

export type SavedWallpaper = {
  url: string
  blob: Blob
  meta: ImageData
  savedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveWallpaper(meta: ImageData): Promise<void> {
  const imageUrl = meta.backgroundUrl || meta.url
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const blob = await res.blob()

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).put({ url: imageUrl, blob, meta, savedAt: Date.now() })
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getWallpaper(url: string): Promise<SavedWallpaper | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).get(url)
    req.onsuccess = () => { db.close(); resolve(req.result ?? null) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function getAllWallpapers(): Promise<SavedWallpaper[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => { db.close(); resolve(req.result ?? []) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function deleteWallpaper(url: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).delete(url)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function isWallpaperSaved(url: string): Promise<boolean> {
  const result = await getWallpaper(url)
  return result !== null
}

export async function getStorageInfo(): Promise<{ count: number; usedMB: number }> {
  const all = await getAllWallpapers()
  const usedBytes = all.reduce((sum, w) => sum + w.blob.size, 0)
  return { count: all.length, usedMB: Math.round((usedBytes / 1024 / 1024) * 10) / 10 }
}
