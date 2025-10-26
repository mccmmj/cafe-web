import { Toaster } from 'react-hot-toast'
import UnderConstruction from '@/components/maintenance/UnderConstruction'
import { getSiteStatusUsingServiceClient } from '@/lib/services/siteSettings'
import DynamicSquareProvider from '@/components/providers/DynamicSquareProvider'
import { CartModalProvider } from '@/providers/CartProvider'
import UserOnboarding from '@/components/onboarding/UserOnboarding'
import GlobalCartModal from '@/components/cart/GlobalCartModal'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({
  children
}: {
  children: React.ReactNode
}) {
  const status = await getSiteStatusUsingServiceClient()

  if (!status.isCustomerAppLive) {
    return (
      <div className="min-h-screen bg-white">
        <UnderConstruction status={status} />
      </div>
    )
  }

  return (
    <DynamicSquareProvider>
      <CartModalProvider>
        <div className="min-h-screen bg-white">
          {children}
          <UserOnboarding />
          <GlobalCartModal />
          <Toaster />
        </div>
      </CartModalProvider>
    </DynamicSquareProvider>
  )
}
