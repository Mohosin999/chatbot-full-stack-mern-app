import React from "react";
import { PanelLeftClose, PanelLeftOpen, Search, Plus, X } from "lucide-react";

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSearchClick: () => void;
  onCreateChat: () => void;
  onClose?: () => void;
}

const SidebarHeader = ({
  collapsed,
  onToggleCollapse,
  onSearchClick,
  onCreateChat,
  onClose,
}: SidebarHeaderProps) => {
  return (
    <div>
      <div className="flex items-center justify-between my-4">
        <div className="flex items-center gap-2">
          <img src="./vite.png" alt="App Logo" className="w-7 h-7" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            ChatBOT
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onSearchClick}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
            title="Search chats"
          >
            <Search size={18} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
              title="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="max-lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>
      </div>

      <button
        onClick={onCreateChat}
        className="flex items-center justify-center gap-2 w-full p-2.5 rounded-full border border-white dark:border-[#43454A] bg-white dark:bg-[#43454A] text-gray-800 dark:text-gray-100 hover:bg-white/80 dark:hover:bg-[#43454A]/80 transition cursor-pointer text-sm mb-3 shadow-sm active:scale-101"
      >
        <Plus size={16} /> Add New Chat
      </button>
    </div>
  );
};

export default SidebarHeader;
