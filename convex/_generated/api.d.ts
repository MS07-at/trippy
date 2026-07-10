/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as admin from "../admin.js";
import type * as apartmentVotes from "../apartmentVotes.js";
import type * as apartments from "../apartments.js";
import type * as destinations from "../destinations.js";
import type * as files from "../files.js";
import type * as travelOptionVotes from "../travelOptionVotes.js";
import type * as travelOptions from "../travelOptions.js";
import type * as users from "../users.js";
import type * as vacations from "../vacations.js";
import type * as votes from "../votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  admin: typeof admin;
  apartmentVotes: typeof apartmentVotes;
  apartments: typeof apartments;
  destinations: typeof destinations;
  files: typeof files;
  travelOptionVotes: typeof travelOptionVotes;
  travelOptions: typeof travelOptions;
  users: typeof users;
  vacations: typeof vacations;
  votes: typeof votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
