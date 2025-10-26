import { SquareClient, SquareEnvironment } from 'square'

const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? SquareEnvironment.Production 
  : SquareEnvironment.Sandbox

const accessToken = process.env.SQUARE_ACCESS_TOKEN
const applicationId = process.env.SQUARE_APPLICATION_ID

if (!accessToken || !applicationId) {
  throw new Error('Square configuration missing. Please check your environment variables.')
}

export const squareClient = new SquareClient({
  token: accessToken,
  environment,
})

export const catalogApi = squareClient.catalog
export const ordersApi = squareClient.orders
export const paymentsApi = squareClient.payments
export const inventoryApi = squareClient.inventory
export const locationsApi = squareClient.locations
export const customersApi = squareClient.customers

export const config = {
  applicationId,
  environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
  locationId: process.env.SQUARE_LOCATION_ID
}