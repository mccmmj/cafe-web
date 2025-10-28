export type SquareEnvironment = 'sandbox' | 'production'

export interface SquareTokenDetails {
  card?: {
    brand?: string
    last4?: string
  }
  billing?: unknown
  digital_wallet?: unknown
}

export interface SquareTokenResult {
  status: 'OK' | 'FAILED'
  token: string
  details?: SquareTokenDetails
  errors?: Array<{ message: string }>
}

export type SquareCardEventType = 'cardBrandChanged' | 'errorChanged' | 'postalCodeChanged'

export interface SquareCardEvent {
  cardBrand?: string
  errors?: Array<{ field: string; message: string }>
  postalCode?: string
}

export interface SquareCard {
  attach(selector: string): Promise<void>
  destroy(): void
  tokenize(): Promise<SquareTokenResult>
  addEventListener(type: SquareCardEventType, handler: (event: SquareCardEvent) => void): void
}

export interface SquarePayments {
  card(): Promise<SquareCard>
}

export type SquareWindow = Window & {
  Square?: {
    payments(
      applicationId: string,
      locationId: string,
      environment: SquareEnvironment
    ): Promise<SquarePayments>
  }
}
