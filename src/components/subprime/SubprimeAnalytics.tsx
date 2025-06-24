import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import { 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  TooltipProps,
  Pie,
  PieChart,
  Legend
} from "recharts";

interface SubprimeAnalyticsProps {
  leads: SubprimeLead[];
  compact?: boolean;
}

export const SubprimeAnalytics = ({ leads, compact = false }: SubprimeAnalyticsProps) => {
  // Prepare data for Funding Readiness Distribution chart
  const readinessData = [
    {
      name: "Ready",
      value: leads.filter(lead => lead.fundingReadiness === "Ready").length,
      color: "#22c55e"
    },
    {
      name: "Partial",
      value: leads.filter(lead => lead.fundingReadiness === "Partial").length,
      color: "#eab308"
    },
    {
      name: "Not Ready",
      value: leads.filter(lead => lead.fundingReadiness === "Not Ready").length,
      color: "#ef4444"
    }
  ];
  
  // Prepare data for Script Progress chart
  const scriptProgressData = [
    {
      name: "Contacted",
      value: leads.filter(lead => lead.scriptProgress?.currentStep === "contacted").length,
      color: "#3b82f6"
    },
    {
      name: "Screening",
      value: leads.filter(lead => lead.scriptProgress?.currentStep === "screening").length,
      color: "#8b5cf6"
    },
    {
      name: "Qualification",
      value: leads.filter(lead => lead.scriptProgress?.currentStep === "qualification").length,
      color: "#ec4899"
    },
    {
      name: "Routing",
      value: leads.filter(lead => lead.scriptProgress?.currentStep === "routing").length,
      color: "#f97316"
    },
    {
      name: "Submitted",
      value: leads.filter(lead => lead.scriptProgress?.currentStep === "submitted").length,
      color: "#10b981"
    }
  ];
  
  // Prepare data for Chase Status chart
  const chaseStatusData = [
    {
      name: "Auto Chase",
      value: leads.filter(lead => lead.chaseStatus === "Auto Chase Running").length,
      color: "#22c55e"
    },
    {
      name: "Paused",
      value: leads.filter(lead => lead.chaseStatus === "Paused").length,
      color: "#eab308"
    },
    {
      name: "Completed",
      value: leads.filter(lead => lead.chaseStatus === "Completed").length,
      color: "#3b82f6"
    },
    {
      name: "Manual",
      value: leads.filter(lead => lead.chaseStatus === "Manual Review").length,
      color: "#8b5cf6"
    }
  ];

  // New data for funnel metrics
  const funnelDropoffData = [
    { name: "Initial Contact", value: 100, color: "#3b82f6" },
    { name: "Screening Complete", value: 75, color: "#8b5cf6" },
    { name: "Docs Submitted", value: 45, color: "#ec4899" },
    { name: "Credit Verified", value: 30, color: "#f97316" },
    { name: "Final Approval", value: 20, color: "#10b981" }
  ];

  const replyLatencyData = [
    { name: "< 12 hrs", value: 45, color: "#22c55e" },
    { name: "12-24 hrs", value: 30, color: "#eab308" },
    { name: "24-48 hrs", value: 15, color: "#ef4444" },
    { name: "48+ hrs", value: 10, color: "#64748b" }
  ];

  // Script variant performance data
  const scriptVariantData = [
    { name: "Standard", replies: 68, escalations: 12, color: "#3b82f6" },
    { name: "Friendly", replies: 75, escalations: 8, color: "#22c55e" },
    { name: "Direct", replies: 62, escalations: 15, color: "#f97316" },
    { name: "Educational", replies: 70, escalations: 10, color: "#8b5cf6" }
  ];

  // Custom tooltip to display more info
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border shadow-sm rounded text-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p>Count: <span className="font-medium">{payload[0].value}</span></p>
          <p>Percentage: <span className="font-medium">
            {Math.round((payload[0].value as number / leads.length) * 100)}%
          </span></p>
        </div>
      );
    }
  
    return null;
  };

  // Compact version - show only key metrics
  if (compact) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Funding Readiness</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={readinessData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={40}
                  innerRadius={20}
                >
                  {readinessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {readinessData.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600">Response Time</h4>
          <div className="space-y-1">
            {replyLatencyData.slice(0, 2).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span>{item.name}</span>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Funding Readiness Distribution */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-center">Funding Readiness Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={readinessData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value">
                  {readinessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Script Progress Distribution */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-center">Script Progress Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scriptProgressData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value">
                  {scriptProgressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Chase Status Distribution */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-center">Chase Status Distribution</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chaseStatusData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value">
                  {chaseStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Funnel Performance */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Funnel Drop-off Analysis</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelDropoffData} layout="horizontal">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value">
                  {funnelDropoffData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Reply Latency */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Customer Reply Latency</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={replyLatencyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={30}
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {replyLatencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Script Variant Performance */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Script Variant Performance</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scriptVariantData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="replies" fill="#3b82f6" name="Reply Rate %" />
                <Bar dataKey="escalations" fill="#ef4444" name="Escalation Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Performance Summary */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg. Response Time</span>
              <span className="font-medium">4.2 hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <span className="font-medium text-green-600">23.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Escalation Rate</span>
              <span className="font-medium text-red-600">8.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Conversations</span>
              <span className="font-medium">{leads.filter(lead => lead.nextAction.isAutomated).length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg. Script Progress</span>
              <span className="font-medium">62%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
