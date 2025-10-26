import { customersApi } from './client'
import { randomUUID } from 'crypto'

interface CustomerCard {
  id: string
  cardBrand: string
  last4: string
  expMonth: number
  expYear: number
  cardholderName?: string
}

interface CreateCustomerCardRequest {
  sourceId: string // Payment token from Square Web Payments SDK
  cardholderName?: string
  billingAddress?: {
    addressLine1?: string
    locality?: string
    administrativeDistrictLevel1?: string
    postalCode?: string
  }
}

export async function createSquareCustomer(email: string, fullName?: string): Promise<string> {
  try {
    // Temporarily disable customer creation until API method is verified
    throw new Error('Customer creation temporarily disabled')
    
    // const { result } = await customersApi.createCustomer({
    //   emailAddress: email,
    //   ...(fullName && { givenName: fullName.split(' ')[0], familyName: fullName.split(' ').slice(1).join(' ') })
    // })
    
    // if (!result.customer?.id) {
    //   throw new Error('Failed to create customer: No customer ID returned')
    // }
    
    // return result.customer.id
  } catch (error) {
    console.error('Error creating Square customer:', error)
    throw new Error('Failed to create customer')
  }
}

export async function getSquareCustomer(customerId: string) {
  try {
    // Temporarily disable until API method is verified
    throw new Error('Customer retrieval temporarily disabled')
    // const { result } = await customersApi.retrieveCustomer(customerId)
    // return result.customer
  } catch (error) {
    console.error('Error retrieving Square customer:', error)
    throw new Error('Failed to retrieve customer')
  }
}

export async function searchSquareCustomerByEmail(email: string): Promise<string | null> {
  // Temporarily disabled - return null for now
  return null
}

export async function saveCustomerCard(
  customerId: string, 
  cardRequest: CreateCustomerCardRequest
): Promise<string> {
  // Temporarily disabled - throw error for now
  throw new Error('Card saving temporarily disabled - Square Customer API integration pending')
}

export async function getCustomerCards(customerId: string): Promise<CustomerCard[]> {
  // Temporarily disabled - return empty array for now
  return []
}

export async function deleteCustomerCard(customerId: string, cardId: string): Promise<void> {
  // Temporarily disabled - throw error for now
  throw new Error('Card deletion temporarily disabled')
}

export async function findOrCreateCustomer(email: string, fullName?: string): Promise<string> {
  // Temporarily disabled - throw error for now
  throw new Error('Customer management temporarily disabled')
}