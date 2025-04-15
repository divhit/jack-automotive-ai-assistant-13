import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  Mic, 
  Save, 
  Phone, 
  User, 
  Car, 
  FileText, 
  AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SelectValue, SelectTrigger, SelectContent, SelectItem, Select } from "@/components/ui/select";
import { salesLeads, inventoryItems } from "@/data";

const ManualLeadEntry = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    phoneNumber: "",
    vehicleInterest: "",
    leadSource: "",
    notes: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user selects
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Phone format should be (555) 123-4567";
    }
    
    if (!formData.vehicleInterest.trim()) {
      newErrors.vehicleInterest = "Vehicle interest is required";
    }
    
    if (!formData.leadSource) {
      newErrors.leadSource = "Lead source is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // In a real app, this would save the data to a database
      toast({
        title: "Lead successfully created",
        description: `${formData.customerName} has been added as a new lead.`,
      });
      
      // Reset form
      setFormData({
        customerName: "",
        phoneNumber: "",
        vehicleInterest: "",
        leadSource: "",
        notes: ""
      });
    } else {
      toast({
        title: "Error",
        description: "Please correct the errors in the form.",
        variant: "destructive"
      });
    }
  };

  const startVoiceRecording = () => {
    setIsRecording(true);
    
    // Simulate voice recording for 3 seconds
    setTimeout(() => {
      setIsRecording(false);
      
      // Simulate transcription result
      setFormData(prev => ({
        ...prev,
        notes: prev.notes + (prev.notes ? " " : "") + "Customer is interested in financing options and would like to schedule a test drive this weekend. Follow up needed by Friday."
      }));
      
      toast({
        title: "Voice note transcribed",
        description: "Your voice note has been added to the notes field.",
      });
    }, 3000);
  };

  // Generate a list of vehicle interests based on inventory
  const vehicleOptions = inventoryItems.map(item => `${item.year} ${item.make} ${item.model} ${item.trim}`);

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-automotive-primary" />
              <span>Manual Lead Entry</span>
            </div>
          </CardTitle>
          <CardDescription>
            Add a new customer lead after an in-person dealership visit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information Section */}
            <div className="space-y-4">
              <div className="font-medium text-sm text-muted-foreground flex items-center mb-2">
                <User className="mr-2 h-4 w-4" />
                <span>Customer Information</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    placeholder="John Smith"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className={errors.customerName ? "border-red-500" : ""}
                  />
                  {errors.customerName && (
                    <div className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {errors.customerName}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="(555) 123-4567"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className={errors.phoneNumber ? "border-red-500" : ""}
                  />
                  {errors.phoneNumber && (
                    <div className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {errors.phoneNumber}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Information Section */}
            <div className="space-y-4">
              <div className="font-medium text-sm text-muted-foreground flex items-center mb-2">
                <Car className="mr-2 h-4 w-4" />
                <span>Vehicle Information</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleInterest">
                    Vehicle Interest <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    name="vehicleInterest" 
                    value={formData.vehicleInterest}
                    onValueChange={(value) => handleSelectChange("vehicleInterest", value)}
                  >
                    <SelectTrigger className={errors.vehicleInterest ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleOptions.map((vehicle, index) => (
                        <SelectItem key={index} value={vehicle}>
                          {vehicle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vehicleInterest && (
                    <div className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {errors.vehicleInterest}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="leadSource">
                    Lead Source <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    name="leadSource" 
                    value={formData.leadSource}
                    onValueChange={(value) => handleSelectChange("leadSource", value)}
                  >
                    <SelectTrigger className={errors.leadSource ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="AutoTrader">AutoTrader</SelectItem>
                      <SelectItem value="Facebook Marketplace">Facebook Marketplace</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.leadSource && (
                    <div className="text-sm text-red-500 flex items-center mt-1">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {errors.leadSource}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <div className="font-medium text-sm text-muted-foreground flex items-center mb-2">
                <FileText className="mr-2 h-4 w-4" />
                <span>Additional Notes</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="notes">Notes</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={startVoiceRecording}
                    className={`text-xs gap-1 ${isRecording ? "bg-red-50 text-red-500 animate-pulse border-red-200" : ""}`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    {isRecording ? "Recording..." : "Voice input"}
                  </Button>
                </div>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Enter any additional notes about the customer's preferences, timeline, etc."
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={5}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button type="submit" className="w-full sm:w-auto gap-2">
                <Save className="h-4 w-4" />
                Save Lead
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualLeadEntry;
