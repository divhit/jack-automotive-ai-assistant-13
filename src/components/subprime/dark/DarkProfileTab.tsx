import React from 'react';
import { User, Home, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DarkProfileTabProps {
  profileFormData: {
    customerName: string;
    phoneNumber: string;
    email: string;
    dateOfBirth: string;
    ssnLast4: string;
    driversLicense: string;
    currentAddress: string;
    city: string;
    state: string;
    zipCode: string;
    lengthAtAddress: string;
    housingStatus: string;
    monthlyHousingPayment: string;
  };
  onFieldChange: (fieldName: string, value: any) => void;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const darkInputClasses =
  'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus-visible:ring-blue-500/30 focus-visible:ring-offset-zinc-900';

const darkSelectTriggerClasses =
  'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/30 focus:ring-offset-zinc-900';

const darkSelectContentClasses =
  'bg-zinc-800 border-zinc-700 text-zinc-100';

const darkLabelClasses = 'text-xs font-medium text-zinc-400 uppercase tracking-wider';

const DarkProfileTab: React.FC<DarkProfileTabProps> = ({
  profileFormData,
  onFieldChange,
  isSaving,
  saveStatus,
}) => {
  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full relative">
      {/* Save status indicator */}
      <div className="absolute top-4 right-4 z-10">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <span>Save failed</span>
          </div>
        )}
      </div>

      {/* Section 1: Identity & Contact */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Identity & Contact</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Full Name</label>
            <Input
              value={profileFormData.customerName || ''}
              onChange={(e) => onFieldChange('customerName', e.target.value)}
              placeholder="Enter full name"
              className={darkInputClasses}
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Phone Number</label>
            <Input
              value={profileFormData.phoneNumber || ''}
              onChange={(e) => onFieldChange('phoneNumber', e.target.value)}
              placeholder="(604) 908-5474"
              className={darkInputClasses}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Email Address</label>
            <Input
              type="email"
              value={profileFormData.email || ''}
              onChange={(e) => onFieldChange('email', e.target.value)}
              placeholder="Enter email address"
              className={darkInputClasses}
            />
          </div>

          {/* Date of Birth */}
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Date of Birth</label>
            <Input
              type="date"
              value={profileFormData.dateOfBirth || ''}
              onChange={(e) => onFieldChange('dateOfBirth', e.target.value)}
              placeholder="YYYY-MM-DD"
              className={darkInputClasses}
            />
          </div>

          {/* SSN Last 4 */}
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>SSN (Last 4)</label>
            <Input
              value={profileFormData.ssnLast4 || ''}
              onChange={(e) => onFieldChange('ssnLast4', e.target.value)}
              placeholder="XXXX"
              maxLength={4}
              className={darkInputClasses}
            />
          </div>

          {/* Driver's License */}
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Driver's License</label>
            <Input
              value={profileFormData.driversLicense || ''}
              onChange={(e) => onFieldChange('driversLicense', e.target.value)}
              placeholder="License number"
              className={darkInputClasses}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Residence & Housing */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-300">Residence & Housing</h3>
        </div>

        <div className="space-y-4">
          {/* Current Address - full width */}
          <div className="space-y-1.5">
            <label className={darkLabelClasses}>Current Address</label>
            <Input
              value={profileFormData.currentAddress || ''}
              onChange={(e) => onFieldChange('currentAddress', e.target.value)}
              placeholder="Street address"
              className={darkInputClasses}
            />
          </div>

          {/* City / State */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={darkLabelClasses}>City</label>
              <Input
                value={profileFormData.city || ''}
                onChange={(e) => onFieldChange('city', e.target.value)}
                placeholder="City"
                className={darkInputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <label className={darkLabelClasses}>State</label>
              <Input
                value={profileFormData.state || ''}
                onChange={(e) => onFieldChange('state', e.target.value)}
                placeholder="State"
                className={darkInputClasses}
              />
            </div>
          </div>

          {/* ZIP / Length at Address */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={darkLabelClasses}>ZIP Code</label>
              <Input
                value={profileFormData.zipCode || ''}
                onChange={(e) => onFieldChange('zipCode', e.target.value)}
                placeholder="ZIP code"
                className={darkInputClasses}
              />
            </div>
            <div className="space-y-1.5">
              <label className={darkLabelClasses}>Length at Address</label>
              <Select
                value={profileFormData.lengthAtAddress || ''}
                onValueChange={(value) => onFieldChange('lengthAtAddress', value)}
              >
                <SelectTrigger className={darkSelectTriggerClasses}>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClasses}>
                  <SelectItem value="Less than 1 year">Less than 1 year</SelectItem>
                  <SelectItem value="1-2 years">1-2 years</SelectItem>
                  <SelectItem value="2-5 years">2-5 years</SelectItem>
                  <SelectItem value="5+ years">5+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Housing Status / Monthly Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={darkLabelClasses}>Housing Status</label>
              <Select
                value={profileFormData.housingStatus || ''}
                onValueChange={(value) => onFieldChange('housingStatus', value)}
              >
                <SelectTrigger className={darkSelectTriggerClasses}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClasses}>
                  <SelectItem value="Own">Own</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Living with family">Living with family</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className={darkLabelClasses}>Monthly Housing Payment</label>
              <Input
                type="number"
                value={profileFormData.monthlyHousingPayment || ''}
                onChange={(e) => onFieldChange('monthlyHousingPayment', e.target.value)}
                placeholder="$0"
                className={darkInputClasses}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DarkProfileTab;
