import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoorOpenIcon, SearchIcon, UsersIcon } from "lucide-react";
import { useContext, useMemo } from "react";
import { AppContext } from "../AppContext";
import GroupsView from "./GroupsView";
import SearchView from "./SearchView";

export default function SidePanelView() {
  const { groupList } = useContext(AppContext);

  const dmList = useMemo(() => groupList.filter((g) => g.dm), [groupList]);
  const spaceList = useMemo(() => groupList.filter((g) => !g.dm), [groupList]);

  return (
    <nav className="relative h-full">
      <Tabs defaultValue="search" className="h-full overflow-x-hidden">
        <TabsList>
          <TabsTrigger value="search">
            <SearchIcon />
            Search
          </TabsTrigger>
          <TabsTrigger value="dm">
            <UsersIcon />
            DM
          </TabsTrigger>
          <TabsTrigger value="space">
            <DoorOpenIcon />
            Space
          </TabsTrigger>
        </TabsList>
        <TabsContent value="search" forceMount>
          <SearchView />
        </TabsContent>
        <TabsContent value="dm" forceMount>
          <GroupsView groupList={dmList} />
        </TabsContent>
        <TabsContent value="space" forceMount>
          <GroupsView groupList={spaceList} />
        </TabsContent>
      </Tabs>
    </nav>
  );
}
