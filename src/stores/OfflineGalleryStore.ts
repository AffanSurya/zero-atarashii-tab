import { proxy } from "valtio"

export type OfflineGalleryStore = {
  savedUrls: string[]
  storageUsedMB: number
  count: number
  maxItems: number
}

export const OfflineGalleryStore = proxy<OfflineGalleryStore>({
  savedUrls: [],
  storageUsedMB: 0,
  count: 0,
  maxItems: 10,
})

export const addToSavedUrls = (url: string) => {
  if (!OfflineGalleryStore.savedUrls.includes(url)) {
    OfflineGalleryStore.savedUrls.push(url)
    OfflineGalleryStore.count += 1
  }
}

export const removeFromSavedUrls = (url: string) => {
  OfflineGalleryStore.savedUrls = OfflineGalleryStore.savedUrls.filter((u) => u !== url)
  OfflineGalleryStore.count = OfflineGalleryStore.savedUrls.length
}

export const updateStorageInfo = (usedMB: number, count: number) => {
  OfflineGalleryStore.storageUsedMB = usedMB
  OfflineGalleryStore.count = count
  // sinkronisasi count
}
