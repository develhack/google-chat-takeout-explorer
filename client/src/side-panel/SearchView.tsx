import SearchConditionView from "./SearchConditionView";
import SearchResultsView from "./SearchResultsView";

export default function SearchView() {
  return (
    <div className="h-full flex flex-col">
      <SearchConditionView />
      <SearchResultsView />
    </div>
  );
}
