# WebSocket API Documentation

## Connect to the WebSocket Server
The first step for the client is to connect to the WebSocket server.

    const socket = io('http://localhost:3000', {
      auth: {
        token: 'JWT_TOKEN' // replace with the actual user id
      }
    });

In this case, the JWT is passed as part of the handshake data. If the JWT is not provided or invalid, the server will close the connection.

## Listening for new messages
    socket.on('conversation-{conversationId}', (message) => {
      // handle the received conversations here
    });

## Clear unread messages
Once you open a conversation just emit this event

    socket.emit('conversation-opened', {
      conversationId: 'CONVERSATION_ID'
    });

## Receive an Alert for new messages outside conversations
This event is emitted to be used for places like bell icon to increment the count when a new message is sent

    socket.on('message-alert-{userId}', (messafe) => {
      // handle the received message here
    });

## Disconnect
The client can disconnect from the server by calling the disconnect method.

    socket.disconnect();

The server will handle any necessary cleanup
