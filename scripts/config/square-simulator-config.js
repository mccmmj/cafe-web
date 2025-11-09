/**
 * Square Sandbox Sales Simulator Configuration
 *
 * Define which Square catalog items the simulator can sell and how those
 * transactions should affect internal inventory.
 *
 * Populate the relevant environment variables in `.env.local` or
 * `ENV_SANDBOX` so these IDs stay consistent with the Square sandbox catalog.
 */

const simulatorConfig = {
  /**
   * Default Square location to create orders against. Override at runtime with
   * `--location <id>` if you need to target a different sandbox location.
   */
  locationId: process.env.SQUARE_LOCATION_ID || '',

  /**
   * Currency to use for simulated payments.
   */
  currency: 'USD',

  /**
    * Catalog items the simulator can sell.
    *
    * Each entry maps to an item variation in the Square catalog. The
    * `inventoryImpact` flag tells downstream systems whether the sale should
    * decrement on-hand inventory automatically (`auto`) or require a manual
    * ingredient adjustment (`manual`).
    */
  items: [
    {
      key: 'latte_tall',
      name: 'Cafe Latte (Tall)',
      variationId: process.env.SQUARE_ITEM_CAFFE_LATTE_TALL_ID || '',
      category: 'prepared-drink',
      inventoryImpact: 'manual', // prepared beverages require manual ingredient handling
      defaultQuantityRange: [8, 18]
    },
    {
      key: 'latte_grande',
      name: 'Cafe Latte (Grande)',
      variationId: process.env.SQUARE_ITEM_CAFFE_LATTE_GRANDE_ID || '',
      category: 'prepared-drink',
      inventoryImpact: 'manual',
      defaultQuantityRange: [6, 14]
    },
    {
      key: 'breakfast_burrito_bacon',
      name: 'Breakfast Burrito (Bacon)',
      variationId: process.env.SQUARE_ITEM_BREAKFAST_BURRITO_BACON_ID || '',
      category: 'pre-prepared-food',
      inventoryImpact: 'auto',
      defaultQuantityRange: [2, 6]
    },
    {
      key: 'granola_bar',
      name: 'House Granola Bar',
      variationId: process.env.SQUARE_ITEM_GRANOLA_BAR_REGULAR_ID || '',
      category: 'prepackaged-goods',
      inventoryImpact: 'auto',
      defaultQuantityRange: [1, 4]
    },
    {
      key: 'blueberry_muffin',
      name: 'Blueberry Muffin',
      variationId: process.env.SQUARE_ITEM_BLUEBERRY_MUFFIN_REGULAR_ID || '',
      category: 'prepackaged-goods',
      inventoryImpact: 'auto',
      defaultQuantityRange: [1, 4]
    }
  ],

  /**
   * High-level scenarios that decide which items to sell and the cadence to
   * apply. Scripts can choose one of these presets via CLI flags.
   */
  scenarios: {
    morningRush: {
      label: 'Morning Rush',
      description: 'High espresso drink volume with light food attachments.',
      mix: {
        latte_tall: 0.25,
        latte_grande: 0.25,
        breakfast_burrito_bacon: 0.2,
        granola_bar: 0.1,
        blueberry_muffin: 0.2
      }
    },
    lunchWave: {
      label: 'Lunch Wave',
      description: 'Balanced beverage and food orders.',
      mix: {
        latte_tall: 0.25,
        latte_grande: 0.2,
        breakfast_burrito_bacon: 0.25,
        granola_bar: 0.2,
        blueberry_muffin: 0.1
      }
    },
    weekendTreats: {
      label: 'Weekend Treats',
      description: 'Lower drink demand but higher packaged goods.',
      mix: {
        latte_tall: 0.2,
        latte_grande: 0.2,
        breakfast_burrito_bacon: 0.25,
        granola_bar: 0.25,
        blueberry_muffin: 0.1
      }
    }
  }
}

/**
 * Ensure required IDs are present before attempting to call Square APIs.
 */
function validateSimulatorConfig(config = simulatorConfig) {
  const missing = []

  if (!config.locationId) {
    missing.push('SQUARE_LOCATION_ID')
  }

  config.items.forEach(item => {
    if (!item.variationId) {
      missing.push(`variationId for ${item.key} (set SQUARE_ITEM_* env var)`)
    }
  })

  return missing
}

module.exports = {
  simulatorConfig,
  validateSimulatorConfig
}
