import { localDb } from '@/lib/localDb'

// Category abbreviation map — covers all store categories
const CATEGORY_PREFIXES: Record<string, string> = {
  'electronics':           'EL',
  'plumbing':              'PL',
  'building materials':    'BM',
  'building':              'BM',
  'household':             'HH',
  'mechanical & welding':  'MW',
  'mechanical':            'MW',
  'welding':               'MW',
  'other':                 'OT',
  'general':               'GN',
  'tools':                 'TL',
  'electrical':            'EC',
  'paint':                 'PT',
  'furniture':             'FN',
  'food':                  'FD',
  'clothing':              'CL',
  'automotive':            'AU',
  'garden':                'GD',
  'cleaning':              'CN',
  'office':                'OF',
}

/**
 * Gets a 2-letter prefix from a category name.
 * - First checks the known map
 * - Falls back to first 2 letters of the category name
 */
function getCategoryPrefix(categoryName: string): string {
  const key = categoryName.toLowerCase().trim()

  // Check exact match first
  if (CATEGORY_PREFIXES[key]) return CATEGORY_PREFIXES[key]

  // Check if any known key is contained in the category name
  for (const [pattern, prefix] of Object.entries(CATEGORY_PREFIXES)) {
    if (key.includes(pattern)) return prefix
  }

  // Fallback: first 2 letters of category name, uppercase
  return categoryName.replace(/\s+/g, '').slice(0, 2).toUpperCase()
}

/**
 * Gets a 2-letter prefix from a product name (used when no category).
 * Uses consonants from the name for better readability.
 */
function getNamePrefix(productName: string): string {
  const clean = productName.replace(/[^a-zA-Z]/g, '').toUpperCase()
  if (clean.length < 2) return 'PR'

  // Take first letter + first consonant after it
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'
  const first = clean[0]
  const rest = clean.slice(1).split('').find(c => consonants.includes(c)) ?? clean[1]
  return (first + rest).slice(0, 2)
}

/**
 * Main code generator.
 *
 * Steps:
 * 1. Determine prefix (from category or product name)
 * 2. Count existing products with same prefix in local DB
 * 3. Return PREFIX-NNN (e.g. EL-007)
 */
export async function generateProductCode(
  productName: string,
  categoryId: string | null,
  categoryName: string | null
): Promise<string> {
  let prefix: string

  if (categoryName) {
    prefix = getCategoryPrefix(categoryName)
  } else if (productName.trim().length >= 2) {
    prefix = getNamePrefix(productName)
  } else {
    prefix = 'PR'
  }

  // Count how many products already use this prefix
  const allProducts = await localDb.products.toArray()
  const existingWithPrefix = allProducts.filter(p =>
    p.code.toUpperCase().startsWith(prefix + '-')
  )

  // Find the highest sequence number used
  let maxNum = 0
  for (const p of existingWithPrefix) {
    const parts = p.code.split('-')
    const num = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(num) && num > maxNum) maxNum = num
  }

  const nextNum = maxNum + 1
  const sequence = String(nextNum).padStart(3, '0')

  return `${prefix}-${sequence}`
}
