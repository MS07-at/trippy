import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  users: defineTable({
    username: v.string(),
    password: v.string(),
    token: v.string(),
  })
    .index("by_username", ["username"])
    .index("by_token", ["token"]),

  vacations: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    slug: v.string(),
    userId: v.id("users"),
    nights: v.optional(v.number()),
    people: v.optional(v.number()),
    publicEdit: v.optional(v.boolean()),
    originAirport: v.optional(v.string()),
    votingEnabled: v.optional(v.boolean()), // undefined = enabled
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  destinations: defineTable({
    vacationId: v.id("vacations"),
    city: v.string(),
    country: v.string(),
    description: v.optional(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    isSelected: v.boolean(),
    order: v.number(),
    airport: v.optional(v.string()),
    flightVotingEnabled: v.optional(v.boolean()), // undefined = enabled
    hotelVotingEnabled: v.optional(v.boolean()), // undefined = enabled
    travelGraphEnabled: v.optional(v.boolean()), // undefined = disabled
    isHidden: v.optional(v.boolean()),
  }).index("by_vacation", ["vacationId"]),

  votes: defineTable({
    destinationId: v.id("destinations"),
    voterToken: v.string(),
    value: v.number(), // 1 = upvote, -1 = downvote
  })
    .index("by_destination", ["destinationId"])
    .index("by_destination_voter", ["destinationId", "voterToken"]),

  travelOptions: defineTable({
    destinationId: v.id("destinations"),
    mode: v.union(
      v.literal("flight"),
      v.literal("train"),
      v.literal("car"),
    ),
    expectedCost: v.number(),
    notes: v.optional(v.string()),
    isSelected: v.optional(v.boolean()),
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
    isHidden: v.optional(v.boolean()),
  }).index("by_destination", ["destinationId"]),

  travelOptionVotes: defineTable({
    travelOptionId: v.id("travelOptions"),
    voterToken: v.string(),
    value: v.number(),
  })
    .index("by_travel_option", ["travelOptionId"])
    .index("by_travel_option_voter", ["travelOptionId", "voterToken"]),

  apartments: defineTable({
    destinationId: v.id("destinations"),
    name: v.string(),
    url: v.optional(v.string()),
    expectedPrice: v.number(),
    imageIds: v.optional(v.array(v.id("_storage"))),
    notes: v.optional(v.string()),
    isSelected: v.boolean(),
    isHidden: v.optional(v.boolean()),
  }).index("by_destination", ["destinationId"]),

  apartmentVotes: defineTable({
    apartmentId: v.id("apartments"),
    voterToken: v.string(),
    value: v.number(),
  })
    .index("by_apartment", ["apartmentId"])
    .index("by_apartment_voter", ["apartmentId", "voterToken"]),

  activities: defineTable({
    destinationId: v.id("destinations"),
    name: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
  }).index("by_destination", ["destinationId"]),
});
