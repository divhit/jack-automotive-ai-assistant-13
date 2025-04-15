
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { salesLeads } from "@/data";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  CalendarDays, 
  CarFront, 
  Users 
} from "lucide-react";

const SalesDashboard = () => {
  // Get the count of leads by status
  const newLeads = salesLeads.filter(lead => lead.leadStatus === "New").length;
  const contactedLeads = salesLeads.filter(lead => lead.leadStatus === "Contacted").length;
  const testDriveLeads = salesLeads.filter(lead => lead.leadStatus === "Test Drive Scheduled").length;
  const closedLeads = salesLeads.filter(lead => lead.leadStatus === "Closed").length;

  // Helper function to get badge color based on lead status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Contacted":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Test Drive Scheduled":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* New Leads Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{newLeads}</div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <ArrowUpRight className="mr-1 h-4 w-4" />
              <span>12% increase</span>
            </div>
          </CardContent>
        </Card>

        {/* Contacted Leads Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacted Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{contactedLeads}</div>
              <div className="bg-yellow-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <ArrowUpRight className="mr-1 h-4 w-4" />
              <span>4% increase</span>
            </div>
          </CardContent>
        </Card>

        {/* Test Drives Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test Drives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{testDriveLeads}</div>
              <div className="bg-green-100 p-2 rounded-full">
                <CarFront className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-red-600">
              <ArrowDownRight className="mr-1 h-4 w-4" />
              <span>3% decrease</span>
            </div>
          </CardContent>
        </Card>

        {/* Closed Deals Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closed Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{closedLeads}</div>
              <div className="bg-purple-100 p-2 rounded-full">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <ArrowUpRight className="mr-1 h-4 w-4" />
              <span>8% increase</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-automotive-primary" />
              <span>Active Leads</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Vehicle Interest</TableHead>
                <TableHead>Lead Source</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.customerName}</TableCell>
                  <TableCell>{lead.vehicleInterest}</TableCell>
                  <TableCell>{lead.leadSource}</TableCell>
                  <TableCell>{formatDate(lead.lastContact)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(lead.leadStatus)}>
                      {lead.leadStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Sales (Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$345,800</div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <ArrowUpRight className="mr-1 h-4 w-4" />
              <span>7.2% increase from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lead Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24.8%</div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <ArrowUpRight className="mr-1 h-4 w-4" />
              <span>3.1% increase from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.3 min</div>
            <div className="flex items-center mt-4 text-sm text-green-600">
              <ArrowUpRight className="mr-1 h-4 w-4" />
              <span>15% faster than industry average</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesDashboard;
