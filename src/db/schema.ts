import { sql } from 'drizzle-orm'
import {
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    openid: text('openid').notNull(),
    nickname: text('nickname'),
    /** R2 object key for avatar (avatars/yyyy/mm/uuid.ext); not a public URL. */
    avatarUrl: text('avatar_url'),
    /** Optional; format-only validation (no SMS). */
    phone: text('phone'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('users_openid_uidx').on(table.openid)],
)

export type EncyclopediaStatus = 'published' | 'unpublished'

export const encyclopedias = pgTable(
  'encyclopedias',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    typeKey: text('type_key').notNull(),
    lng: doublePrecision('lng').notNull(),
    lat: doublePrecision('lat').notNull(),
    intro: text('intro').notNull(),
    address: text('address'),
    businessHours: text('business_hours'),
    avgPrice: text('avg_price'),
    phone: text('phone'),
    status: text('status').$type<EncyclopediaStatus>().notNull(),
    images: jsonb('images')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    tags: jsonb('tags')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('encyclopedias_status_idx').on(table.status),
    index('encyclopedias_updated_at_idx').on(table.updatedAt),
  ],
)

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    encyclopediaId: uuid('encyclopedia_id')
      .notNull()
      .references(() => encyclopedias.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('favorites_user_encyclopedia_uidx').on(
      table.userId,
      table.encyclopediaId,
    ),
    index('favorites_user_created_idx').on(table.userId, table.createdAt),
  ],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Encyclopedia = typeof encyclopedias.$inferSelect
export type NewEncyclopedia = typeof encyclopedias.$inferInsert
export type Favorite = typeof favorites.$inferSelect
export type NewFavorite = typeof favorites.$inferInsert
