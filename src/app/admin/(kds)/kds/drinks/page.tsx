import { getScreenData } from '@/lib/kds/queries'
import { getAllPhotos } from '@/lib/kds/photos'
import { KDSDualPanelScreen } from '@/app/kds/components'

// Revalidate every 5 minutes
export const revalidate = 300

// Header images for drinks panel (matching cafe-menu-example)
const HEADER_IMAGES = {
  left: '/images/kds/header/espresso.jpeg',
  right: '/images/kds/header/croissant.jpg',
  subtitleLogo: '/images/kds/header/starbucks-logo.png',
}

export default async function DrinksDisplayPage() {
  const data = await getScreenData('drinks')
  const photos = getAllPhotos()

  return (
    <KDSDualPanelScreen
      data={data}
      panel="left"
      photos={photos}
      headerImages={HEADER_IMAGES}
    />
  )
}
