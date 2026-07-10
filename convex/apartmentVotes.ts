import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMyVote = query({
  args: {
    apartmentId: v.id("apartments"),
    voterToken: v.string(),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("apartmentVotes")
      .withIndex("by_apartment_voter", (q) =>
        q.eq("apartmentId", args.apartmentId).eq("voterToken", args.voterToken),
      )
      .unique();
    return vote?.value ?? 0;
  },
});

export const cast = mutation({
  args: {
    apartmentId: v.id("apartments"),
    voterToken: v.string(),
    value: v.number(),
  },
  handler: async (ctx, args) => {
    const apt = await ctx.db.get(args.apartmentId);
    if (!apt) throw new Error("Not found");
    const dest = await ctx.db.get(apt.destinationId);
    if (dest?.hotelVotingEnabled === false) {
      throw new Error("Voting is disabled");
    }

    const existing = await ctx.db
      .query("apartmentVotes")
      .withIndex("by_apartment_voter", (q) =>
        q.eq("apartmentId", args.apartmentId).eq("voterToken", args.voterToken),
      )
      .unique();

    if (existing) {
      if (args.value === 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, { value: args.value });
      }
    } else if (args.value !== 0) {
      await ctx.db.insert("apartmentVotes", {
        apartmentId: args.apartmentId,
        voterToken: args.voterToken,
        value: args.value,
      });
    }
  },
});
