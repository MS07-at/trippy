import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMyVote = query({
  args: {
    destinationId: v.id("destinations"),
    voterToken: v.string(),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_destination_voter", (q) =>
        q.eq("destinationId", args.destinationId).eq("voterToken", args.voterToken),
      )
      .unique();
    return vote?.value ?? 0;
  },
});

export const cast = mutation({
  args: {
    destinationId: v.id("destinations"),
    voterToken: v.string(),
    value: v.number(), // 1, -1, or 0 to remove
  },
  handler: async (ctx, args) => {
    const dest = await ctx.db.get(args.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (vacation?.votingEnabled === false) {
      throw new Error("Voting is disabled");
    }

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_destination_voter", (q) =>
        q.eq("destinationId", args.destinationId).eq("voterToken", args.voterToken),
      )
      .unique();

    if (existing) {
      if (args.value === 0) {
        await ctx.db.delete(existing._id);
      } else {
        await ctx.db.patch(existing._id, { value: args.value });
      }
    } else if (args.value !== 0) {
      await ctx.db.insert("votes", {
        destinationId: args.destinationId,
        voterToken: args.voterToken,
        value: args.value,
      });
    }
  },
});
