import Link from 'next/link'

type Props = {
  profileUsername: string
  postCount: number
  followerCount: number
  followingCount: number
}

export default function ProfileStats({ profileUsername, postCount, followerCount, followingCount }: Props) {
  return (
    <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#0F2240]/50">
      <span>
        <span className="font-semibold text-[#0F2240]">{postCount}</span> Posts
      </span>
      <span className="select-none">·</span>
      <Link href={`/${profileUsername}/followers`} className="hover:text-[#0F2240] transition-colors">
        <span className="font-semibold text-[#0F2240]">{followerCount}</span> Followers
      </Link>
      <span className="select-none">·</span>
      <Link href={`/${profileUsername}/following`} className="hover:text-[#0F2240] transition-colors">
        <span className="font-semibold text-[#0F2240]">{followingCount}</span> Following
      </Link>
    </div>
  )
}
