import React, { useEffect, useState, useRef } from "react";
import Markdown from "react-markdown";
import Prism from "prismjs";
import { Pencil, Send, X } from "lucide-react";
import TypingIndicator from "./ui/typing-indicator";
import type { Message as MessageType } from "@/types";

interface MessageProps {
  msg: MessageType;
  onEdit?: (messageId: string | number, newContent: string) => void;
}

const Message = ({ msg, onEdit }: MessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Prism.highlightAll();
  }, [msg.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditText(msg.content);
    }
  }, [msg.content, isEditing]);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  useEffect(() => {
    if (isEditing) adjustHeight();
  }, [isEditing, editText]);

  const handleSave = () => {
    if (editText.trim() && editText !== msg.content && onEdit) {
      onEdit(msg.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(msg.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (msg.isTyping) {
    return (
      <div className="flex justify-start">
        <div className="lg:p-3 rounded-lg rounded-bl-none">
          <TypingIndicator />
        </div>
      </div>
    );
  }

  const showEditButton = msg.role === "user" && onEdit && !isEditing && !msg.isStreaming;

  return (
    <div
      className={`flex ${
        msg.role === "user" ? "justify-end group" : "justify-start"
      }`}
    >
      <div
        className={`relative max-w-[85%] md:max-w-[75%] ${
          msg.role === "user"
            ? isEditing
              ? "bg-gray-200 dark:bg-[#3a3a3a] rounded-2xl w-full md:max-w-2xl"
              : "bg-gray-300 dark:bg-[#303030] rounded-2xl rounded-br-sm px-3"
            : "w-full"
        }`}
      >
        {msg.isStreaming && !msg.content ? (
          <span className="flex space-x-1 px-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        ) : isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
              className="w-full resize-none overflow-hidden rounded-xl bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
              rows={1}
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-400/30 dark:hover:bg-gray-600/50 transition-all active:scale-95"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editText.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
              >
                Send
                <Send size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {msg.files && msg.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {msg.files.map((file, i) =>
                  file.mimeType === "application/pdf" ? (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-[#3a3a3a] px-2 py-1.5 text-xs">
                      <svg className="text-red-500 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <span className="max-w-24 truncate text-gray-600 dark:text-gray-400">{file.name}</span>
                    </div>
                  ) : (
                    <img
                      key={i}
                      src={`data:${file.mimeType};base64,${file.data}`}
                      alt={file.name}
                      className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                    />
                  )
                )}
              </div>
            )}
            <div className="text-base reset-tw text-gray-900 dark:text-gray-200 leading-relaxed">
              <Markdown>{msg.content}</Markdown>
            </div>
          </div>
        )}

        {showEditButton && (
          <button
            onClick={() => {
              setEditText(msg.content);
              setIsEditing(true);
            }}
            className="absolute -right-8 top-0 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-blue-500 dark:hover:text-blue-400"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Message;
