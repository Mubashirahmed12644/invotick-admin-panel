import type { UserMapLocation } from "@/lib/types";

export type { UserMapLocation };

export type SelectedUser = UserMapLocation;

export type SelectedCluster = {
  count: number;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  users: UserMapLocation[];
};
