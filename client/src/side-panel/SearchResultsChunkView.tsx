import { useEffect, useRef } from "react";
import { toId } from "../logic";
import type { SearchResultsChunk } from "../types";
import SearchResultView from "./SearchResultView";
import Empty from "../Empty";

interface Props {
  chunk: SearchResultsChunk;
  fetchMore?: (offset: number) => void;
}

export default function SearchResultsChunkView({ chunk, fetchMore }: Props) {
  const fetchMoreTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fetchMore) {
      return;
    }

    const fetchMoreTrigger = fetchMoreTriggerRef.current;
    if (!fetchMoreTrigger) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        fetchMore(chunk.offset + chunk.results.length);
      }
    });

    observer.observe(fetchMoreTrigger);

    return () => observer.disconnect();
  }, [fetchMore, fetchMoreTriggerRef, chunk]);

  if (!chunk.results.length) {
    return (
      <div>
        <Empty>No results found.</Empty>
      </div>
    );
  }

  return (
    <div>
      {chunk.results.map((result, i) => (
        <div key={toId(result)} className="px-4 py-2">
          <SearchResultView result={result} />
          <div className="text-xs text-nowrap text-end mt-1">
            {chunk.offset + i + 1}/{chunk.total}
          </div>
        </div>
      ))}
      {fetchMore && chunk.offset + chunk.results.length < chunk.total && (
        <div ref={fetchMoreTriggerRef} />
      )}
    </div>
  );
}
