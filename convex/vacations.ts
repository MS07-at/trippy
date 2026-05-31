import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { nanoid } from "nanoid";

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vacations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("vacations").collect();
    return all.filter((v) => v.userId === args.userId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    nights: v.optional(v.number()),
    people: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const slug = nanoid(10);
    const id = await ctx.db.insert("vacations", {
      name: args.name,
      description: args.description,
      slug,
      userId: args.userId,
      nights: args.nights,
      people: args.people,
      createdAt: Date.now(),
    });
    return { id, slug };
  },
});

export const togglePublicEdit = mutation({
  args: {
    id: v.id("vacations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const vacation = await ctx.db.get(args.id);
    if (!vacation || vacation.userId !== args.userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { publicEdit: !vacation.publicEdit });
  },
});

export const update = mutation({
  args: {
    id: v.id("vacations"),
    userId: v.optional(v.id("users")),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    nights: v.optional(v.number()),
    people: v.optional(v.number()),
    originAirport: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vacation = await ctx.db.get(args.id);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const updates: Record<string, string | number> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.nights !== undefined) updates.nights = args.nights;
    if (args.people !== undefined) updates.people = args.people;
    if (args.originAirport !== undefined) updates.originAirport = args.originAirport;
    await ctx.db.patch(args.id, updates);
  },
});

export const remove = mutation({
  args: {
    id: v.id("vacations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const vacation = await ctx.db.get(args.id);
    if (!vacation || vacation.userId !== args.userId) {
      throw new Error("Not authorized");
    }
    // Delete all related data
    const destinations = await ctx.db
      .query("destinations")
      .withIndex("by_vacation", (q) => q.eq("vacationId", args.id))
      .collect();
    for (const dest of destinations) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
        .collect();
      for (const vote of votes) await ctx.db.delete(vote._id);

      const travel = await ctx.db
        .query("travelOptions")
        .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
        .collect();
      for (const t of travel) {
        const tVotes = await ctx.db
          .query("travelOptionVotes")
          .withIndex("by_travel_option", (q) => q.eq("travelOptionId", t._id))
          .collect();
        for (const tv of tVotes) await ctx.db.delete(tv._id);
        await ctx.db.delete(t._id);
      }

      const apartments = await ctx.db
        .query("apartments")
        .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
        .collect();
      for (const a of apartments) await ctx.db.delete(a._id);

      const activities = await ctx.db
        .query("activities")
        .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
        .collect();
      for (const a of activities) await ctx.db.delete(a._id);

      await ctx.db.delete(dest._id);
    }
    await ctx.db.delete(args.id);
  },
});
