import React, { useEffect, useRef } from "react";
import ChatMessage from "./chatmessage";

function ChatWindow({
  messages = [],
  isThinking = false,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

          <span className="text-[8px] font-medium uppercase tracking-wider text-slate-600">
            Investigation session active
          </span>
        </div>

        <span className="text-[8px] text-slate-700">
          {messages.length} message
          {messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[400px] items-center justify-center">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-400/10 text-lg text-purple-400">
                ✦
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-300">
                Start an Investigation
              </h3>

              <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
                Ask the AI Investigator about suspicious accounts,
                transaction behaviour, risk signals, or network
                connections.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
              />
            ))}

            {/* AI Thinking */}
            {isThinking && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-bl-sm border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />

                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:150ms]" />

                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:300ms]" />
                    </div>

                    <span className="text-[9px] text-slate-600">
                      Analyzing transaction intelligence...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;