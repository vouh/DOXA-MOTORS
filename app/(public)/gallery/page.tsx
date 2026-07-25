import type { Metadata } from 'next'
import { getPublicGallery } from '@/lib/data/queries'
import GalleryClient from '@/components/public/GalleryClient'

export const metadata: Metadata = {
  title: 'Gallery — Alubonets SHG',
}

export default async function GalleryPage() {
  const photos = await getPublicGallery()
  return (
    <main className="flex-grow">
      <GalleryClient photos={photos} />
    </main>
  )
}
