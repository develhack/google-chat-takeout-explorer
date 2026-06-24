import camelcaseKeys from "camelcase-keys";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { fetchJson } from "../fetch";
import Loading from "../Loading";
import { toPlainDate, toZonedDateTimeString } from "../logic";
import { type SearchResultsChunk } from "../types";
import { SearchResultsChunkPromiseView } from "./SearchResultsChunkPromiseView";

function search(searchParams: URLSearchParams) {
  const sendSearchParams = new URLSearchParams();
  searchParams.forEach((value, key) => {
    switch (key) {
      case "from":
        sendSearchParams.set(key, toZonedDateTimeString(value as string));
        break;
      case "to":
        sendSearchParams.set(
          key,
          toZonedDateTimeString(toPlainDate(value as string)?.add({ days: 1 })),
        );
        break;
      default:
        sendSearchParams.set(key, value);
    }
  });
  return fetchJson<SearchResultsChunk>(`/api/search?${sendSearchParams.toString()}`, (result) =>
    camelcaseKeys(result, { deep: true }),
  );
}

export default function SearchResultsView() {
  const [searchParams] = useSearchParams();

  const [searchResultsChunkPromiseList, setSearchResultsChunkPromiseList] = useState<
    Promise<SearchResultsChunk>[]
  >([]);

  useEffect(() => {
    if (!searchParams.get("keywords")) {
      setSearchResultsChunkPromiseList([]);
      return;
    }
    setSearchResultsChunkPromiseList([search(searchParams)]);
  }, [searchParams]);

  const fetchMore = (offset: number) => {
    searchParams.set("offset", String(offset));
    setSearchResultsChunkPromiseList([...searchResultsChunkPromiseList, search(searchParams)]);
  };

  return (
    <div className="relative grow">
      <div className="absolute h-full w-full overflow-y-auto">
        {searchResultsChunkPromiseList.map((searchResultsChunkPromise, i) => (
          <Suspense key={i} fallback={<Loading />}>
            <SearchResultsChunkPromiseView
              chunkPromise={searchResultsChunkPromise}
              fetchMore={i == searchResultsChunkPromiseList.length - 1 ? fetchMore : undefined}
            />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
