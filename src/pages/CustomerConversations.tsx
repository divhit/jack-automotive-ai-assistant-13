import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Search, 
  Filter, 
  MessageSquare, 
  ArrowDown,
  ArrowUp,
  User,
  Clock,
  MoreHorizontal,
  ChevronRight,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { customerConversations } from "@/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const CustomerConversations = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const filteredConversations = customerConversations.filter((conversation) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      conversation.customerName.toLowerCase().includes(searchLower) ||
      conversation.customerPhone.toLowerCase().includes(searchLower) ||
      conversation.vehicleInquiry.toLowerCase().includes(searchLower) ||
      conversation.lastMessagePreview.toLowerCase().includes(searchLower)
    );
  });

  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;
    
    switch (sortColumn) {
      case "customerName":
        return directionMultiplier * a.customerName.localeCompare(b.customerName);
      case "vehicleInquiry":
        return directionMultiplier * a.vehicleInquiry.localeCompare(b.vehicleInquiry);
      case "lastMessagePreview":
        return directionMultiplier * a.lastMessagePreview.localeCompare(b.lastMessagePreview);
      case "timestamp":
        return directionMultiplier * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      case "status":
        return directionMultiplier * a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    } else {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Closed":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "Test Drive Scheduled":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Follow-up Needed":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "New":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Add Lead</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-automotive-primary" />
              <span>Customer SMS Conversations</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("customerName")}
                >
                  <div className="flex items-center">
                    Customer
                    {sortColumn === "customerName" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("vehicleInquiry")}
                >
                  <div className="flex items-center">
                    Vehicle Inquiry
                    {sortColumn === "vehicleInquiry" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort("lastMessagePreview")}
                >
                  <div className="flex items-center">
                    Last Message
                    {sortColumn === "lastMessagePreview" && (
                      sortDirection === "asc" ? 
                        <ArrowUp className="ml-1 h-4 w-4" /> : 
                        <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Lead Source</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedConversations.map((conversation) => (
                <TableRow key={conversation.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{conversation.customerName}</span>
                      <span className="text-xs text-muted-foreground">{conversation.customerPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell>{conversation.vehicleInquiry}</TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm truncate">{conversation.lastMessagePreview}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {conversation.leadSource}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(conversation.timestamp)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(conversation.status)}>
                      {conversation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog onOpenChange={(open) => {
                        if (open) setSelectedConversation(conversation.id);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <span>View</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Conversation with {conversation.customerName}</DialogTitle>
                          </DialogHeader>
                          <div className="flex items-center gap-3 mt-2">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-automotive-primary text-white">
                                {conversation.customerName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{conversation.customerName}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5" />
                                <span>{conversation.customerPhone}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="h-3.5 w-3.5" />
                            <span>Inquiring about: {conversation.vehicleInquiry}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Status: {conversation.status}</span>
                          </div>
                          <ScrollArea className="h-[300px] mt-4 p-4 border rounded-md">
                            {selectedConversation && customerConversations.find(c => c.id === selectedConversation)?.messages.map((message, index) => (
                              <div 
                                key={index} 
                                className={`flex ${message.type === "outgoing" ? "justify-end" : "justify-start"} mb-4`}
                              >
                                <div 
                                  className={`max-w-[80%] p-3 rounded-lg ${
                                    message.type === "outgoing" 
                                      ? "bg-automotive-primary text-white" 
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  <div>{message.message}</div>
                                  <div className="text-xs mt-1 opacity-70">
                                    {new Date(message.timestamp).toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </ScrollArea>
                          <div className="flex mt-4">
                            <Input placeholder="Type a message..." className="mr-2" />
                            <Button>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm">
                        Follow Up
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerConversations;
