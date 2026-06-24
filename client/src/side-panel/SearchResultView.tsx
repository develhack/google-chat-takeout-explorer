import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { AppContext } from "../AppContext";
import { isTopic, matchId, toLocalDateTimeString } from "../logic";
import type { SearchResult } from "../types";

interface Props {
  result: SearchResult;
}

export default function SearchResultView({ result }: Props) {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const { account, users, groups } = useContext(AppContext);

  const topic = isTopic(result);
  let to = `/${result.groupId}/${result.threadId}`;
  if (!topic) {
    to += `/${result.messageId}`;
  }

  const focused = matchId(result, params, true);
  const myPost = result.author == account;

  return (
    <Link to={`${to}?${searchParams.toString()}`}>
      <Card className={cn("w-full", myPost && "bg-accent", focused && "outline-3")}>
        <CardHeader>
          <CardTitle className="flex flex-row">
            <span className="grow truncate">
              {groups[result.groupId]?.name}
              {!topic && " > Thread"}
            </span>
            <time className="font-mono text-xs text-nowrap">
              {toLocalDateTimeString(result.postedAt)}
            </time>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users[result.author]?.name ?? result.author}:&nbsp;
          {(result.texts ?? []).map((text, i) => (
            <span key={i} className="message" dangerouslySetInnerHTML={{ __html: text }} />
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}
