import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";
import { useContext, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { AppContext } from "./AppContext";
import { annotateMessage, resolveCustomEmojiUrl, toId, toLocalDateTimeString } from "./logic";
import type { AttachedFile, Message } from "./types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface Props {
  message: Message;
  isFocused: (message: Message) => boolean;
  onSelectMessage: (message: Message) => void;
}

export default function MessageView({ message, isFocused, onSelectMessage }: Props) {
  const [searchParams] = useSearchParams();

  const { account, users } = useContext(AppContext);

  const id = toId(message);

  const myPost = message.contents.creator.email == account;
  const focused = isFocused(message);
  const html = useMemo(() => annotateMessage(message), [message]);
  const hidden =
    !html &&
    !message.contents.quotedMessageMetadata &&
    !message.contents.attachedFiles?.length &&
    !message.replies;

  return (
    <div data-message-id={id} className={cn("px-4", "py-2", hidden && "hidden")}>
      <Card
        className={cn("w-full", myPost && "bg-accent", focused && "outline-3")}
        onClick={() => onSelectMessage(message)}
      >
        <CardHeader>
          <CardTitle>{message.contents.creator.name}</CardTitle>
          <CardAction>
            <time className="font-mono text-xs text-nowrap">
              {toLocalDateTimeString(message.contents.postedAt)}
            </time>
          </CardAction>
        </CardHeader>
        {message.contents.quotedMessageMetadata && (
          <CardContent className="whitespace-pre-wrap break-all">
            <blockquote className="my-2 p-2 border-s-4">
              <div>{message.contents.quotedMessageMetadata.creator.name}</div>
              <div className="line-clamp-3">{message.contents.quotedMessageMetadata.text}</div>
            </blockquote>
          </CardContent>
        )}
        <CardContent>
          <pre
            className="whitespace-pre-wrap break-all"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {message.contents.attachedFiles &&
            message.contents.attachedFiles.map((file, i) => (
              <AattachedFile key={i} groupId={message.groupId} file={file} />
            ))}
        </CardContent>
      </Card>
      <div className="flex items-center gap-1 pt-1">
        {!!message.contents.reactions &&
          message.contents.reactions.map((reaction, i) => {
            const emoji = reaction.emoji.unicode ? (
              <span>{reaction.emoji.unicode}</span>
            ) : (
              <img
                src={resolveCustomEmojiUrl(message.groupId, reaction.emoji.customEmoji!)}
                className="inline w-4 h-4"
              />
            );
            const reactors = (
              <ul>
                {reaction.reactorEmails.map((reactorEmail, i) => (
                  <li key={i}>{users[reactorEmail]?.name ?? "Deleted User"}</li>
                ))}
              </ul>
            );
            return (
              <Tooltip key={i}>
                <TooltipTrigger className="inline-flex items-center justify-center">
                  <Badge variant="outline">
                    {emoji}
                    {reaction.reactorEmails.length > 1 ? ` ${reaction.reactorEmails.length}` : ""}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{reactors}</TooltipContent>
              </Tooltip>
            );
          })}
        {!!message.replies && (
          <div className="grow text-xs text-nowrap text-end">
            <Link
              to={`/${message.groupId}/${message.threadId}/*?${searchParams.toString()}`}
              className="text-blue-500 underline"
            >
              Replies: {message.replies}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function AattachedFile({ groupId, file }: { groupId: string; file: AttachedFile }) {
  const url = `/data/${groupId}/${file.exportName}`;
  if (file.width && file.height) {
    return (
      <div className="pt-2">
        <a href={url} target="_blank">
          <img
            src={url}
            alt={file.originalName}
            className="max-w-full"
            width={file.width}
            height={file.height}
            style={{ aspectRatio: file.width / file.height }}
          />
        </a>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <a href={url} className="flex items-center gap-1" download>
        <FileIcon />
        {file.originalName}
      </a>
    </div>
  );
}
