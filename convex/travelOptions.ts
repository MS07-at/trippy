import { v } from "convex/values";
import { mutation } from "./_generated/server";

function validateFlightTimes(o: {
  outboundDepartureTime?: number;
  outboundArrivalTime?: number;
  returnDepartureTime?: number;
  returnArrivalTime?: number;
}) {
  if (
    o.outboundDepartureTime !== undefined &&
    o.outboundArrivalTime !== undefined &&
    o.outboundArrivalTime <= o.outboundDepartureTime
  ) {
    throw new Error("Outbound arrival must be after departure");
  }
  if (
    o.returnDepartureTime !== undefined &&
    o.returnArrivalTime !== undefined &&
    o.returnArrivalTime <= o.returnDepartureTime
  ) {
    throw new Error("Return arrival must be after departure");
  }
  if (
    o.outboundArrivalTime !== undefined &&
    o.returnDepartureTime !== undefined &&
    o.returnDepartureTime < o.outboundArrivalTime
  ) {
    throw new Error("Return departure must be after outbound arrival");
  }
}

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
    validateFlightTimes(args);
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

// Nullable variants for update: null means "clear the field"
const flightFieldUpdates = {
  outboundFlightNumber: v.optional(v.union(v.string(), v.null())),
  outboundDepartureTime: v.optional(v.union(v.number(), v.null())),
  outboundArrivalTime: v.optional(v.union(v.number(), v.null())),
  returnFlightNumber: v.optional(v.union(v.string(), v.null())),
  returnDepartureTime: v.optional(v.union(v.number(), v.null())),
  returnArrivalTime: v.optional(v.union(v.number(), v.null())),
  tripStartDate: v.optional(v.union(v.number(), v.null())),
  tripEndDate: v.optional(v.union(v.number(), v.null())),
  airline: v.optional(v.union(v.string(), v.null())),
  isSuggestion: v.optional(v.boolean()),
};

export const update = mutation({
  args: {
    id: v.id("travelOptions"),
    mode: v.optional(
      v.union(v.literal("flight"), v.literal("train"), v.literal("car")),
    ),
    expectedCost: v.optional(v.number()),
    notes: v.optional(v.union(v.string(), v.null())),
    userId: v.optional(v.id("users")),
    ...flightFieldUpdates,
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
    // null clears a field (patch with undefined unsets it)
    const updates: Record<string, unknown> = {};
    const fields = [
      "mode",
      "expectedCost",
      "notes",
      "outboundFlightNumber",
      "outboundDepartureTime",
      "outboundArrivalTime",
      "returnFlightNumber",
      "returnDepartureTime",
      "returnArrivalTime",
      "tripStartDate",
      "tripEndDate",
      "airline",
      "isSuggestion",
    ] as const;
    for (const field of fields) {
      const value = args[field];
      if (value !== undefined) updates[field] = value ?? undefined;
    }
    validateFlightTimes({ ...option, ...updates });
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
