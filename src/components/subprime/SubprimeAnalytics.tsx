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
}

export const SubprimeAnalytics = ({ leads }: SubprimeAnalyticsProps) => {
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
      value: leads.filter(lead => lead.scriptProgress.currentStep === "contacted").length,
      color: "#3b82f6"
    },
    {
      name: "Screening",
      value: leads.filter(lead => lead.scriptProgress.currentStep === "screening").length,
      color: "#8b5cf6"
    },
    {
      name: "Qualification",
      value: leads.filter(lead => lead.scriptProgress.currentStep === "qualification").length,
      color: "#ec4899"
    },
    {
      name: "Routing",
      value: leads.filter(lead => lead.scriptProgress.currentStep === "routing").length,
      color: "#f97316"
    },
    {
      name: "Submitted",
      value: leads.filter(lead => lead.scriptProgress.currentStep === "submitted").length,
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
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelDropoffData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value">
                  {funnelDropoffData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Reply Latency Distribution */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">Response Time Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={replyLatencyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  labelLine={false}
                >
                  {replyLatencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Average Time to Ready</h3>
          <p className="text-3xl font-bold text-green-600">3.2 days</p>
          <p className="text-sm text-gray-500">From first contact to funding ready</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Manual Intervention Rate</h3>
          <p className="text-3xl font-bold text-purple-600">24%</p>
          <p className="text-sm text-gray-500">Of leads require human review</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Auto-Chase Success</h3>
          <p className="text-3xl font-bold text-blue-600">76%</p>
          <p className="text-sm text-gray-500">Leads progress without manual help</p>
        </Card>
      </div>

      <div className="border-t pt-4 text-center text-sm text-gray-500">
        <p>Analytics updated every 15 minutes. Historical data available in full reports.</p>
      </div>
    </div>
  );
};
