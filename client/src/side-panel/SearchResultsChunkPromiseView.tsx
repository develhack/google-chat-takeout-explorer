import { use } from "react";
import SearchResultsChunkView from "./SearchResultsChunkView";
import type { SearchResultsChunk } from "../types";

interface Props {
  chunkPromise: Promise<SearchResultsChunk>;
  fetchMore?: (offset: number) => void;
}

export function SearchResultsChunkPromiseView({ chunkPromise, fetchMore }: Props) {
  const chunk = use(chunkPromise);

  return <SearchResultsChunkView chunk={chunk} fetchMore={fetchMore} />;
}
