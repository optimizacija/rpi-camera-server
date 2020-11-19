// video stream
const raspividStream = require('raspivid-stream');
 
const videoStream = raspividStream();
console.log('videoStream', videoStream);
 
// ws server
const WebSocketServer = require('websocket').server;
const http = require('http');
 
const server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});
 
wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});
 
function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}
 
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    const connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
    
    // To stream over websockets:
    videoStream.on('data', (data) => {
        connection.send(data, { binary: true }, (error) => { if (error) console.error(error); });
    });
    
    connection.send(JSON.stringify({
      action: 'init',
      width: '960',
      height: '540'
    }));
});
