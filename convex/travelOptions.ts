import { v } from "convex/values";
import { mutation } from "./_generated/server";

const flightFields = {
  outboundFlightNumber: v.optional(v.string()),
  outboundDepartureTime: v.optional(v.number()),
  outboundArrivalTime: v.optional(v.number()),
  returnFlightNumber: v.optional(v.string()),
  returnDepartureTime: v.optional(v.number()),
  returnArrivalTime: v.optional(v.number()),
  tripStartDate: v.optional(v.number()),
  tripEndDate: v.optional(v.number()),
  airline: v.optional(v.string()),
  isSuggestion: v.optional(v.boolean()),
};

export const add = mutation({
  args: {
    destinationId: v.id("destinations"),
    mode: v.union(v.literal("flight"), v.literal("train"), v.literal("car")),
    expectedCost: v.number(),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    ...flightFields,
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    return await ctx.db.insert("travelOptions", {
      destinationId: args.destinationId,
      mode: args.mode,
      expectedCost: args.expectedCost,
      notes: args.notes,
      isSelected: false,
      outboundFlightNumber: args.outboundFlightNumber,
      outboundDepartureTime: args.outboundDepartureTime,
      outboundArrivalTime: args.outboundArrivalTime,
      returnFlightNumber: args.returnFlightNumber,
      returnDepartureTime: args.returnDepartureTime,
      returnArrivalTime: args.returnArrivalTime,
      tripStartDate: args.tripStartDate,
      tripEndDate: args.tripEndDate,
      airline: args.airline,
      isSuggestion: args.isSuggestion,
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
    userId: v.optional(v.id("users")),
    ...flightFields,
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.id);
    if (!option) throw new Error("Not found");
    const dest = await ctx.db.get(option.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const updates: Record<string, unknown> = {};
    if (args.mode !== undefined) updates.mode = args.mode;
    if (args.expectedCost !== undefined) updates.expectedCost = args.expectedCost;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.outboundFlightNumber !== undefined) updates.outboundFlightNumber = args.outboundFlightNumber;
    if (args.outboundDepartureTime !== undefined) updates.outboundDepartureTime = args.outboundDepartureTime;
    if (args.outboundArrivalTime !== undefined) updates.outboundArrivalTime = args.outboundArrivalTime;
    if (args.returnFlightNumber !== undefined) updates.returnFlightNumber = args.returnFlightNumber;
    if (args.returnDepartureTime !== undefined) updates.returnDepartureTime = args.returnDepartureTime;
    if (args.returnArrivalTime !== undefined) updates.returnArrivalTime = args.returnArrivalTime;
    if (args.tripStartDate !== undefined) updates.tripStartDate = args.tripStartDate;
    if (args.tripEndDate !== undefined) updates.tripEndDate = args.tripEndDate;
    if (args.airline !== undefined) updates.airline = args.airline;
    if (args.isSuggestion !== undefined) updates.isSuggestion = args.isSuggestion;
    await ctx.db.patch(args.id, updates);
  },
});

export const toggleSelected = mutation({
  args: {
    id: v.id("travelOptions"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.id);
    if (!option) throw new Error("Not found");
    const dest = await ctx.db.get(option.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { isSelected: !option.isSelected });
  },
});

export const toggleHidden = mutation({
  args: {
    id: v.id("travelOptions"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.id);
    if (!option) throw new Error("Not found");
    const dest = await ctx.db.get(option.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { isHidden: !option.isHidden });
  },
});

export const remove = mutation({
  args: {
    id: v.id("travelOptions"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const option = await ctx.db.get(args.id);
    if (!option) throw new Error("Not found");
    const dest = await ctx.db.get(option.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation) throw new Error("Not found");
    if (!vacation.publicEdit && (!args.userId || vacation.userId !== args.userId)) {
      throw new Error("Not authorized");
    }
    const votes = await ctx.db
      .query("travelOptionVotes")
      .withIndex("by_travel_option", (q) => q.eq("travelOptionId", args.id))
      .collect();
    for (const vote of votes) await ctx.db.delete(vote._id);
    await ctx.db.delete(args.id);
  },
});
