
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface LeadInternalNotesProps {
  internalNote: string;
  onInternalNoteChange: (note: string) => void;
  onAddNote: () => void;
}

export const LeadInternalNotes = ({ 
  internalNote, 
  onInternalNoteChange, 
  onAddNote 
}: LeadInternalNotesProps) => {
  return (
    <div className="mt-4">
      <h5 className="text-sm font-medium mb-1">Add Internal Note</h5>
      <Textarea 
        placeholder="Add private note about this lead..." 
        className="min-h-24" 
        value={internalNote}
        onChange={(e) => onInternalNoteChange(e.target.value)}
      />
      <div className="flex justify-end mt-2">
        <Button 
          size="sm"
          onClick={onAddNote}
          disabled={!internalNote.trim()}
        >
          Add Note
        </Button>
      </div>
    </div>
  );
};
