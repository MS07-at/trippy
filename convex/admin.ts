import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";

async function getAdminByToken(ctx: QueryCtx | MutationCtx, token: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!user || !user.admin) return null;
  return user;
}

export const listUsers = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const admin = await getAdminByToken(ctx, args.token);
    if (!admin) return null;
    const users = await ctx.db.query("users").collect();
    return users
      .map((u) => ({
        id: u._id,
        username: u.username,
        admin: u.admin ?? false,
        createdAt: u._creationTime,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
  },
});

export const listVacationsForUser = query({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await getAdminByToken(ctx, args.token);
    if (!admin) return null;
    const all = await ctx.db.query("vacations").collect();
    return all
      .filter((vac) => vac.userId === args.userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((vac) => ({ id: vac._id, name: vac.name, slug: vac.slug }));
  },
});

export const setAdmin = mutation({
  args: { token: v.string(), userId: v.id("users"), admin: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await getAdminByToken(ctx, args.token);
    if (!admin) {
      throw new ConvexError("Not authorized");
    }
    if (admin._id === args.userId && !args.admin) {
      throw new ConvexError("Du kannst dir selbst nicht die Admin-Rechte entziehen");
    }
    await ctx.db.patch(args.userId, { admin: args.admin });
  },
});

// Bootstrap the first admin from the CLI:
//   npx convex run admin:makeAdmin '{"username": "<name>"}'
export const makeAdmin = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (!user) {
      throw new ConvexError("User not found");
    }
    await ctx.db.patch(user._id, { admin: true });
  },
});
