import React, { useState } from "react";

const suggestedQueries = [
  "Why was this account flagged?",
  "Show the strongest risk signals",
  "Explain the money flow",
  "Which accounts are connected?",
];

function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask about an account, transaction, or risk pattern...",
}) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) {
      return;
    }

    onSend?.(trimmedMessage);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestion = (query) => {
    if (disabled) {
      return;
    }

    onSend?.(query);
  };

  return (
    <div className="border-t border-slate-800 bg-[#0B111B] p-4">
      {/* Suggested Queries */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {suggestedQueries.map((query) => (
          <button
            key={query}
            type="button"
            disabled={disabled}
            onClick={() => handleSuggestion(query)}
            className="rounded-md border border-slate-800 bg-slate-900/30 px-2.5 py-1.5 text-[8px] text-slate-600 transition hover:border-purple-400/20 hover:bg-purple-400/5 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-end gap-2 rounded-xl border border-slate-800 bg-slate-900/30 p-2 transition focus-within:border-purple-400/30">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={2}
            placeholder={placeholder}
            className="min-h-[45px] flex-1 resize-none bg-transparent px-2 py-1 text-[10px] leading-relaxed text-slate-300 outline-none placeholder:text-slate-700 disabled:cursor-not-allowed"
          />

          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="rounded-lg bg-purple-400/10 px-4 py-2.5 text-[9px] font-semibold text-purple-400 transition hover:bg-purple-400/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {disabled ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </form>

      {/* Helper Text */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[8px] text-slate-700">
          Press Enter to send • Shift + Enter for a new line
        </p>

        <p className="hidden text-[8px] text-slate-700 sm:block">
          AI-assisted investigation
        </p>
      </div>
    </div>
  );
}

export default ChatInput;