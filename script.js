//This is the javascript that our S3 Particle Data website will run.  It retrieves data from our DynamoDB Table and
//creates graphical representations of this data using the D3 library.
//
//by Amanda Gross
//
//
// Set up connection to AWS
//
AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.Credentials('[Access key ID]', '[Secret access key]');

//
// Constants
//
var dynamodb = new AWS.DynamoDB();

var TABLE_NAME = "Particle-Photon-Data";

var params = { 
    TableName: TABLE_NAME,
    KeyConditionExpression: '#device = :d',
    FilterExpression: '#event = :dataType',
    ExpressionAttributeNames: {
    	'#device': 'device',
    	'#event': 'event'
    },
    ExpressionAttributeValues: {
    	':d': {"S":"Demo-build"},
    	':dataType': {"S":"Temp"}
    }
};

// When the webpage is loaded, retrieve data from DynamoDB
document.addEventListener('DOMContentLoaded', function() {
	dynamodb.query(params, function(err, data) {
    if (err) {
      console.log(err);
      return null;
    } else {
    	console.log('Successfully queried database');
    	console.log(data);
    	return null;
    }
	});
});
