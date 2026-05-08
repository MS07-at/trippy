import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const saveBatch = mutation({
  args: {
    destinationId: v.id("destinations"),
    activities: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        category: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Clear existing activities for this destination
    const existing = await ctx.db
      .query("activities")
      .withIndex("by_destination", (q) =>
        q.eq("destinationId", args.destinationId),
      )
      .collect();
    for (const a of existing) await ctx.db.delete(a._id);

    // Insert new ones
    for (const activity of args.activities) {
      await ctx.db.insert("activities", {
        destinationId: args.destinationId,
        name: activity.name,
        description: activity.description,
        category: activity.category,
      });
    }
  },
});

export const remove = mutation({
  args: {
    id: v.id("activities"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const activity = await ctx.db.get(args.id);
    if (!activity) throw new Error("Not found");
    const dest = await ctx.db.get(activity.destinationId);
    if (!dest) throw new Error("Not found");
    const vacation = await ctx.db.get(dest.vacationId);
    if (!vacation || vacation.userId !== args.userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.id);
  },
});
