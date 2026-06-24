import { useEffect, useLayoutEffect, useRef } from "react";
import MessageView from "./MessageView";
import type { Message, MessagesChunk } from "./types";

interface Props {
  chunk: MessagesChunk;
  isFocused: (message: Message) => boolean;
  onSelectMessage: (message: Message) => void;
  fetchBefore?: (sequence: number) => void;
  fetchAfter?: (sequence: number) => void;
}

export default function MessagesChunkView({
  chunk,
  isFocused,
  onSelectMessage,
  fetchBefore,
  fetchAfter,
}: Props) {
  const chunkBoxRef = useRef<HTMLDivElement>(null);
  const fetchBeforeTriggerRef = useRef<HTMLDivElement>(null);
  const fetchAfterTriggerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!chunk.shouldAdjustScrollTop) {
      return;
    }

    const chunkBox = chunkBoxRef.current;
    if (!chunkBox || !chunkBox.parentElement) {
      return;
    }
    chunk.shouldAdjustScrollTop = false;
    chunkBox.parentElement.scrollTop += chunkBox.offsetHeight;
  }, [chunk]);

  useEffect(() => {
    if (!fetchBefore) {
      return;
    }

    const fetchBeforeTrigger = fetchBeforeTriggerRef.current;
    if (!fetchBeforeTrigger) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        const message = chunk.messages.at(0);
        if (!message) {
          return;
        }
        observer.disconnect();
        fetchBefore(message.sequence);
      }
    });

    observer.observe(fetchBeforeTrigger);

    return () => observer.disconnect();
  }, [chunk, fetchBefore, fetchBeforeTriggerRef]);

  useEffect(() => {
    if (!fetchAfter) {
      return;
    }

    const fetchAfterTrigger = fetchAfterTriggerRef.current;
    if (!fetchAfterTrigger) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        const message = chunk.messages.at(-1);
        if (!message) {
          return;
        }
        observer.disconnect();
        fetchAfter(message.sequence);
      }
    });

    observer.observe(fetchAfterTrigger);

    return () => observer.disconnect();
  }, [chunk, fetchAfter, fetchAfterTriggerRef]);

  return (
    <div ref={chunkBoxRef}>
      {chunk.hasBefore && fetchBefore && <div ref={fetchBeforeTriggerRef} />}
      {chunk.messages.map((message) => (
        <MessageView
          isFocused={isFocused}
          onSelectMessage={onSelectMessage}
          key={message.sequence}
          message={message}
        />
      ))}
      {chunk.hasAfter && fetchAfter && <div ref={fetchAfterTriggerRef} className="-mt-1" />}
    </div>
  );
}
