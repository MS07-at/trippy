import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const add = mutation({
  args: {
    destinationId: v.id("destinations"),
    name: v.string(),
    url: v.optional(v.string()),
    expectedPrice: v.number(),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    return await ctx.db.insert("apartments", {
      destinationId: args.destinationId,
      name: args.name,
      url: args.url,
      expectedPrice: args.expectedPrice,
      notes: args.notes,
      isSelected: false,
    });
  },
});

export const toggleSelected = mutation({
  args: {
    id: v.id("apartments"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const apt = await ctx.db.get(args.id);
    if (!apt) throw new Error("Not found");
    const dest = await ctx.db.get(apt.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { isSelected: !apt.isSelected });
  },
});

export const addImage = mutation({
  args: {
    id: v.id("apartments"),
    imageId: v.id("_storage"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const apt = await ctx.db.get(args.id);
    if (!apt) throw new Error("Not found");
    const dest = await ctx.db.get(apt.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const existing = apt.imageIds ?? [];
    await ctx.db.patch(args.id, { imageIds: [...existing, args.imageId] });
  },
});

export const removeImage = mutation({
  args: {
    id: v.id("apartments"),
    imageId: v.id("_storage"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const apt = await ctx.db.get(args.id);
    if (!apt) throw new Error("Not found");
    const dest = await ctx.db.get(apt.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const existing = apt.imageIds ?? [];
    await ctx.db.patch(args.id, {
      imageIds: existing.filter((id) => id !== args.imageId),
    });
    await ctx.storage.delete(args.imageId);
  },
});

export const update = mutation({
  args: {
    id: v.id("apartments"),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    expectedPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const apt = await ctx.db.get(args.id);
    if (!apt) throw new Error("Not found");
    const dest = await ctx.db.get(apt.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.url !== undefined) updates.url = args.url;
    if (args.expectedPrice !== undefined) updates.expectedPrice = args.expectedPrice;
    if (args.notes !== undefined) updates.notes = args.notes;
    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("apartments"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const apt = await ctx.db.get(args.id);
    if (!apt) throw new Error("Not found");
    const dest = await ctx.db.get(apt.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const votes = await ctx.db
      .query("apartmentVotes")
      .withIndex("by_apartment", (q) => q.eq("apartmentId", args.id))
      .collect();
    for (const v of votes) await ctx.db.delete(v._id);
    await ctx.db.delete(args.id);
  },
});
