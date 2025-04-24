
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { User, HomeIcon, Briefcase, CircleDollarSign, Building, ClipboardCheck, Calendar } from "lucide-react";

interface SectionToggleProps {
  name: string;
  isEnabled: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

const SectionToggle = ({ name, isEnabled, onToggle, icon, title, description }: SectionToggleProps) => (
  <Card className={!isEnabled ? "opacity-60" : ""}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-md">{title}</CardTitle>
        </div>
        <Switch 
          checked={isEnabled}
          onCheckedChange={onToggle}
        />
      </div>
    </CardHeader>
    <CardContent className="text-sm">
      <ul className="list-disc pl-5 space-y-1">
        {description}
      </ul>
    </CardContent>
  </Card>
);

interface InformationGatheringTabProps {
  enabledSections: Record<string, boolean>;
  onSectionToggle: (section: string) => void;
}

export const InformationGatheringTab = ({ enabledSections, onSectionToggle }: InformationGatheringTabProps) => {
  const sections = [
    {
      name: "identity",
      icon: <User className="h-5 w-5 text-blue-500" />,
      title: "Identity & Contact",
      description: <>
        <li>Full legal name</li>
        <li>Best phone number</li>
        <li>Preferred email address</li>
      </>
    },
    {
      name: "residence",
      icon: <HomeIcon className="h-5 w-5 text-green-500" />,
      title: "Residence & Housing",
      description: <>
        <li>Current address</li>
        <li>Length at address</li>
        <li>Rent vs. own & monthly payment</li>
      </>
    },
    {
      name: "employment",
      icon: <Briefcase className="h-5 w-5 text-purple-500" />,
      title: "Employment & Income",
      description: <>
        <li>Employer, role, tenure</li>
        <li>Gross monthly income & pay frequency</li>
        <li>Additional income sources</li>
      </>
    },
    {
      name: "credit",
      icon: <CircleDollarSign className="h-5 w-5 text-red-500" />,
      title: "Credit & Financial History",
      description: <>
        <li>Bankruptcy history</li>
        <li>Repossession/charge-offs/collections</li>
        <li>Number of open credit lines</li>
        <li>Total monthly debt payments</li>
      </>
    },
    {
      name: "vehicle",
      icon: <Building className="h-5 w-5 text-amber-500" />,
      title: "Vehicle Preferences & Budget",
      description: <>
        <li>Desired vehicle type, make/model/year</li>
        <li>Must-have features</li>
        <li>Target monthly payment & down payment</li>
      </>
    },
    {
      name: "consent",
      icon: <ClipboardCheck className="h-5 w-5 text-indigo-500" />,
      title: "Consent & Disclosure",
      description: <>
        <li>Permission for credit pull</li>
        <li>Agreement to privacy/data-share policy</li>
      </>
    },
    {
      name: "scheduling",
      icon: <Calendar className="h-5 w-5 text-cyan-500" />,
      title: "Scheduling",
      description: <>
        <li>Best time for a follow-up call with Andrea</li>
      </>
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section) => (
        <SectionToggle
          key={section.name}
          name={section.name}
          isEnabled={enabledSections[section.name]}
          onToggle={() => onSectionToggle(section.name)}
          icon={section.icon}
          title={section.title}
          description={section.description}
        />
      ))}
    </div>
  );
};
