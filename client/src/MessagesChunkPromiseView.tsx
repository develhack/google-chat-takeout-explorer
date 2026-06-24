import { use } from "react";
import MessagesChunkView from "./MessagesChunkView";
import type { Message, MessagesChunk } from "./types";

interface Props {
  chunkPromise: Promise<MessagesChunk>;
  isFocused: (message: Message) => boolean;
  onSelectMessage: (message: Message) => void;
  fetchBefore?: (sequence: number) => void;
  fetchAfter?: (sequence: number) => void;
}

export default function MessagesChunkPromiseView({
  chunkPromise,
  isFocused,
  onSelectMessage,
  fetchBefore,
  fetchAfter,
}: Props) {
  const chunk = use(chunkPromise);

  return (
    <MessagesChunkView
      chunk={chunk}
      onSelectMessage={onSelectMessage}
      isFocused={isFocused}
      fetchBefore={fetchBefore}
      fetchAfter={fetchAfter}
    />
  );
}
