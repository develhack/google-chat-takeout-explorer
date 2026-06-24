import type { Annotation, CustomEmoji, Message } from "./types";

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function toTemporal(dateTime?: string | Date | Temporal.Instant | null) {
  if (!dateTime) {
    return null;
  }

  if (typeof dateTime === "string") {
    return Temporal.Instant.from(dateTime);
  }

  if (dateTime instanceof Date) {
    return dateTime.toTemporalInstant();
  }

  return dateTime;
}

export function toLocalDateTimeString(dateTime?: string | Date | Temporal.Instant | null) {
  const str = toTemporal(dateTime)?.toString({ timeZone });
  if (!str) {
    return "";
  }

  return `${str.substring(0, 10)} ${str.substring(11, 19)}`;
}

export function toPlainDate(date?: string | Date | Temporal.PlainDate | null) {
  if (!date) {
    return null;
  }

  if (typeof date === "string") {
    return Temporal.PlainDate.from(date);
  }

  if (date instanceof Date) {
    return date.toTemporalInstant().toZonedDateTimeISO(timeZone).toPlainDate();
  }

  return date;
}

export function toZonedDateTimeString(date?: string | Date | Temporal.PlainDate | null) {
  return (
    toPlainDate(date)
      ?.toZonedDateTime(timeZone)
      .toString({ calendarName: "never", timeZoneName: "never" }) ?? ""
  );
}

export function toId({ groupId, threadId, messageId }: Identifiable) {
  if (!groupId) {
    return "";
  }

  if (!threadId) {
    return groupId;
  }

  return `${groupId}/${threadId}/${messageId ? messageId : threadId}`;
}

interface Identifiable {
  groupId?: string;
  threadId?: string;
  messageId?: string;
}

export function isTopic({ threadId, messageId }: Identifiable) {
  return !!threadId && (!messageId || threadId === messageId);
}

export function matchId(message: Identifiable, identifer: Identifiable, exactly = false) {
  if (!identifer.groupId || message.groupId !== identifer.groupId) {
    return false;
  }

  if (!identifer.threadId || message.threadId !== identifer.threadId) {
    return false;
  }

  if ((!exactly || !identifer.messageId) && isTopic(message)) {
    return true;
  }

  return message.messageId === identifer.messageId;
}

const annotationOrder: Record<string, number> = {
  HIDDEN: 1,
  BOLD: 2,
  FONT_COLOR: 3,
  ITALIC: 4,
  STRIKE: 5,
  UNDERLINE: 6,
  HYPERLINK: 7,
  MONOSPACE_BLOCK: 8,
  MONOSPACE: 9,
  BULLETED_LIST_ITEM: 10,
  BULLETED_LIST: 11,
  QUOTE_BLOCK: 12,
};

function annotationComparator(a: Annotation, b: Annotation) {
  if (a.startIndex !== b.startIndex) {
    return a.startIndex - b.startIndex;
  }
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  return (
    annotationOrder[a.formatMetadata?.formatType ?? "HYPERLINK"] -
    annotationOrder[b.formatMetadata?.formatType ?? "HYPERLINK"]
  );
}

function wrapWithTag(
  elements: string[][],
  annotation: Annotation,
  startTag: string,
  endTag: string,
) {
  if (!annotation.length) {
    elements.push([startTag, endTag]);
    return;
  }

  const startElement = elements[annotation.startIndex];
  if (startElement) {
    startElement.unshift(startTag);
  } else {
    console.error("No start element found.", annotation, elements.flat(Infinity).join(""));
  }

  const endElement = elements[annotation.startIndex + annotation.length - 1];
  if (endElement) {
    endElement.push(endTag);
  } else {
    console.error("No end element found.", annotation, elements.flat(Infinity).join(""));
  }
}

function rewriteHref(href: string) {
  if (!href) {
    return href;
  }

  if (href.startsWith("https://chat.google.com/")) {
    const pathElements = new URL(href).pathname.split("/");
    pathElements.shift(); // empty
    pathElements.shift(); // room or dm
    const groupId = pathElements.shift();
    const threadId = pathElements.shift();
    const messageId = pathElements.shift();
    return threadId === messageId
      ? `/${groupId}/${threadId}`
      : `/${groupId}/${threadId}/${messageId}`;
  }

  return href;
}

