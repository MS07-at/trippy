import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMyVote = query({
  args: {
    travelOptionId: v.id("travelOptions"),
    voterToken: v.string(),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("travelOptionVotes")
      .withIndex("by_travel_option_voter", (q) =>
        q.eq("travelOptionId", args.travelOptionId).eq("voterToken", args.voterToken),
      )
      .unique();
    return vote?.value ?? 0;
  },
});

export const cast = mutation({
  args: {
    travelOptionId: v.id("travelOptions"),
    voterToken: v.string(),
    value: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("travelOptionVotes")
      .withIndex("by_travel_option_voter", (q) =>
        q.eq("travelOptionId", args.travelOptionId).eq("voterToken", args.voterToken),
      )
      .unique();

    if (existing) {
      if (args.value === 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, { value: args.value });
      }
    } else if (args.value !== 0) {
      await ctx.db.insert("travelOptionVotes", {
        travelOptionId: args.travelOptionId,
        voterToken: args.voterToken,
        value: args.value,
      });
    }
  },
});
