import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "@/hooks/useAppStore";
import { updateCustomInstructions } from "@/features/user/userSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import toast from "react-hot-toast";

const SYSTEM_PROMPT_MAX_TOKENS = 6_400;

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

interface ProfilePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProfilePopup = ({ open, onOpenChange }: ProfilePopupProps) => {
  const dispatch = useDispatch();
  const { profile, updating } = useAppSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState<"personalize" | "settings">("personalize");
  const [instructions, setInstructions] = useState(profile?.customInstructions || "");

  React.useEffect(() => {
    if (open) {
      setInstructions(profile?.customInstructions || "");
    }
  }, [open, profile?.customInstructions]);

  const tokenCount = useMemo(() => estimateTokens(instructions), [instructions]);
  const overLimit = tokenCount > SYSTEM_PROMPT_MAX_TOKENS;

  const handleSave = async () => {
    const res = await dispatch(updateCustomInstructions(instructions) as any);
    if (res.meta.requestStatus === "fulfilled") {
      toast.success("Custom instructions saved");
      onOpenChange(false);
    } else {
      toast.error(res.payload || "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white !p-0 !gap-0 overflow-hidden max-w-md">
        <DialogHeader className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">Profile</DialogTitle>
            <DialogClose className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-lg leading-none">&times;</DialogClose>
          </div>
        </DialogHeader>

        <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
          <button
            onClick={() => setActiveTab("personalize")}
            className={`pb-2 px-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "personalize"
                ? "text-[#48A4FF] border-b-2 border-[#48A4FF]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Personalize
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-2 px-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "settings"
                ? "text-[#48A4FF] border-b-2 border-[#48A4FF]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            Settings
          </button>
        </div>

        <div className="px-5 py-4">
          {activeTab === "personalize" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Instructions for chatbot</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  These instructions will be included in every prompt you send to the AI.
                </p>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Always respond in Bengali. Be concise and use simple language."
                  rows={6}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-[#48A4FF]"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${overLimit ? "text-red-500 font-medium" : tokenCount > SYSTEM_PROMPT_MAX_TOKENS * 0.8 ? "text-yellow-500" : "text-gray-400"}`}>
                    {tokenCount.toLocaleString()} / {SYSTEM_PROMPT_MAX_TOKENS.toLocaleString()} tokens
                    {overLimit && ` — exceeds limit by ${(tokenCount - SYSTEM_PROMPT_MAX_TOKENS).toLocaleString()} tokens`}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating || overLimit}
                  className="px-4 py-2 text-sm rounded-lg bg-[#48A4FF] text-white hover:bg-[#3a8ee8] disabled:opacity-50 cursor-pointer"
                >
                  {updating ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={profile?.name || ""}
                  disabled
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  value={profile?.email || ""}
                  disabled
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePopup;
