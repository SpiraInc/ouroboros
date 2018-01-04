// This lambda function receives a JSON event object from the Webhook's POST request, processes the data, and inserts it into the table in DynamoDB.
// By Amanda Gross
//
// Based on a lambda function created by Nic Jansa: https://github.com/nicjansma/dht-logger/blob/master/lambda.js
//
//
// Imports
//
var doc = require("dynamodb-doc");
var aws = require("aws-sdk");

//
// Constants
//
var TABLE_NAME = "Particle-Photon-Data";

var dynamodb = new doc.DynamoDB();
var s3 = new aws.S3({params: {Bucket: 'particle-photon-data-visualization'}});

exports.handler = function(event, context, callback) {
    console.log("Request received:\n", JSON.stringify(event));
    console.log("Context received:\n", JSON.stringify(context));

    var eventData = JSON.parse(event.body);
    var item = {};

    if (typeof eventData.device !== "undefined") {
        item.device = eventData.device;
    } else {
        item.device = "Demo-build";
    }
    
    if (typeof eventData.published_at !== "undefined") {
        item.time = eventData.published_at;
    }

    //store deviceId and event values
    if (typeof eventData.coreid !== "undefined") {
        item.deviceId = eventData.coreid;
    }

    if (typeof eventData.event !== "undefined") {
        item.event = eventData.event;
    }
    
    if (typeof eventData.data !== "undefined") {
        item.data = eventData.data;
    }

    // parse data payload
/*    var data;


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
    } */

    console.log("Item:\n", item);

    s3.upload(item, function (err, res) {               
        if (err) {
            console.log("Error in uploading file on s3 due to "+ err)
        } else {   
            console.log("File successfully uploaded to s3.")
        }
    });

    // Put into DynamoDB!
    dynamodb.putItem({
        "TableName": TABLE_NAME,
        "Item": item
    }, function(err, data) {
        if (err) {
            context.fail("ERROR: Dynamo failed: " + err);
        } else {
            console.log("Successfully entered to DynamoDB");
            
            var response = {
                "statusCode": 200,
                "headers": {},
                "body": JSON.stringify(eventData)
            };
            context.succeed(response);
        }
    });
}