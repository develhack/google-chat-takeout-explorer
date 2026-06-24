import { useMemo, useState } from "react";
import type { Group } from "../types";
import { toLocalDateTimeString } from "../logic";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useSearchParams } from "react-router";

type Order = "new" | "old" | "asc" | "desc";

function comparator(order: Order) {
  switch (order) {
    case "new":
      return (a: Group, b: Group) => b.lastPostedAt.localeCompare(a.lastPostedAt);
    case "old":
      return (a: Group, b: Group) => a.lastPostedAt.localeCompare(b.lastPostedAt);
    case "asc":
      return (a: Group, b: Group) => a.name.localeCompare(b.name);
    case "desc":
      return (a: Group, b: Group) => b.name.localeCompare(a.name);
  }
}

interface Props {
  groupList: Group[];
}

export default function GroupsView({ groupList }: Props) {
  const [searchParams] = useSearchParams();

  const [order, setOrder] = useState<string>("new");

  const sortedGroupList = useMemo(
    () => groupList.toSorted(comparator(order as Order)),
    [groupList, order],
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-row">
        <Select value={order} onValueChange={setOrder}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="new">Newest first</SelectItem>
              <SelectItem value="old">Oldest first</SelectItem>
              <SelectItem value="asc">Name ascending</SelectItem>
              <SelectItem value="desc">Name descending</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="relative grow">
        <div className="absolute h-full w-full overflow-y-auto">
          <ul className="m-2 flex flex-col gap-2">
            {sortedGroupList.map((group) => (
              <li key={group.id}>
                <Link to={`/${group.id}/*?${searchParams.toString()}`} className="flex flex-row">
                  <span className="grow truncate">{group.name}</span>
                  <time className="font-mono text-xs text-nowrap">
                    {toLocalDateTimeString(group.lastPostedAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