export function resolveCustomEmojiUrl(groupId: string, customEmoji: CustomEmoji) {
  const shortcode = customEmoji.shortcode.replaceAll(":", "");
  let ext = "png";
  switch (customEmoji.contentType) {
    case "image/jpeg":
      ext = "jpg";
      break;
    case "image/gif":
      ext = "gif";
      break;
  }
  return `/data/${groupId}/CustomEmoji-${shortcode}.${ext}`;
}

export function annotateMessage(message: Message) {
  const annotations = message.contents.annotations;
  if (!annotations?.length) {
    return message.contents.text;
  }

  // const elements = [...message.contents.text].map(s => s === "�" ? "" : s).map(s => [s]); // misaligned index of a surrogate pair.
  const elements = (message.contents.text || "")
    .split("")
    .map((s) => (s === "�" ? "" : s))
    .map((s) => [s]);
  for (const annotation of annotations.toSorted(annotationComparator)) {
    switch (annotation.formatMetadata?.formatType) {
      case "HIDDEN":
        wrapWithTag(elements, annotation, '<span class="hidden">', "</span>");
        continue;
      case "BOLD":
        wrapWithTag(elements, annotation, "<b>", "</b>");
        continue;
      case "FONT_COLOR": {
        const color = annotation.formatMetadata.fontColor;
        const r = (color >>> 16) & 0xff;
        const g = (color >>> 8) & 0xff;
        const b = color & 0xff;
        wrapWithTag(
          elements,
          annotation,
          `<span style="color: rgb(${r}, ${g}, ${b});">`,
          "</span>",
        );
        continue;
      }
      case "ITALIC":
        wrapWithTag(elements, annotation, "<i>", "</i>");
        continue;
      case "STRIKE":
        wrapWithTag(elements, annotation, "<s>", "</s>");
        continue;
      case "UNDERLINE":
        wrapWithTag(elements, annotation, "<u>", "</u>");
        continue;
      case "MONOSPACE_BLOCK":
        wrapWithTag(
          elements,
          annotation,
          '<div class="overflow-x-auto p-2 bg-accent"><code class="whitespace-pre">',
          "</code></div>",
        );
        continue;
      case "MONOSPACE":
        wrapWithTag(elements, annotation, '<code class="whitespace-pre bg-accent">', "</code>");
        continue;
      case "BULLETED_LIST_ITEM":
        wrapWithTag(elements, annotation, "<li>", "</li>");
        continue;
      case "BULLETED_LIST":
        wrapWithTag(elements, annotation, '<ul class="list-disc pl-4">', "</ul>");
        continue;
      case "QUOTE_BLOCK":
        wrapWithTag(
          elements,
          annotation,
          '<blockquote class="my-2 p-2 border-s-4">',
          "</blockquote>",
        );
        continue;
    }
    if (annotation.customEmojiMetadata) {
      wrapWithTag(
        elements,
        annotation,
        `<img src="${resolveCustomEmojiUrl(message.groupId, annotation.customEmojiMetadata.customEmoji)}" class="inline w-4 h-4">`,
        "</img>",
      );
      continue;
    }
    if (annotation.urlMetadata?.url) {
      const href = rewriteHref(Object.values(annotation.urlMetadata.url)[0]);
      wrapWithTag(
        elements,
        annotation,
        `<a href="${href}" target="_blank" class="text-blue-500 underline">`,
        "</a>",
      );
      continue;
    }
    if (annotation.interactionData) {
      const href = rewriteHref(Object.values(annotation.interactionData.url)[0]);
      wrapWithTag(
        elements,
        annotation,
        `<a href="${href}" target="_blank" class="text-blue-500 underline">`,
        "</a>",
      );
      continue;
    }
    if (annotation.videoCallMetadata) {
      const href = Object.values(annotation.videoCallMetadata.meetingSpace)[0];
      wrapWithTag(
        elements,
        annotation,
        `<a href="${href}" target="_blank" class="text-blue-500 underline">`,
        "</a>",
      );
      continue;
    }
    if (annotation.driveMetadata) {
      const href = `https://drive.google.com/file/d/${annotation.driveMetadata.id}`;
      wrapWithTag(
        elements,
        annotation,
        `<a href="${href}" title="${annotation.driveMetadata.title}" target="_blank" class="text-blue-500 underline">`,
        "</a>",
      );
      continue;
    }

    console.error("Unsupported annotation.", annotation);
  }

  return elements.flat(Infinity).join("");
}
