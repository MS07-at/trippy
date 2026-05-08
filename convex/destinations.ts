import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listByVacation = query({
  args: { vacationId: v.id("vacations") },
  handler: async (ctx, args) => {
    const destinations = await ctx.db
      .query("destinations")
      .withIndex("by_vacation", (q) => q.eq("vacationId", args.vacationId))
      .collect();

    // Enrich with vote counts, travel options, apartments
    const enriched = await Promise.all(
      destinations.map(async (dest) => {
        const votes = await ctx.db
          .query("votes")
          .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
          .collect();
        const voteScore = votes.reduce((sum, v) => sum + v.value, 0);
        const upvotes = votes.filter((v) => v.value === 1).length;
        const downvotes = votes.filter((v) => v.value === -1).length;

        const travelOptions = await ctx.db
          .query("travelOptions")
          .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
          .collect();

        const apartments = await ctx.db
          .query("apartments")
          .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
          .collect();

        const activities = await ctx.db
          .query("activities")
          .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
          .collect();

        const imageUrls = await Promise.all(
          (dest.imageIds ?? []).map((id) => ctx.storage.getUrl(id)),
        );

        const apartmentsWithImages = await Promise.all(
          apartments.map(async (apt) => {
            const urls = await Promise.all(
              (apt.imageIds ?? []).map((id) => ctx.storage.getUrl(id)),
            );
            return {
              ...apt,
              imageUrls: urls.filter((u): u is string => u !== null),
            };
          }),
        );

        const prices = apartments.map((a) => a.expectedPrice);
        const priceRange =
          prices.length > 0
            ? { min: Math.min(...prices), max: Math.max(...prices) }
            : null;

        return {
          ...dest,
          imageUrls: imageUrls.filter((u): u is string => u !== null),
          voteScore,
          upvotes,
          downvotes,
          travelOptions,
          apartments: apartmentsWithImages,
          activities,
          priceRange,
        };
      }),
    );

    return enriched.sort((a, b) => b.voteScore - a.voteScore);
  },
});

export const create = mutation({
  args: {
    vacationId: v.id("vacations"),
    city: v.string(),
    country: v.string(),
    description: v.optional(v.string()),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const vacation = await ctx.db.get(args.vacationId);
    if (!vacation || vacation.ownerToken !== args.ownerToken) {
      throw new Error("Not authorized");
    }
    const existing = await ctx.db
      .query("destinations")
      .withIndex("by_vacation", (q) => q.eq("vacationId", args.vacationId))
      .collect();
    return await ctx.db.insert("destinations", {
      vacationId: args.vacationId,
      city: args.city,
      country: args.country,
      description: args.description,
      isSelected: false,
      order: existing.length,
    });
  },
});

export const toggleSelected = mutation({
  args: {
    id: v.id("destinations"),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.ownerToken !== args.ownerToken) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { isSelected: !dest.isSelected });
  },
});

export const remove = mutation({
  args: {
    id: v.id("destinations"),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.ownerToken !== args.ownerToken) {
      throw new Error("Not authorized");
    }
    // Clean up related data
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_destination", (q) => q.eq("destinationId", args.id))
      .collect();
    for (const v of votes) await ctx.db.delete(v._id);

    const travel = await ctx.db
      .query("travelOptions")
      .withIndex("by_destination", (q) => q.eq("destinationId", args.id))
      .collect();
    for (const t of travel) await ctx.db.delete(t._id);

    const apartments = await ctx.db
      .query("apartments")
      .withIndex("by_destination", (q) => q.eq("destinationId", args.id))
      .collect();
    for (const a of apartments) await ctx.db.delete(a._id);

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_destination", (q) => q.eq("destinationId", args.id))
      .collect();
    for (const a of activities) await ctx.db.delete(a._id);

    await ctx.db.delete(args.id);
  },
});

export const addImage = mutation({
  args: {
    id: v.id("destinations"),
    imageId: v.id("_storage"),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.ownerToken !== args.ownerToken) {
      throw new Error("Not authorized");
    }
    const existing = dest.imageIds ?? [];
    await ctx.db.patch(args.id, { imageIds: [...existing, args.imageId] });
  },
});

export const removeImage = mutation({
  args: {
    id: v.id("destinations"),
    imageId: v.id("_storage"),
    ownerToken: v.string(),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.ownerToken !== args.ownerToken) {
      throw new Error("Not authorized");
    }
    const existing = dest.imageIds ?? [];
    await ctx.db.patch(args.id, {
      imageIds: existing.filter((id) => id !== args.imageId),
    });
    await ctx.storage.delete(args.imageId);
  },
});
