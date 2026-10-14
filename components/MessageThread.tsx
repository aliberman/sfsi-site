import { formatDateTime } from "@/lib/format";

type Msg = { id: string; body: string; internal: boolean; createdAt: Date; author: { id: string; name: string; role: string } | null };

export default function MessageThread({ messages, viewerId }: { messages: Msg[]; viewerId: string }) {
  if (messages.length === 0) return <p className="text-sm text-gray-500">No messages yet.</p>;
  return (
    <ul className="grid gap-3">
      {messages.map((m) => {
        const mine = m.author?.id === viewerId;
        return (
          <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? "ml-auto bg-brand-50" : "bg-gray-100"} ${m.internal ? "border border-amber-300 bg-amber-50" : ""}`}>
            <div className="mb-1 flex gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{m.author?.name ?? "SFSI"}</span>
              {m.author && m.author.role !== "client" && <span>SFSI team</span>}
              {m.internal && <span className="font-medium text-amber-700">Internal note</span>}
              <span>{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="whitespace-pre-line">{m.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
