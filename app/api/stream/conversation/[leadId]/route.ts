import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const { leadId } = params;

  console.log('🔄 Setting up real-time stream for lead:', leadId);

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        const eventData = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      };

      // Send connection confirmation
      sendEvent({
        type: 'connection_established',
        leadId,
        timestamp: new Date().toISOString(),
        message: 'Real-time stream connected'
      });

      // Set up periodic heartbeat
      const heartbeat = setInterval(() => {
        sendEvent({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
      }, 30000); // Every 30 seconds

      // Store the connection for broadcasting
      // In a real implementation, you'd store this in a connection manager
      global.conversationStreams = global.conversationStreams || new Map();
      global.conversationStreams.set(leadId, { controller, sendEvent });

      console.log('✅ Real-time stream established for lead:', leadId);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        global.conversationStreams?.delete(leadId);
        controller.close();
        console.log('🔌 Real-time stream closed for lead:', leadId);
      });
    },
  });

  // Return SSE response
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Helper function to broadcast updates to all connected clients for a lead
export function broadcastToLead(leadId: string, update: any) {
  const streams = global.conversationStreams as Map<string, any> | undefined;
  const connection = streams?.get(leadId);
  
  if (connection) {
    connection.sendEvent({
      ...update,
      timestamp: new Date().toISOString()
    });
    console.log('📡 Broadcasted update to lead:', leadId, update.type);
  } else {
    console.log('⚠️ No active stream for lead:', leadId);
  }
} 