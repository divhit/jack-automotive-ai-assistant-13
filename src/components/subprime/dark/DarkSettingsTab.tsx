import React from 'react';
import { Phone, Bot, Bell, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DarkSettingsTabProps {
  agentName: string;
  onAgentNameChange: (val: string) => void;
  agentPhoneNumber: string;
  onAgentPhoneChange: (val: string) => void;
  settingsData: {
    autoChaseEnabled: boolean;
    notificationsEnabled: boolean;
    smartResponsesEnabled: boolean;
    moodDetectionEnabled: boolean;
    priorityLevel: string;
  };
  onSettingChange: (key: string, value: any) => void;
  isAutoMode: boolean;
  onToggleAutoMode: (val: boolean) => void;
}

const darkInputClasses =
  'bg-stone-50 border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-blue-300 focus:bg-white focus-visible:ring-0 rounded-md transition-colors duration-150';

const darkLabelClasses = 'text-[11px] font-medium text-stone-500 uppercase tracking-wider';

const DarkSettingsTab: React.FC<DarkSettingsTabProps> = ({
  agentName,
  onAgentNameChange,
  agentPhoneNumber,
  onAgentPhoneChange,
  settingsData,
  onSettingChange,
  isAutoMode,
  onToggleAutoMode,
}) => {
  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {/* Section 1: Agent Configuration */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-stone-400" />
          <h3 className="text-[13px] font-medium text-stone-800 tracking-tight">Agent Configuration</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Agent Name</label>
            <Input
              type="text"
              value={agentName}
              onChange={(e) => onAgentNameChange(e.target.value)}
              placeholder="Enter your name (e.g., John Smith)"
              className={darkInputClasses}
            />
          </div>
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Agent Phone Number</label>
            <Input
              type="tel"
              value={agentPhoneNumber}
              onChange={(e) => onAgentPhoneChange(e.target.value)}
              placeholder="Enter your phone number (e.g., +1234567890)"
              className={darkInputClasses}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
          <span className="text-xs text-stone-500">
            Set your phone number to receive manual call connections
          </span>
        </div>
      </div>

      {/* Section 2: Conversation Mode */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-stone-400" />
          <h3 className="text-[13px] font-medium text-stone-800 tracking-tight">Conversation Mode</h3>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium ${
                  isAutoMode ? 'text-blue-600' : 'text-stone-400'
                }`}
              >
                Auto
              </span>
              <Switch
                checked={!isAutoMode}
                onCheckedChange={(checked) => onToggleAutoMode(!checked)}
                className="data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-blue-600"
              />
              <span
                className={`text-sm font-medium ${
                  !isAutoMode ? 'text-amber-600' : 'text-stone-400'
                }`}
              >
                Manual
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              {isAutoMode
                ? 'AI handles conversations automatically with smart responses and follow-ups.'
                : 'You manually control all conversations. AI provides suggestions but does not send messages.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: AI Features */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-4 h-4 text-stone-400" />
          <h3 className="text-[13px] font-medium text-stone-800 tracking-tight">AI Features</h3>
        </div>

        <div className="space-y-4">
          {/* Auto Chase */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-[13px] font-medium text-stone-800">Auto Chase</span>
              </div>
              <p className="text-[12px] text-stone-500 mt-0.5 ml-6">
                Automated follow-up sequences for unresponsive leads
              </p>
            </div>
            <Switch
              checked={settingsData.autoChaseEnabled}
              onCheckedChange={(checked) => onSettingChange('autoChaseEnabled', checked)}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-stone-300"
            />
          </div>

          {/* Smart Responses */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-500" />
                <span className="text-[13px] font-medium text-stone-800">Smart Responses</span>
              </div>
              <p className="text-[12px] text-stone-500 mt-0.5 ml-6">
                AI analyzes conversations and suggests optimal responses
              </p>
            </div>
            <Switch
              checked={settingsData.smartResponsesEnabled}
              onCheckedChange={(checked) => onSettingChange('smartResponsesEnabled', checked)}
              className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-stone-300"
            />
          </div>

          {/* Mood Detection */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-500" />
                <span className="text-[13px] font-medium text-stone-800">Mood Detection</span>
              </div>
              <p className="text-[12px] text-stone-500 mt-0.5 ml-6">
                Detect customer sentiment and adjust conversation tone
              </p>
            </div>
            <Switch
              checked={settingsData.moodDetectionEnabled}
              onCheckedChange={(checked) => onSettingChange('moodDetectionEnabled', checked)}
              className="data-[state=checked]:bg-amber-600 data-[state=unchecked]:bg-stone-300"
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-500" />
                <span className="text-[13px] font-medium text-stone-800">Notifications</span>
              </div>
              <p className="text-[12px] text-stone-500 mt-0.5 ml-6">
                Get notified of call events and text message activity
              </p>
            </div>
            <Switch
              checked={settingsData.notificationsEnabled}
              onCheckedChange={(checked) => onSettingChange('notificationsEnabled', checked)}
              className="data-[state=checked]:bg-yellow-600 data-[state=unchecked]:bg-stone-300"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Priority Level */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-stone-400" />
          <h3 className="text-[13px] font-medium text-stone-800 tracking-tight">Priority Level</h3>
        </div>

        <div className="space-y-1.5">
          <label className={darkLabelClasses}>Lead Priority</label>
          <Select
            value={settingsData.priorityLevel || 'Normal'}
            onValueChange={(value) => onSettingChange('priorityLevel', value)}
          >
            <SelectTrigger className="bg-stone-50 border-stone-200 text-stone-900 focus:ring-0">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent className="bg-white border-stone-200 text-stone-900">
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-stone-500 mt-1">
            Controls how aggressively this lead is pursued and the frequency of follow-ups.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DarkSettingsTab;
