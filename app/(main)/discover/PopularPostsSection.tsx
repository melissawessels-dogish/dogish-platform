import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'

type Post = {
  id: string
  images: string[]
  like_count: number | null
}

export default function PopularPostsSection({ posts }: { posts: Post[] }) {
  const withImages = posts.filter((p) => p.images?.[0])

  if (withImages.length === 0) return null

  return (
    <section className="mb-7">
      <h2 className="px-4 mb-3 text-[11px] font-semibold tracking-widest uppercase text-[#0F2240]/40">
        Popular posts
      </h2>
      <div className="grid grid-cols-3 gap-px">
        {withImages.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className="relative block aspect-[4/5] group overflow-hidden bg-[#EDE3D6]">
            <Image
              src={post.images[0]}
              alt=""
              fill
              className="object-cover group-hover:opacity-90 transition-opacity"
            />
            {post.like_count != null && post.like_count > 0 && (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center gap-1">
                <Heart size={14} className="fill-white stroke-white" />
                <span className="text-white text-xs font-semibold">{post.like_count}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
