var http = require('http').Server(null);
var io = require('socket.io')(http);
var config = require('./config/config.json');

var mongo = require('mongo-client');
var insert = require('mongo-client/insert');

var mclient = mongo(config.mongourl);
var collection = mclient(config.collection);

var clients = [];
var checked = [];

var DEBUG = function(message) {
    if (config.debug && config.debug == true) {
        console.log(message);
    }
}

var requestData = function() {
    if (clients.length == 0) return; // don't bother if there are no clients

    // Check the current client and checked list, clearing if needed
    if (checked.length >= clients.length) {
        checked = [];
    }

    // Get a random client
    var c = clients[Math.floor(Math.random()*clients.length)];

    if (checked.indexOf(c) == -1) {
        // Tell the client to send over sensor data
        c.emit('all');
    } else {
        // Client has already been recently checked - try again
        requestData();
    }
};

io.on('connection', function(socket) {

    DEBUG('-> client connected');
    clients[clients.length] = socket;

    /* Prototype of feedback feature - customize at will */
    socket.on('feedback', function(value) {
        if (value) {
            DEBUG('on');
        } else {
            DEBUG('off');
        }
    });

    /* Data is discarded - placeholder for future features */
    socket.on('sensor-data', function(data) {
        DEBUG(data);
    });

    /* Data is discarded - placeholder for future features */
    socket.on('node-data', function(data) {
        DEBUG(data);
    });

    /* all-data signal
     * Recieves combined node and sensor data, then inserts it into
     * the configured MongoDB collection.
     */
    socket.on('all-data', function(data) {
        DEBUG('-> recieved data from ' + socket.id);
        var result = insert(collection, data);
        DEBUG("   inserion result: " + result.stringify());
    });


    /* disconnect signal
     * Removes a client from the client list
     */
    socket.on('disconnect', function() {
        var index = clients.indexOf(socket);
        if (index > -1) {
            clients.splice(index, 1);
            DEBUG('<- client disconnected');
        }
    });
});

// Start requesting data at regular intervals
setInterval(requestData, config.request_delay*1000);

http.listen(3000, function() {
    console.log('senselog ready');
});
