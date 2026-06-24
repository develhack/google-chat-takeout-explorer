import React from "react";
import type { Group, User } from "./types";

interface Context {
  account: string;
  users: Record<string, User>;
  userList: User[];
  groups: Record<string, Group>;
  groupList: Group[];
}

export const AppContext = React.createContext<Context>({
  account: "",
  users: {},
  userList: [],
  groups: {},
  groupList: [],
});
