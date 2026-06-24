import { Suspense, useContext, useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AppContext } from "../AppContext";
import Loading from "../Loading";
import MessagesChunkPromiseView from "../MessagesChunkPromiseView";
import { fetchAfterMessagesChunk, fetchBeforeMessagesChunk, fetchMessage } from "../fetch";
import { matchId } from "../logic";
import type { Message, MessagesChunk } from "../types";

export default function GroupMessagesView() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const groupId = params.groupId!;
  const threadId = params.threadId!;

  const prevGroupIdRef = useRef("");

  const fetchId = groupId;

  const { groups } = useContext(AppContext);

  const componentRootRef = useRef<HTMLDivElement>(null);

  const group = groups[groupId];

  const [messagesChunkPromiseList, setMessagesChunkPromiseList] = useState<
    Promise<MessagesChunk>[]
  >([]);

  const fetchAround = useEffectEvent(() => {
    void fetchMessage(`${groupId}/${threadId}/${threadId}`).then((message) => {
      setMessagesChunkPromiseList([
        fetchAfterMessagesChunk(fetchId, message.sequence).then((results) => {
          results.hasBefore = true;
          return results;
        }),
      ]);
    });
  });

  useEffect(() => {
    const prevGroupId = prevGroupIdRef.current;

    prevGroupIdRef.current = groupId;

    if (threadId === "*") {
      // fetch laters messages
      setMessagesChunkPromiseList([fetchBeforeMessagesChunk(fetchId, group.messageCount + 1)]);
      return;
    }

    if (groupId !== prevGroupId) {
      fetchAround();
      return;
    }

    const messageElement = componentRootRef.current?.querySelector(
      `[data-message-id="${groupId}/${threadId}/${threadId}"]`,
    );
    if (!messageElement) {
      // selected message has not been fetched
      fetchAround();
      return;
    }

    // selected message has been fetched
    const rect = messageElement.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      return;
    }
  }, [fetchId, groupId, threadId, group]);

  const isFocused = (message: Message) => matchId(message, params);

  const navigate = useNavigate();
  const onSelectMessage = async (message: Message) => {
    let to = `/${message.groupId}/${message.threadId}`;

    if (searchParams.size) {
      to += `?${searchParams.toString()}`;
    }

    await navigate(`${to}`);
  };

  const fetchBefore = (sequence: number) => {
    setMessagesChunkPromiseList([
      fetchBeforeMessagesChunk(fetchId, sequence),
      ...messagesChunkPromiseList,
    ]);
  };

  const fetchAfter = (sequence: number) => {
    setMessagesChunkPromiseList([
      ...messagesChunkPromiseList,
      fetchAfterMessagesChunk(fetchId, sequence + 1),
    ]);
  };

  return (
    <div ref={componentRootRef} className="h-full flex flex-col">
      <h1 className="p-4 text-xl">{group.name}</h1>
      <div className="relative grow overflow-y-auto">
        {messagesChunkPromiseList.map((messagesChunkPromise, i) => (
          <Suspense key={i} fallback={<Loading />}>
            <MessagesChunkPromiseView
              chunkPromise={messagesChunkPromise}
              isFocused={isFocused}
              onSelectMessage={onSelectMessage}
              fetchBefore={i == 0 ? fetchBefore : undefined}
              fetchAfter={i == messagesChunkPromiseList.length - 1 ? fetchAfter : undefined}
            />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
