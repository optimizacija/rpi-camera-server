const raspividStream = require('raspivid-stream');
 
const stream = raspividStream();
 
// To stream over websockets:
videoStream.on('data', (data) => {
    ws.send(data, { binary: true }, (error) => { if (error) console.error(error); });
});
