import type { SiteSettings, SiteStatus } from '@/types/settings'

export const DEFAULT_SITE_STATUS: SiteStatus = {
  isCustomerAppLive: true,
  maintenanceTitle: "We're brewing something new!",
  maintenanceMessage: 'Our digital cafe is currently under construction. Check back soon for a fresh experience.',
  maintenanceCtaLabel: 'Visit our Contact Page',
  maintenanceCtaHref: '/contact'
}

export function mapSiteSettingsToStatus(record?: Partial<SiteSettings> | null): SiteStatus {
  if (!record) {
    return DEFAULT_SITE_STATUS
  }

  return {
    isCustomerAppLive: record.is_customer_app_live ?? DEFAULT_SITE_STATUS.isCustomerAppLive,
    maintenanceTitle: record.maintenance_title ?? DEFAULT_SITE_STATUS.maintenanceTitle,
    maintenanceMessage: record.maintenance_message ?? DEFAULT_SITE_STATUS.maintenanceMessage,
    maintenanceCtaLabel: record.maintenance_cta_label ?? DEFAULT_SITE_STATUS.maintenanceCtaLabel,
    maintenanceCtaHref: record.maintenance_cta_href ?? DEFAULT_SITE_STATUS.maintenanceCtaHref
  }
}
