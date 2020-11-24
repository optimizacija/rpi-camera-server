# RaspberryPi Camera Server

RaspberryPi Camera Server provides a stable multicast video streaming service functionality over WebSocket protocol.
It's built around the `raspivid` terminal command and partially based on these two awesome projects:
[raspivid](https://github.com/pimterry/raspivid-stream), [raspivid](https://github.com/binocarlos/raspivid).

## Framework

It's written in [NestJS](https://docs.nestjs.com/websockets/gateways).

## Installation & Deployment

```bash
## install npm & raspivid on your RaspberryPi

# Install dependencies
npm i

# Run the server 
npm run start
```

Access the WebSocket video stream on this URL (change *<IP>* where necessary):
```
ws://<IP>:3001/api/video-stream
```

Example Web client: 
``` html
<!DOCTYPE HTML>
<html>
    <head>
        <link rel="stylesheet" href="styles.css">
    </head>
    <body>
        <canvas id="video-canvas"></canvas>
    </body>

    <script type="text/javascript" src="https://rawgit.com/131/h264-live-player/master/vendor/dist/http-live-player.js"></script>
    <script>
        const canvas = document.getElementById('video-canvas');
        const wsavc = new WSAvcPlayer(canvas, "webgl");

        wsavc.connect("ws://<IP>:3001/api/video-stream");
    </script> 

</html>
```

## Misc

Hope y'all enjoy it!
