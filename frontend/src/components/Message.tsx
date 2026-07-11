// import React, { useEffect } from "react";
// import Markdown from "react-markdown";
// import Prism from "prismjs";
// import TypingIndicator from "./ui/typing-indicator";
// import type { Message as MessageType } from "@/types";

// interface MessageProps {
//   msg: MessageType;
// }

// const Message = ({ msg }: MessageProps) => {
//   useEffect(() => {
//     Prism.highlightAll();
//   }, [msg.content]);

//   if (msg.isTyping) {
//     return (
//       <div className="flex justify-start">
//         <div className="lg:p-3 rounded-lg rounded-bl-none">
//           <TypingIndicator />
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div
//       className={`flex ${
//         msg.role === "user" ? "justify-end" : "justify-start"
//       }`}
//     >
//       <div
//         className={`rounded-lg lg:max-w-[90%] ${
//           msg.role === "user"
//             ? "bg-gray-300 dark:bg-[#303030] text-gray-900 dark:text-gray-200 rounded-br-none px-3"
//             : "lg:p-3"
//         }`}
//       >
//         {msg.isStreaming && !msg.content ? (
//           <span className="flex space-x-1">
//             <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
//             <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
//             <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
//           </span>
//         ) : (
//           <div className="text-base reset-tw">
//             <Markdown>{msg.content}</Markdown>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Message;

import React, { useEffect } from "react";
import Markdown from "react-markdown";
import Prism from "prismjs";
import TypingIndicator from "./ui/typing-indicator";
import type { Message as MessageType } from "@/types";

interface MessageProps {
  msg: MessageType;
}

const Message = ({ msg }: MessageProps) => {
  useEffect(() => {
    Prism.highlightAll();
  }, [msg.content]);

  if (msg.isTyping) {
    return (
      <div className="flex justify-start">
        <div className="lg:p-3 rounded-lg rounded-bl-none">
          <TypingIndicator />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${
        msg.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`rounded-lg max-w-[90%] ${
          msg.role === "user"
            ? "bg-gray-300 dark:bg-[#303030] text-gray-900 dark:text-gray-200 rounded-br-none px-3"
            : "lg:p-3"
        }`}
      >
        {msg.isStreaming && !msg.content ? (
          <span className="flex space-x-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <div className="text-base reset-tw">
            <Markdown>{msg.content}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
