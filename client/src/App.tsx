import SidePanelView from "./side-panel/SidePanelView";
import type { Group, RawGroup, User } from "./types";
import { use, useMemo } from "react";
import { AppContext } from "./AppContext";
import { useParams } from "react-router";
import GroupMessagesView from "./group-messages/GroupMessagesView";
import ThreadMessagesView from "./thread-messages/ThreadMessagesView";
import Empty from "./Empty";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface Props {
  promises: Promise<[string, Record<string, string>, Record<string, RawGroup>]>;
}

function App({ promises }: Props) {
  const [account, rawUsers, rawGroups] = use(promises);

  const { threadId, messageId } = useParams();

  const users = useMemo(() => {
    const users: Record<string, User> = {};
    Object.entries(rawUsers).map(([email, name]) => {
      users[email] = { email, name };
    });
    return users;
  }, [rawUsers]);

  const userList = useMemo(() => Object.values(users), [users]);

  const groups = useMemo(() => {
    const groups: Record<string, Group> = {};
    Object.entries(rawGroups)
      .filter(([_id, rawGroup]) => !!rawGroup.lastPostedAt)
      .map(([id, rawGroup]) => {
        let name = rawGroup.name;
        let dm = false;
        if (!name || name === "Group Chat") {
          dm = true;
          const members = (rawGroup.members || []).filter((member) => member.email != account);
          if (!members.length || rawGroup.includingDeletedUsers) {
            members.push({ name: "Deleted User" });
          }
          name = members.map((member) => member.name).join(",");
        }
        groups[id] = { ...rawGroup, id, name, dm };
      });

    return groups;
  }, [account, rawGroups]);

  const groupList = useMemo(() => Object.values(groups), [groups]);

  return (
    <AppContext.Provider value={{ account, users, userList, groups, groupList }}>
      <ResizablePanelGroup orientation="horizontal" className="absolute h-full">
        <ResizablePanel defaultSize="25%" minSize={128}>
          <SidePanelView />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel minSize={128}>
          <main className="relative h-full flex flex-col">
            <ResizablePanelGroup orientation="horizontal" className="grow">
              <ResizablePanel minSize={128}>
                {threadId ? <GroupMessagesView /> : <Empty>No group selected.</Empty>}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel minSize={128}>
                {messageId ? <ThreadMessagesView /> : <Empty>No thread selected.</Empty>}
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AppContext.Provider>
  );
}

export default App;
