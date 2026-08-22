import React, { useState } from "react";
import MainLayout from "../components/layout/mainlayout";

const initialMessages = [
  {
    id: 1,
    role: "assistant",
    text: "AI Investigator is ready. Ask me about an account, transaction pattern, risk signal, or connected network.",
    time: "Now",
  },
  {
    id: 2,
    role: "user",
    text: "Why is ACC-10234 considered suspicious?",
    time: "14:31",
  },
  {
    id: 3,
    role: "assistant",
    text: "ACC-10234 has a high mule probability of 92%. The strongest signals are rapid movement of received funds, elevated transaction velocity, and connections to multiple high-risk accounts. Around 86% of received funds were transferred within a short period.",
    time: "14:31",
  },
];

const suggestedQuestions = [
  "Why was this account flagged?",
  "Show the strongest risk signals",
  "Which accounts are connected to it?",
  "Summarize the money flow",
];

function AIInvestigator({ onNavigate }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  const generateResponse = (question) => {
    const lower = question.toLowerCase();

    if (lower.includes("why") || lower.includes("flag")) {
      return "The account was flagged because multiple behavioural signals are elevated: rapid fund movement, unusual transaction velocity, new counterparties, and high-risk network connections.";
    }

    if (lower.includes("risk") || lower.includes("signal")) {
      return "The strongest risk signals are rapid fund movement, transaction velocity, and network exposure. These signals together produce a high mule-account probability.";
    }

    if (lower.includes("connect") || lower.includes("network")) {
      return "The account currently has 5 observed network connections. 3 connected accounts have elevated risk scores, making the network structure important for further investigation.";
    }

    if (lower.includes("money") || lower.includes("flow")) {
      return "The observed pattern shows incoming funds being received from multiple counterparties and then rapidly distributed to other accounts. This pass-through behaviour is a significant risk indicator.";
    }

    return "Based on the available account intelligence, the account shows several suspicious behavioural and transactional patterns. I recommend reviewing its transaction history, connected entities, and risk signals together.";
  };

  const sendMessage = (messageText = input) => {
    const trimmed = messageText.trim();

    if (!trimmed || isThinking) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: trimmed,
      time: "Now",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    setTimeout(() => {
      const response = {
        id: Date.now() + 1,
        role: "assistant",
        text: generateResponse(trimmed),
        time: "Now",
      };

      setMessages((prev) => [...prev, response]);
      setIsThinking(false);
    }, 700);
  };

  const startNewInvestigation = () => {
    setMessages(initialMessages);
    setInput("");
    setIsThinking(false);
  };

  return (
    <MainLayout
      activePage="AI Investigator"
      title="AI Investigator"
      subtitle="Investigate suspicious accounts using natural-language queries and explainable intelligence"
      onNavigate={onNavigate}
    >
      {/* Page Header */}
      <div className="border-b border-slate-800 bg-[#0B111B]">
        <div className="mx-auto max-w-[1400px] px-5 py-5 lg:px-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-400/10 text-[10px] text-purple-400">
                  ✦
                </span>

                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-purple-400">
                  AI Security Assistant
                </span>
              </div>

              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
                AI Investigator
              </h1>

              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-600">
                Investigate suspicious accounts using natural-language queries
                and explainable intelligence.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <span className="text-[9px] font-medium text-emerald-400">
                    AI ONLINE
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={startNewInvestigation}
                className="rounded-lg border border-slate-800 px-3 py-2 text-[9px] text-slate-500 transition hover:border-slate-700 hover:text-slate-300"
              >
                New Investigation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto grid max-w-[1400px] gap-5 p-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:p-7">
        {/* Context Panel */}
        <aside className="rounded-xl border border-slate-800 bg-[#0B111B] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
            Investigation Context
          </p>

          {/* Selected Account */}
          <div className="mt-4 rounded-lg border border-red-400/10 bg-red-400/[0.03] p-3">
            <p className="text-[8px] uppercase tracking-wider text-slate-600">
              Selected Account
            </p>

            <p className="mt-1 font-mono text-xs font-semibold text-slate-300">
              ACC-10234
            </p>

            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <p className="text-[8px] text-slate-600">
                  Mule Probability
                </p>

                <p className="mt-1 text-xl font-bold text-red-400">
                  92%
                </p>
              </div>

              <span className="rounded-md bg-red-400/10 px-2 py-1 text-[8px] font-semibold text-red-400">
                HIGH RISK
              </span>
            </div>
          </div>

          {/* Quick Facts */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-slate-900/40 p-2.5">
              <span className="text-[9px] text-slate-600">
                Risk Score
              </span>

              <span className="font-mono text-[10px] text-red-400">
                94/100
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-900/40 p-2.5">
              <span className="text-[9px] text-slate-600">
                Connections
              </span>

              <span className="font-mono text-[10px] text-slate-300">
                5
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-900/40 p-2.5">
              <span className="text-[9px] text-slate-600">
                Risk Signals
              </span>

              <span className="font-mono text-[10px] text-orange-400">
                4
              </span>
            </div>
          </div>

          {/* Suggested Queries */}
          <div className="mt-5">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              Suggested Queries
            </p>

            <div className="space-y-1.5">
              {suggestedQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => sendMessage(question)}
                  disabled={isThinking}
                  className="w-full rounded-md border border-slate-800 bg-slate-900/30 px-2.5 py-2 text-left text-[9px] text-slate-500 transition hover:border-purple-400/20 hover:bg-purple-400/5 hover:text-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Chat */}
        <section className="flex min-h-[650px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0B111B]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-400/10 text-purple-400">
                ✦
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-300">
                  Fraud Investigation Assistant
                </p>

                <p className="mt-0.5 text-[9px] text-slate-600">
                  Explainable AI • Transaction Intelligence
                </p>
              </div>
            </div>

            <span className="rounded-md border border-emerald-400/20 bg-emerald-400/5 px-2 py-1 text-[8px] text-emerald-400">
              READY
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] ${
                      isUser
                        ? "rounded-xl rounded-br-sm bg-cyan-400/10"
                        : "rounded-xl rounded-bl-sm border border-slate-800 bg-slate-900/40"
                    } p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[8px] font-semibold uppercase tracking-wider ${
                          isUser
                            ? "text-cyan-400"
                            : "text-purple-400"
                        }`}
                      >
                        {isUser ? "You" : "AI Investigator"}
                      </span>

                      <span className="text-[8px] text-slate-700">
                        {message.time}
                      </span>
                    </div>

                    <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                      {message.text}
                    </p>
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-bl-sm border border-slate-800 bg-slate-900/40 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:150ms]" />

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:300ms]" />

                    <span className="ml-1 text-[9px] text-slate-600">
                      Analyzing...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-end gap-2 rounded-xl border border-slate-800 bg-slate-900/30 p-2 transition focus-within:border-purple-400/30">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about an account, transaction, or risk pattern..."
                rows={2}
                className="min-h-[45px] flex-1 resize-none bg-transparent px-2 py-1 text-[10px] text-slate-300 outline-none placeholder:text-slate-700"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isThinking}
                className="rounded-lg bg-purple-400/10 px-4 py-2.5 text-[9px] font-semibold text-purple-400 transition hover:bg-purple-400/20 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Analyze
              </button>
            </div>

            <p className="mt-2 text-center text-[8px] text-slate-700">
              AI-generated analysis should be verified against transaction
              evidence before taking action.
            </p>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}

export default AIInvestigator;