//This is the javascript that our S3 Particle Data website will run.  It retrieves data from our DynamoDB Table and
//creates graphical representations of this data using the D3 library.
//
//by Amanda Gross
//
//
// Set up connection to AWS
//
AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.Credentials('AKIAJOZYYEONYVPQRMJQ', 'VBheR/39pJewkh83eEKueTr8xvEVH7MpgWGRhsLE');

//
// Constants
//
var dynamodb = new AWS.DynamoDB();

var TABLE_NAME = "Particle-Photon-Data";

// Convert today's date to milliseconds and subtract 24 hours
var dayAgoTimeStamp = new Date().getTime() - 86400000;
// Convert timestamp of 24hrs ago to same format as our DynamoDB timestamps
dayAgoTimeStamp = new Date(dayAgoTimeStamp).toISOString();

var temperatureParams = { 
    TableName: TABLE_NAME,
    KeyConditionExpression: '(#device = :d) and (#time >= :timeStamp)',
    FilterExpression: '#event = :dataType',
    ExpressionAttributeNames: {
    	'#device': 'device',
    	'#event': 'event',
        '#time': 'time'
    },
    ExpressionAttributeValues: {
    	':d': {"S":"Demo-build"},
    	':dataType': {"S":"Temp"},
        ':timeStamp': {"S":dayAgoTimeStamp}
    }
};

var phParams = { 
    TableName: TABLE_NAME,
    KeyConditionExpression: '(#device = :d) and (#time >= :timeStamp)',
    FilterExpression: '#event = :dataType',
    ExpressionAttributeNames: {
    	'#device': 'device',
    	'#event': 'event',
        '#time': 'time'
    },
    ExpressionAttributeValues: {
    	':d': {"S":"Demo-build"},
    	':dataType': {"S":"phValue"},
        ':timeStamp': {"S":dayAgoTimeStamp}
    }
};

var temperatureData = new Array();
var phData = new Array();

// When the webpage is loaded, retrieve data from DynamoDB
document.addEventListener('DOMContentLoaded', function() {
	dynamodb.query(temperatureParams, function(err, data) {
    if (err) {
      console.log(err);
      return null;
    } else {
    	console.log('Successfully queried database for temperature');

    	// Process the data into proper format for D3
    	for (var key in data.Items) {
    		var currentTemp = data.Items[key].data.S;
    		var currentTime = data.Items[key].time.S;
    		//console.log('Data: ' + currentTemp + ' Time: ' + currentTime);
    		var dataPoint = {
    			"time": new Date(currentTime.substring(0,19)),
    			"temp": +currentTemp
    		}
    		temperatureData.push(dataPoint);
    	}
    	//console.log(temperatureData);
    	return null;
    }
	});

	dynamodb.query(phParams, function(err, data) {
    if (err) {
      console.log(err);
      return null;
    } else {
    	console.log('Successfully queried database for pH');

    	// Process the data into proper format for D3
    	for (var key in data.Items) {
    		var currentph = data.Items[key].data.S;
    		var currentTime = data.Items[key].time.S;
    		
    		var dataPoint = {
    			"time": Date.parse(currentTime.substring(0, 19)),
    			"ph": +currentph
    		}
    		phData.push(dataPoint);
    	}

    	return drawAll();
    }
	});
});

// All of the functions required to create the graphs are performed here
function drawAll () {
    console.log("starting to draw");

    // If drawAll is executed before the DynamoDB query finished, try again in 100ms
    if (temperatureData.length == 0 || phData.length == 0) {
        console.log("Waiting for data to load");
        setTimeout(function(){drawAll()},100);
    }else{

    formatTime1 = d3.timeFormat("%I:%M%p");
    formatTime2 = d3.timeFormat("%b %d %I:%M%p");  
    formatTime3 = d3.timeFormat("%b %d");

    // Formats the x axis to show the time as hours:minutes
    function format_x_label(time) {
        var timeValue = time.valueOf();
      return formatTime1(timeValue);
    }
    
    // Formats tooltip to show both date and time
    function format_x_tooltip(dataPoint) {
        var timeValue = dataPoint.time.valueOf();
      return formatTime2(timeValue);
    }
    // Formats tooltip to show Temperature label and units 
    function format_y_tooltip_temp(dataPoint) {
        return " Temperature: " + dataPoint.temp + "\u00B0" + "C";
    }
    // Formats tooltip to show pH label 
    function format_y_tooltip_ph(dataPoint) {
        return " pH: " + dataPoint.ph;
    }

    // Create the temperature graph
    MG.data_graphic({
        title: "Temperature Data",
        data: temperatureData,
        width: 650,
        height: 350,
        full_width: true,
        full_height: true,
        target: '#tempGraph',
        x_accessor: 'time',
        y_accessor: 'temp',
        xax_format: format_x_label,
        xax_count: 8,
        x_mouseover: format_x_tooltip,
        y_mouseover: format_y_tooltip_temp,
        animate_on_load: true
    });

    MG.data_graphic({
        title: "pH Data",
        data: phData,
        width: 650,
        height: 350,
        full_width: true,
        full_height: true,
        target: '#phGraph',
        x_accessor: 'time',
        y_accessor: 'ph',
        xax_format: format_x_label,
        xax_count: 8,
        x_mouseover: format_x_tooltip,
        y_mouseover: format_y_tooltip_ph,
        animate_on_load: true
    });
    // Make the year marker show the day and month of first data point instead of the year
    $(".mg-year-marker")[0].children[0].innerHTML = formatTime3(temperatureData[0].time);
    console.log($(".mg-year-marker")[0].children);
}
}