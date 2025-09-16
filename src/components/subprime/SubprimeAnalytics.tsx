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

  // Calculate real funnel metrics based on lead data
  const totalLeads = leads.length;
  const funnelDropoffData = [
    { 
      name: "Initial Contact", 
      value: totalLeads, 
      color: "#3b82f6" 
    },
    { 
      name: "Screening Complete", 
      value: leads.filter(lead => 
        lead.scriptProgress.completedSteps.includes("screening") ||
        ["qualification", "routing", "submitted"].includes(lead.scriptProgress.currentStep)
      ).length, 
      color: "#8b5cf6" 
    },
    { 
      name: "Qualification Done", 
      value: leads.filter(lead => 
        lead.scriptProgress.completedSteps.includes("qualification") ||
        ["routing", "submitted"].includes(lead.scriptProgress.currentStep)
      ).length, 
      color: "#ec4899" 
    },
    { 
      name: "Routing Complete", 
      value: leads.filter(lead => 
        lead.scriptProgress.completedSteps.includes("routing") ||
        lead.scriptProgress.currentStep === "submitted"
      ).length, 
      color: "#f97316" 
    },
    { 
      name: "Final Submission", 
      value: leads.filter(lead => lead.scriptProgress.currentStep === "submitted").length, 
      color: "#10b981" 
    }
  ];

  // Calculate response time distribution based on last touchpoint
  const now = new Date();
  const getHoursFromLastContact = (lead: SubprimeLead) => {
    const ts = lead.lastTouchpoint || lead.conversations.at(-1)?.timestamp;
    if (!ts) return Number.POSITIVE_INFINITY;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
    return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  };

  const replyLatencyData = [
    { 
      name: "< 12 hrs", 
      value: leads.filter(lead => getHoursFromLastContact(lead) < 12).length, 
      color: "#22c55e" 
    },
    { 
      name: "12-24 hrs", 
      value: leads.filter(lead => {
        const hours = getHoursFromLastContact(lead);
        return hours >= 12 && hours < 24;
      }).length, 
      color: "#eab308" 
    },
    { 
      name: "24-48 hrs", 
      value: leads.filter(lead => {
        const hours = getHoursFromLastContact(lead);
        return hours >= 24 && hours < 48;
      }).length, 
      color: "#ef4444" 
    },
    { 
      name: "48+ hrs", 
      value: leads.filter(lead => getHoursFromLastContact(lead) >= 48).length, 
      color: "#64748b" 
    }
  ];

  // Calculate performance metrics by sentiment (as proxy for script effectiveness)
  const sentimentGroups = {
    "Positive": leads.filter(lead => ["Warm"].includes(lead.sentiment)),
    "Neutral": leads.filter(lead => ["Neutral"].includes(lead.sentiment)),
    "Challenging": leads.filter(lead => ["Negative", "Cold", "Frustrated"].includes(lead.sentiment)),
    "Inactive": leads.filter(lead => ["Ghosted"].includes(lead.sentiment))
  };

  const scriptVariantData = Object.entries(sentimentGroups).map(([name, groupLeads]) => ({
    name,
    replies: groupLeads.length > 0 ? Math.round((groupLeads.filter(lead => 
      lead.conversations.length > 1
    ).length / groupLeads.length) * 100) : 0,
    escalations: groupLeads.length > 0 ? Math.round((groupLeads.filter(lead => 
      lead.sentiment === "Needs Human" || lead.chaseStatus === "Manual Review"
    ).length / groupLeads.length) * 100) : 0,
    color: name === "Positive" ? "#22c55e" : name === "Neutral" ? "#3b82f6" : name === "Challenging" ? "#f97316" : "#64748b"
  }));

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
          <h3 className="text-sm font-medium mb-4">Lead Progress Funnel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelDropoffData} layout="vertical">
                <XAxis type="number" />
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
          <h3 className="text-sm font-medium mb-4">Time Since Last Contact</h3>
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

      {/* Script Variant Performance */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-4">Lead Engagement by Sentiment</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scriptVariantData} barSize={20}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar name="Reply Rate (%)" dataKey="replies" fill="#3b82f6" />
              <Bar name="Escalation Rate (%)" dataKey="escalations" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Ready for Funding</h3>
          <p className="text-3xl font-bold text-green-600">
            {leads.filter(lead => lead.fundingReadiness === "Ready").length}
          </p>
          <p className="text-sm text-gray-500">
            {totalLeads > 0 ? Math.round((leads.filter(lead => lead.fundingReadiness === "Ready").length / totalLeads) * 100) : 0}% of all leads
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Manual Intervention Rate</h3>
          <p className="text-3xl font-bold text-purple-600">
            {totalLeads > 0 ? Math.round((leads.filter(lead => lead.chaseStatus === "Manual Review").length / totalLeads) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-500">Of leads require human review</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">Auto-Chase Active</h3>
          <p className="text-3xl font-bold text-blue-600">
            {totalLeads > 0 ? Math.round((leads.filter(lead => lead.chaseStatus === "Auto Chase Running").length / totalLeads) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-500">Leads in automated follow-up</p>
        </Card>
      </div>

      <div className="border-t pt-4 text-center text-sm text-gray-500">
        <p>Analytics update in real-time based on current lead data. All metrics calculated from actual lead information.</p>
      </div>
    </div>
  );
};
