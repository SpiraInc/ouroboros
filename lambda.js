// TODO: create a time conversion function, alter parsing of the event object to correspond to our webhook
//
// This lambda function receives a JSON event object from the Webhook's POST request, processes the data, and inserts it into the table in DynamoDB.
// By Amanda Gross
//
// Based on a lambda function created by Nic Jansa: https://github.com/nicjansma/dht-logger/blob/master/lambda.js
//

//
// Imports
//
var doc = require("dynamodb-doc");

//
// Constants
//
var TABLE_NAME = "Particle-Photon-Data";

var dynamodb = new doc.DynamoDB();

exports.handler = function(event, context) {
    console.log("Request received:\n", JSON.stringify(event));
    console.log("Context received:\n", JSON.stringify(context));

    var now = new Date().getTime();

    //We can initially determine the device value, which is stored in this item that will be posted to the table.
    var item = {
        "device": event.device, 
    };


    //store deviceId and event values
    if (typeof event.coreid !== "undefined") {
        item.deviceId = event.coreid;
    }

    if (typeof event.event !== "undefined") {
        item.event = event.event;
    }

    // parse data payload
    var data;

    // if there is a 'data' property, it's possibly from a Particle Webhook, and we should use those values
    if (typeof event.data !== "undefined" && typeof event.published_at !== "undefined") {
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            return context.fail("Failed to parse data JSON");
        }
    } else {
        data = event;  //otherwise we will just say the event itself is our data
    }

    // copy data properties over to DynamoDB item
    for (var key in data) {
        if (data.hasOwnProperty(key) &&
            typeof data[key] !== "undefined" &&
            data[key] !== null &&
            data[key] !== "") {
            item[key] = data[key];
        }
    }

    console.log("Item:\n", item);

    // Put into DynamoDB!
    dynamodb.putItem({
        "TableName": TABLE_NAME,
        "Item": item
    }, function(err, data) {
        if (err) {
            context.fail("ERROR: Dynamo failed: " + err);
        } else {
            console.log("Dynamo Success: " + JSON.stringify(data, null, "  "));
            context.succeed({ success: true });
        }
    });
}