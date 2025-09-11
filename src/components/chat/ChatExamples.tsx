
import { Button } from "@/components/ui/button";
import { ChevronsDown } from "lucide-react";
import { chatExamples } from "@/data";

interface ChatExamplesProps {
  setCurrentMessage: (message: string) => void;
}

export const ChatExamples = ({ setCurrentMessage }: ChatExamplesProps) => {
  return (
    <div className="p-4 bg-gray-50 border-b">
      <div className="flex flex-wrap gap-2">
        {chatExamples.slice(0, 3).map((example, index) => (
          <Button 
            key={index} 
            variant="outline" 
            size="sm"
            className="text-xs"
            onClick={() => setCurrentMessage(example.query)}
          >
            {example.query.length > 50 ? example.query.substring(0, 50) + "..." : example.query}
          </Button>
        ))}
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs flex items-center"
        >
          <span>More examples</span>
          <ChevronsDown className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
