import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Plans from "@/components/Plans";

const Upgrade = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "ChatBOT - Upgrade";
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212]">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
        >
          <ChevronLeft size={20} /> Back
        </button>
      </div>
      <Plans />
    </div>
  );
};

export default Upgrade;
