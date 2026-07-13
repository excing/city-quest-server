import encyclopediaTypes from '../config/encyclopedia-types.json'

export interface EncyclopediaType {
  key: string
  name: string
  color: string
}

export const ENCYCLOPEDIA_TYPES: readonly EncyclopediaType[] =
  encyclopediaTypes as EncyclopediaType[]

const typeKeySet = new Set(ENCYCLOPEDIA_TYPES.map((t) => t.key))

export function isValidTypeKey(typeKey: string): boolean {
  return typeKeySet.has(typeKey)
}

export function findTypeByKey(typeKey: string): EncyclopediaType | undefined {
  return ENCYCLOPEDIA_TYPES.find((t) => t.key === typeKey)
}

export function getEncyclopediaTypes(): EncyclopediaType[] {
  return ENCYCLOPEDIA_TYPES.map((t) => ({ ...t }))
}
