import React from "react";

function ChatMessage({ message }) {
  const isUser = message?.role === "user";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[82%] rounded-xl p-3 ${
          isUser
            ? "rounded-br-sm bg-cyan-400/10"
            : "rounded-bl-sm border border-slate-800 bg-slate-900/40"
        }`}
      >
        {/* Message Header */}
        <div className="flex items-center gap-2">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-md text-[8px] ${
              isUser
                ? "bg-cyan-400/10 text-cyan-400"
                : "bg-purple-400/10 text-purple-400"
            }`}
          >
            {isUser ? "U" : "✦"}
          </div>

          <span
            className={`text-[8px] font-semibold uppercase tracking-wider ${
              isUser ? "text-cyan-400" : "text-purple-400"
            }`}
          >
            {isUser ? "You" : "AI Investigator"}
          </span>

          {message?.time && (
            <span className="text-[8px] text-slate-700">
              {message.time}
            </span>
          )}
        </div>

        {/* Message Content */}
        <p className="mt-2 whitespace-pre-line text-[10px] leading-relaxed text-slate-400">
          {message?.text}
        </p>

        {/* AI Evidence */}
        {!isUser && message?.evidence?.length > 0 && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-700">
              Supporting Signals
            </p>

            <div className="mt-2 space-y-1.5">
              {message.evidence.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-start gap-2 rounded-md bg-slate-950/40 px-2.5 py-2"
                >
                  <span className="mt-0.5 text-[8px] text-purple-400">
                    •
                  </span>

                  <span className="text-[9px] leading-relaxed text-slate-500">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Indicator */}
        {!isUser && message?.riskScore !== undefined && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-red-400/10 bg-red-400/[0.03] px-3 py-2">
            <span className="text-[8px] uppercase tracking-wider text-slate-700">
              AI Risk Assessment
            </span>

            <span className="font-mono text-[10px] font-semibold text-red-400">
              {message.riskScore}/100
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;