import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    state: text("state").notNull(),
    revision: integer("revision").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_workspaces_user_updated").on(t.userId, t.updatedAt)],
);
export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    objectKey: text("object_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [index("idx_files_workspace_user").on(t.workspaceId, t.userId)],
);
