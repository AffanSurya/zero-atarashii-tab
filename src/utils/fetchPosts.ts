import type { ConfigState } from "../stores/ConfigStore"
import { WALLPAPER_SOURCES } from "../stores/ConfigStore"
import type { RedditPost } from "../stores/HistoryStore"

type RedditSearchResponse = {
  data: {
    after: string | null
    children: Array<{
      data: RedditPost & {
        thumbnail?: string
        over_18?: boolean
        post_hint?: string
        link_flair_text?: string
      }
    }>
  }
}

export function isMobilePost(
  post: RedditPost & { link_flair_text?: string }
): boolean {
  if (post.link_flair_text) {
    const flair = post.link_flair_text.toLowerCase()
    if (flair.includes("mobile") || flair.includes("phone")) {
      return true
    }
    if (flair.includes("desktop")) {
      return false
    }
  }

  const source = post.preview?.images?.[0]?.source
  if (source?.width && source?.height) {
    return source.width / source.height < 1.15
  }

  const resMatch = post.title.match(/(\d{3,5})\s*[*x×]\s*(\d{3,5})/)
  if (resMatch) {
    const w = parseInt(resMatch[1], 10)
    const h = parseInt(resMatch[2], 10)
    if (w && h) {
      return w / h < 1.15
    }
  }

  return false
}

export function isLandscapePost(
  post: RedditPost & { link_flair_text?: string }
): boolean {
  return !isMobilePost(post)
}

async function fetchFromSubreddit(
  subreddit: string,
  config: ConfigState
): Promise<Array<RedditPost & { thumbnail?: string; over_18?: boolean; link_flair_text?: string }>> {
  let posts: Array<RedditPost & { thumbnail?: string; over_18?: boolean; link_flair_text?: string }> = []
  const isAnimewallpaper = subreddit.toLowerCase() === "animewallpaper"

  // Tentukan query flair berdasarkan orientasi yang dipilih
  let flairQuery = ""
  if (config.orientation === "desktop") {
    flairQuery = 'flair:"Desktop"'
  } else if (config.orientation === "mobile") {
    flairQuery = 'flair:"Mobile"'
  }

  // 1. Jika Animewallpaper dan ada query flair spesifik (desktop atau mobile), gunakan search.json
  if (isAnimewallpaper && flairQuery) {
    try {
      const query = new URLSearchParams({
        q: flairQuery,
        sort: config.sort.toString(),
        t: config.t.toString(),
        show: "all",
        restrict_sr: "1",
        limit: "100",
        include_over_18: config.nsfw ? "on" : "off",
      })

      const res = await fetch(
        `https://www.reddit.com/r/${subreddit}/search.json?${query}`,
        { headers: { Accept: "application/json" } }
      )
      if (res.ok) {
        const json = (await res.json()) as RedditSearchResponse
        if (json.data?.children?.length) {
          posts = json.data.children.map((child) => child.data)
        }
      }
    } catch {
      // Fallback ke listing di bawah jika search gagal
    }
  }

  // 2. Listing direct endpoint (top / hot / new) - untuk mode 'all' atau fallback jika search gagal
  if (posts.length === 0) {
    try {
      const sort = config.sort === "relevance" ? "top" : config.sort
      const query = new URLSearchParams({
        t: config.t.toString(),
        limit: "100",
        include_over_18: config.nsfw ? "on" : "off",
      })

      const res = await fetch(
        `https://www.reddit.com/r/${subreddit}/${sort}.json?${query}`,
        { headers: { Accept: "application/json" } }
      )
      if (res.ok) {
        const json = (await res.json()) as RedditSearchResponse
        if (json.data?.children?.length) {
          posts = json.data.children.map((child) => child.data)
        }
      }
    } catch {
      // Abaikan error dan lanjut ke fallback hot
    }
  }

  // 3. Fallback hot.json jika listing menghasilkan 0 posts
  if (posts.length === 0) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=100&include_over_18=${config.nsfw ? "on" : "off"}`,
        { headers: { Accept: "application/json" } }
      )
      if (res.ok) {
        const json = (await res.json()) as RedditSearchResponse
        if (json.data?.children?.length) {
          posts = json.data.children.map((child) => child.data)
        }
      }
    } catch {
      // Reddit unreachable
    }
  }

  return posts
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function fetchPosts(config: ConfigState) {
  const activeSources = WALLPAPER_SOURCES.filter((s) =>
    config.sources.includes(s.id)
  )

  // Fallback jika tidak ada source aktif
  const sources =
    activeSources.length > 0 ? activeSources : [WALLPAPER_SOURCES[0]]

  // Fetch semua subreddit secara paralel
  const results = await Promise.allSettled(
    sources.map((s) => fetchFromSubreddit(s.subreddit, config))
  )

  let posts: Array<RedditPost & { thumbnail?: string; over_18?: boolean; link_flair_text?: string }> = results
    .filter(
      (r): r is PromiseFulfilledResult<Array<RedditPost & { thumbnail?: string; over_18?: boolean; link_flair_text?: string }>> =>
        r.status === "fulfilled"
    )
    .flatMap((r) => r.value)

  // Filter NSFW
  if (config.nsfw) {
    posts = posts.filter((e) => e.thumbnail === "nsfw" || e.over_18)
  } else {
    posts = posts.filter((e) => e.thumbnail !== "nsfw" && !e.over_18)
  }

  // Normalisasi & pastikan ada URL gambar yang valid
  posts = posts
    .map((post) => {
      let finalUrl = post.url
      // Jika URL bukan i.redd.it tapi punya preview image, gunakan source image
      if (
        !finalUrl.includes("i.redd.it") &&
        post.preview?.images?.[0]?.source?.url
      ) {
        finalUrl = post.preview.images[0].source.url.replace(/&amp;/g, "&")
      }
      return { ...post, url: finalUrl }
    })
    .filter(
      (e) =>
        e.url.includes("i.redd.it") ||
        e.url.includes("preview.redd.it") ||
        /\.(jpe?g|png|webp)($|\?)/i.test(e.url)
    )

  // Filter berdasarkan orientasi yang dipilih jika spesifik
  if (config.orientation === "desktop") {
    posts = posts.filter((p) => !isMobilePost(p))
  } else if (config.orientation === "mobile") {
    posts = posts.filter((p) => isMobilePost(p))
  }

  // Deduplicate berdasarkan id
  const seen = new Set<string>()
  posts = posts.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  // Shuffle agar tidak selalu subreddit yang sama di awal
  return shuffle(posts)
}
