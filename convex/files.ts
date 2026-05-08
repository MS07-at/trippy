import { v } from "convex/values";
import { mutation, action } from "./_generated/server";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const storeFromUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const res = await fetch(args.url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const blob = await res.blob();
    const storageId = await ctx.storage.store(blob);
    return storageId;
  },
});
