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

        const travelOptionsRaw = await ctx.db
          .query("travelOptions")
          .withIndex("by_destination", (q) => q.eq("destinationId", dest._id))
          .collect();

        const travelOptions = await Promise.all(
          travelOptionsRaw.map(async (opt) => {
            const optVotes = await ctx.db
              .query("travelOptionVotes")
              .withIndex("by_travel_option", (q) =>
                q.eq("travelOptionId", opt._id),
              )
              .collect();
            const optVoteScore = optVotes.reduce((sum, v) => sum + v.value, 0);
            const optUpvotes = optVotes.filter((v) => v.value === 1).length;
            const optDownvotes = optVotes.filter((v) => v.value === -1).length;
            return {
              ...opt,
              voteScore: optVoteScore,
              upvotes: optUpvotes,
              downvotes: optDownvotes,
            };
          }),
        );

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
            const aptVotes = await ctx.db
              .query("apartmentVotes")
              .withIndex("by_apartment", (q) => q.eq("apartmentId", apt._id))
              .collect();
            const aptVoteScore = aptVotes.reduce((sum, v) => sum + v.value, 0);
            const aptUpvotes = aptVotes.filter((v) => v.value === 1).length;
            const aptDownvotes = aptVotes.filter((v) => v.value === -1).length;
            return {
              ...apt,
              imageUrls: urls.filter((u): u is string => u !== null),
              voteScore: aptVoteScore,
              upvotes: aptUpvotes,
              downvotes: aptDownvotes,
            };
          }),
        );

        const prices = apartments
          .filter((a) => !a.isHidden)
          .map((a) => a.expectedPrice);
        const priceRange =
          prices.length > 0
            ? { min: Math.min(...prices), max: Math.max(...prices) }
            : null;

        const hiddenLast = (a: { isHidden?: boolean }, b: { isHidden?: boolean }) =>
          Number(a.isHidden ?? false) - Number(b.isHidden ?? false);

        return {
          ...dest,
          imageUrls: imageUrls.filter((u): u is string => u !== null),
          voteScore,
          upvotes,
          downvotes,
          travelOptions: travelOptions.sort(hiddenLast),
          apartments: apartmentsWithImages.sort(hiddenLast),
          activities,
          priceRange,
        };
      }),
    );

    // Hidden destinations always sort to the bottom
    return enriched.sort(
      (a, b) =>
        Number(a.isHidden ?? false) - Number(b.isHidden ?? false) ||
        b.voteScore - a.voteScore,
    );
  },
});

export const create = mutation({
  args: {
    vacationId: v.id("vacations"),
    city: v.string(),
    country: v.string(),
    description: v.optional(v.string()),
    airport: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const vacation = await ctx.db.get(args.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
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
      airport: args.airport,
      isSelected: false,
      order: existing.length,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("destinations"),
    city: v.string(),
    country: v.string(),
    description: v.optional(v.string()),
    airport: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, {
      city: args.city,
      country: args.country,
      description: args.description,
      airport: args.airport,
    });
  },
});

export const toggleSelected = mutation({
  args: {
    id: v.id("destinations"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { isSelected: !dest.isSelected });
  },
});

export const toggleFlightVoting = mutation({
  args: {
    id: v.id("destinations"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, {
      flightVotingEnabled: dest.flightVotingEnabled === false,
    });
  },
});

export const toggleHotelVoting = mutation({
  args: {
    id: v.id("destinations"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, {
      hotelVotingEnabled: dest.hotelVotingEnabled === false,
    });
  },
});

export const toggleHidden = mutation({
  args: {
    id: v.id("destinations"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { isHidden: !dest.isHidden });
  },
});

export const remove = mutation({
  args: {
    id: v.id("destinations"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
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
      .withIndex("by_destination", (q) => q.eq("destinationId", args.id))
      .collect();
    for (const a of apartments) {
      const aptVotes = await ctx.db
        .query("apartmentVotes")
        .withIndex("by_apartment", (q) => q.eq("apartmentId", a._id))
        .collect();
      for (const av of aptVotes) await ctx.db.delete(av._id);
      await ctx.db.delete(a._id);
    }

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_destination", (q) => q.eq("destinationId", args.id))
      .collect();
    for (const a of activities) await ctx.db.delete(a._id);

    await ctx.db.delete(args.id);
  },
});

export const updateDescription = mutation({
  args: {
    id: v.id("destinations"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    if (!dest.description) {
      await ctx.db.patch(args.id, { description: args.description });
    }
  },
});

export const addImage = mutation({
  args: {
    id: v.id("destinations"),
    imageId: v.id("_storage"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
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
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.id);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const existing = dest.imageIds ?? [];
    await ctx.db.patch(args.id, {
      imageIds: existing.filter((id) => id !== args.imageId),
    });
    await ctx.storage.delete(args.imageId);
  },
});
