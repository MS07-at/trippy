import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { nanoid } from "nanoid";

export const isRegistrationEnabled = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "registration_enabled"))
      .unique();
    return setting ? setting.value === "true" : true;
  },
});

export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "registration_enabled"))
      .unique();
    if (setting && setting.value !== "true") {
      throw new ConvexError("Registration is currently disabled");
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (existing) {
      throw new ConvexError("Username already taken");
    }
    const token = nanoid(21);
    const id = await ctx.db.insert("users", {
      username: args.username,
      password: args.password,
      token,
    });
    return { id, username: args.username, token };
  },
});

export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (!user || user.password !== args.password) {
      throw new ConvexError("Invalid username or password");
    }
    return { id: user._id, username: user.username, token: user.token };
  },
});

export const setRegistrationEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "registration_enabled"))
      .unique();
    if (setting) {
      await ctx.db.patch(setting._id, { value: String(args.enabled) });
    } else {
      await ctx.db.insert("settings", {
        key: "registration_enabled",
        value: String(args.enabled),
      });
    }
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!user) return null;
    return { id: user._id, username: user.username, token: user.token };
  },
});
