import type { ConfigState } from "../stores/ConfigStore"
import { WALLPAPER_SOURCES } from "../stores/ConfigStore"
import type { RedditPost } from "../stores/HistoryStore"

type RedditSearchResponse = {
  data: {
    after: string | null
    children: Array<{ data: RedditPost & { thumbnail?: string } }>
  }
}

async function fetchFromSubreddit(
  subreddit: string,
  config: ConfigState
): Promise<Array<RedditPost & { thumbnail?: string }>> {
  let posts: Array<RedditPost & { thumbnail?: string }> = []
  let after: string | null = null

  // Fetch hingga 100 posts per subreddit (dari sebelumnya 200 di single source)
  while (posts.length < 100) {
    const query = new URLSearchParams({
      q: config.q.toString(),
      sort: config.sort.toString(),
      t: config.t.toString(),
      show: "all",
      restrict_sr: "1",
      include_over_18: config.nsfw ? "on" : "off",
    })
    if (after) query.set("after", after)

    try {
      const res = await fetch(
        `https://www.reddit.com/r/${subreddit}/search.json?${query}`
      )
      if (!res.ok) break
      const json = (await res.json()) as RedditSearchResponse

      posts = posts.concat(json.data.children.map((child) => child.data))
      after = json.data.after
      if (!after) break
    } catch {
      break
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
    activeSources.length > 0
      ? activeSources
      : [WALLPAPER_SOURCES[0]]

  // Fetch semua subreddit secara paralel
  const results = await Promise.allSettled(
    sources.map((s) => fetchFromSubreddit(s.subreddit, config))
  )

  let posts: Array<RedditPost & { thumbnail?: string }> = results
    .filter(
      (r): r is PromiseFulfilledResult<Array<RedditPost & { thumbnail?: string }>> =>
        r.status === "fulfilled"
    )
    .flatMap((r) => r.value)

  // Filter NSFW
  if (config.nsfw) posts = posts.filter((e) => e.thumbnail === "nsfw")

  // Filter hanya gambar dari i.redd.it
  posts = posts.filter((e) => e.url.includes("i.redd.it"))

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
