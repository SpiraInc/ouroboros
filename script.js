//This is the javascript that our S3 Particle Data website will run.  It retrieves data from our DynamoDB Table and
//creates graphical representations of this data using the MetricsGraphics D3 library.
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

// Arrays to store the entire 24 hour range of data
var temperatureData = new Array();
var phData = new Array();

// Save the earliest and latest timestamps in the 24hr range
var dataStartTime;
var dataEndTime;

var dataLoaded = false;

// Functions for displaying the time data in different ways
formatTime1 = d3.timeFormat("%I:%M%p");
formatTime2 = d3.timeFormat("%b %d %I:%M%p");  
formatTime3 = d3.timeFormat("%b %d");

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
    		      "time": new Date(currentTime.substring(0,19)),
    		      "ph": +currentph
    		  }
    		  phData.push(dataPoint);
    	   }

           //console.log(phData);
    	   return drawAll(temperatureData, phData);
        }
	});

    // When "Go" button is clicked, call modifyInterval
    $("#submitRange").click(function() {
        modifyInterval();
    });

    // When "Return to 24 hr range" is clicked, remove any error message and call drawAll with complete datasets again
    $("#originalRange").click(function () {
        $("#errorMessage").text("");
        drawAll(temperatureData, phData);
    });
});

// Verify that the user-selected timestamps are valid subsets of the data, then redraw the graphs
function modifyInterval () {
    try {
        // Retrieve time values from the user inputs, verify the dates are valid by attempting to create Date objects
        var subsetStart = new Date($('#subsetStart').combodate('getValue', null)._d);
        subsetStart = subsetStart.getTime();
        var subsetEnd = new Date($('#subsetEnd').combodate('getValue', null)._d);
        subsetEnd = subsetEnd.getTime();

        // Verify that the timestamps chosen are within the 24 hour period.  If not, provide a message for the user
        if (subsetStart < dataStartTime) {
            $("#errorMessage").text("Starting time is outside the 24 hour range");
        } else if (subsetEnd > dataEndTime) {
            $("#errorMessage").text("Ending time is outside the 24 hour range");
        } else {
            // If the time values are valid subsets of the data, retrieve all data points in this subset
            var temperatureSubset = new Array();
            var phSubset = new Array();
            temperatureData.forEach(function(dataPoint) {
                if(dataPoint.time.getTime() >= subsetStart && dataPoint.time.getTime() <= subsetEnd) {
                    temperatureSubset.push(dataPoint);
                }
            });
            phData.forEach(function(dataPoint) {
                if(dataPoint.time.getTime() >= subsetStart && dataPoint.time.getTime() <= subsetEnd) {
                    phSubset.push(dataPoint);
                }
            });

            // Remove any error message that may be present, and redraw the graphs with the subsets of data
            $("#errorMessage").text("");
            drawAll(temperatureSubset, phSubset);
        }

    // If a date was invalid, provide an error message for the user
    } catch (e) {
        $("#errorMessage").text("Invalid date");
    }
}


// Determine the earliest and latest timestamps in the 24hr range
function findStartEndTime () {
    if (temperatureData[0].time.getTime() > phData[0].time.getTime()) {
        dataStartTime = phData[0].time.getTime();
        //console.log("took pH start time");
    } else {
        dataStartTime = temperatureData[0].time.getTime();
    }
    if (temperatureData[temperatureData.length-1].time.getTime() < phData[phData.length-1].time.getTime()) {
        dataEndTime = phData[phData.length-1].time.getTime();
        //console.log("took pH end time");
    } else {
        dataEndTime = temperatureData[temperatureData.length-1].time.getTime();
    }

    console.log("Start: " + new Date(dataStartTime) + " End: " + new Date(dataEndTime));
}

// All of the functions required to create the graphs are performed here
function drawAll (temperatureSubset, phSubset) {
    console.log("starting to draw");

    // If drawAll is executed before the DynamoDB query finished, try again in 100ms
    if (temperatureData.length == 0 || phData.length == 0) {
        console.log("Waiting for data to load");
        setTimeout(function(){drawAll(temperatureSubset, phSubset)},100);
    }else{
        dataLoaded = true;

        // If this is the first time drawing the graphs, call findStartEndTime
        if (!dataStartTime) {
            findStartEndTime();
        }

        // Set up user selection of times, providing a buffer of 1 minute for the start and end defaults displayed
        $('#subsetStart').combodate({
            value: moment(dataStartTime + 60000).format('DD-MM-YYYY HH:mm'),
            minuteStep: 1,
            minYear: 2018,
            maxYear: 2018
        });
        $('#subsetEnd').combodate({
            value: moment(dataEndTime - 60000).format('DD-MM-YYYY HH:mm'),
            minuteStep: 1,
            minYear: 2018,
            maxYear: 2018
        });   
        $('#controls').css('display', 'inline'); // make the html elements visible

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
            data: temperatureSubset,
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

        //Create the pH graph
        MG.data_graphic({
            title: "pH Data",
            data: phSubset,
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
        $(".mg-year-marker")[0].children[0].innerHTML = formatTime3(temperatureSubset[0].time);
        $(".mg-year-marker")[1].children[0].innerHTML = formatTime3(phSubset[0].time);
    }
}