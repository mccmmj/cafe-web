import { getScreenData } from '@/lib/kds/queries'
import { getAllPhotos } from '@/lib/kds/photos'
import { KDSDualPanelScreen } from '@/app/kds/components'

// Revalidate every 5 minutes
export const revalidate = 300

// Header images for food panel (matching cafe-menu-example)
const HEADER_IMAGES = {
  left: '/images/kds/header/muffins-plate.jpg',
  right: '/images/kds/header/pastries-plate.jpeg',
  // No subtitle logo for food panel
}

export default async function FoodDisplayPage() {
  const data = await getScreenData('food')
  const photos = getAllPhotos()

  return (
    <KDSDualPanelScreen
      data={data}
      panel="right"
      photos={photos}
      headerImages={HEADER_IMAGES}
    />
  )
}
