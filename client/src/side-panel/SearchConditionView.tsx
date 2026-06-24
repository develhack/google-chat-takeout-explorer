import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useContext, useMemo } from "react";
import { useSearchParams } from "react-router";
import { AppContext } from "../AppContext";
import { type Group } from "../types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SearchConditionView() {
  const { users, userList, groups, groupList } = useContext(AppContext);

  const [searchParams, setSearchParams] = useSearchParams();

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const searchParams = new URLSearchParams();
    formData.forEach((value, key) => {
      if (value) {
        searchParams.set(key, value as string);
      }
    });

    setSearchParams(searchParams);
  };

  const userItems = useMemo(() => userList.map((user) => user.email), [userList]);
  const groupItems = useMemo(
    () =>
      groupList
        .toSorted((a: Group, b: Group) => b.lastPostedAt.localeCompare(a.lastPostedAt))
        .map((group) => group.id),
    [groupList],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="relative p-2 grid grid-cols-[auto_1fr] gap-2 items-center"
    >
      <label htmlFor="keywords">Keywords</label>
      <Input
        id="keywords"
        name="keywords"
        type="search"
        defaultValue={searchParams.get("keywords") ?? ""}
        required
        autoFocus
      />
      <label htmlFor="group-id">Group</label>
      <Combobox
        name="group-id"
        defaultValue={searchParams.get("group-id")}
        items={groupItems}
        itemToStringLabel={(groupId: string) => groups[groupId]?.name ?? ""}
        autoHighlight
      >
        <ComboboxInput id="group-id" showClear />
        <ComboboxContent>
          <ComboboxEmpty>No group found.</ComboboxEmpty>
          <ComboboxList>
            {(groupId: string) => (
              <ComboboxItem key={groupId} value={groupId}>
                {groups[groupId]?.name ?? ""}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <label htmlFor="author">Author</label>
      <Combobox
        id="author"
        name="author"
        defaultValue={searchParams.get("author")}
        items={userItems}
        itemToStringLabel={(author: string) => users[author]?.name ?? ""}
        autoHighlight
      >
        <ComboboxInput showClear />
        <ComboboxContent>
          <ComboboxEmpty>No user found.</ComboboxEmpty>
          <ComboboxList>
            {(author: string) => (
              <ComboboxItem key={author} value={author}>
                {users[author]?.name ?? ""}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <label htmlFor="from">From</label>
      <Input id="from" name="from" type="date" defaultValue={searchParams.get("from") ?? ""} />
      <label htmlFor="to">To</label>
      <Input id="to" name="to" type="date" defaultValue={searchParams.get("to") ?? ""} />
      <label htmlFor="sort">Sort</label>
      <Select name="sort" defaultValue={searchParams.get("sort") ?? "n"}>
        <SelectTrigger id="sort">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="n">Newest first</SelectItem>
            <SelectItem value="o">Oldest first</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button type="submit" className="col-span-2 w-full cursor-pointer">
        Search
      </Button>
    </form>
  );
}
