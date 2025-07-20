import { SquareClient, SquareEnvironment } from 'square'

const environment = process.env.NODE_ENV === 'production' 
  ? SquareEnvironment.Production 
  : SquareEnvironment.Sandbox

const accessToken = process.env.NODE_ENV === 'production'
  ? process.env.SQUARE_ACCESS_TOKEN_PROD
  : process.env.SQUARE_ACCESS_TOKEN

const applicationId = process.env.NODE_ENV === 'production'
  ? process.env.SQUARE_APPLICATION_ID_PROD
  : process.env.SQUARE_APPLICATION_ID

if (!accessToken || !applicationId) {
  throw new Error('Square configuration missing. Please check your environment variables.')
}

export const squareClient = new SquareClient({
  accessToken,
  environment,
})

export const catalogApi = squareClient.catalog
export const ordersApi = squareClient.orders
export const paymentsApi = squareClient.payments
export const inventoryApi = squareClient.inventory
export const locationsApi = squareClient.locations

export const config = {
  applicationId,
  environment,
  locationId: process.env.NODE_ENV === 'production'
    ? process.env.SQUARE_LOCATION_ID_PROD
    : process.env.SQUARE_LOCATION_ID
}