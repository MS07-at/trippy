import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const add = mutation({
  args: {
    destinationId: v.id("destinations"),
    mode: v.union(v.literal("flight"), v.literal("train"), v.literal("car")),
    expectedCost: v.number(),
    notes: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.userId !== args.userId) {
      throw new Error("Not authorized");
    }
    return await ctx.db.insert("travelOptions", {
      destinationId: args.destinationId,
      mode: args.mode,
      expectedCost: args.expectedCost,
      notes: args.notes,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("travelOptions"),
    mode: v.optional(
      v.union(v.literal("flight"), v.literal("train"), v.literal("car")),
    ),
    expectedCost: v.optional(v.number()),
    notes: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.id);
    if (!option) throw new Error("Not found");
    const dest = await ctx.db.get(option.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.userId !== args.userId) {
      throw new Error("Not authorized");
    }
    const updates: Record<string, unknown> = {};
    if (args.mode !== undefined) updates.mode = args.mode;
    if (args.expectedCost !== undefined) updates.expectedCost = args.expectedCost;
    if (args.notes !== undefined) updates.notes = args.notes;
    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("travelOptions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.id);
    if (!option) throw new Error("Not found");
    const dest = await ctx.db.get(option.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.userId !== args.userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.id);
  },
});
