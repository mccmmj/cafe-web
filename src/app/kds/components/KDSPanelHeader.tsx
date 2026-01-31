'use client'

interface KDSPanelHeaderProps {
  cafeName: string
  subtitle?: string
  subtitleLogo?: string // Optional logo image to display before subtitle text
  leftImage?: string // Product image for left side
  rightImage?: string // Product image for right side
  location?: string
  hours?: string
}

/**
 * Panel header matching cafe-menu-example design.
 * Layout: [left product image] | [centered title + subtitle] | [right product image]
 * Bottom row: location left, hours right
 */
export default function KDSPanelHeader({
  cafeName,
  subtitle,
  subtitleLogo,
  leftImage,
  rightImage,
  location,
  hours,
}: KDSPanelHeaderProps) {
  return (
    <div className="kds-panel-header">
      {/* Main banner row with images and centered text */}
      <div className="kds-panel-header-main">
        {/* Left product image */}
        <div className="kds-panel-header-image kds-panel-header-image-left">
          {leftImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={leftImage}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
        </div>

        {/* Centered title and subtitle */}
        <div className="kds-panel-header-center">
          <h1 className="kds-panel-logo">{cafeName}</h1>
          {subtitle && (
            <p className="kds-panel-subtitle">
              {subtitleLogo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={subtitleLogo}
                  alt=""
                  className="kds-panel-subtitle-logo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
              <span>{subtitle}</span>
            </p>
          )}
        </div>

        {/* Right product image */}
        <div className="kds-panel-header-image kds-panel-header-image-right">
          {rightImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rightImage}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom row: location left, hours right */}
      {(location || hours) && (
        <div className="kds-panel-header-bottom">
          <span className="kds-panel-location">{location || ''}</span>
          <span className="kds-panel-hours">{hours || ''}</span>
        </div>
      )}
    </div>
  )
}
