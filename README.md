[![Spira](https://www.livespira.com/wp-content/uploads/2017/02/spira_logotype_Spira-Green_rgb-1.png)](https://www.livespira.com/)
# Overview
This guide documents the steps required to ingest time series sensor data from Particle Photon devices, post this data to an AWS database and Adafruit.io, and create D3 graphs of this data on an S3 website.

The Photon is being programmed in C++ using the Particle Build interface. It is currently logging temperature and pH data, and we aim to expand to more outputs in the near future.  The current goal is to set up Particle Webhooks that will listen to the Photon's published data, then will POST the data to a AWS API Gateway Endpoint where an AWS Lambda function will ingest the data and post to AWS DynamoDB. An AWS S3 website will query DynamoDB and create graphs using the D3.js library.  There will also be an IFTTT applet that will post the data to Adafruit.io to create additional graphs. 

# Obtaining sensor data from Particle Build

The main code for this device is in the app [_particle_master_](https://github.com/SpiraInc/ouroboros/blob/master/particle_master) on Particle Build.  When this code is run, the temperature and pH sensors are read every few minutes, and this data is published (made available to the Webhooks) using the following commands:

```
Particle.publish("phValue", String(phValue, 2));
Particle.publish("Temp", String(Temp, 2));
```

 - The first parameter is the name of the event associated with the publish. Our Webhooks will listen for these two specific events in order to be triggered.  
 - The second parameter is the data value.

In order to log the device name, a variable encoding the device name must be defined, which is done by defining the data variable as follows:

```
(todo)
```


# Exporting Data to Amazon Web Services

###  Creating the AWS Data Table

We will be using an AWS DynamoDB Table to store our data, which has been named _Particle-Photon-Data_.  The table was created by clicking _Create table_ in the DynamoDB dashboard.  The table properties and settings were chosen as shown:

![Creating Table](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20Table.PNG)

The successfully logged data can be viewed in the DynamoDB dashboard as shown:

![Viewing Data](https://github.com/SpiraInc/ouroboros/blob/master/images/View%20db%20data.PNG)

### Creating the Lambda Function for processing data

The lambda function, which has been named [_Particle-Data-Lambda_](https://github.com/SpiraInc/ouroboros/blob/master/lambda.js), can be thought of as an intermediary in the "handshake" between Particle and DynamoDB.  Our lambda function receives a JSON event object from the Webhook's POST request, processes the data contained in this object, and inserts the data into the table in DynamoDB.  It was created by navigating to the Lambda resource and clicking _Create function_, and settings were chosen as shown:

![Creating Lambda Function](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20Lambda%20Function.PNG)

Note that the Role chosen was _ParticleDataLambdaRole_.  Our function must have a Role that gives it permission to write to DynamoDB.  To provide this, we created a new Role by clicking _Create a custom role_ in the _Role_ dropdown menu shown above.  This redirects to creation of an IAM Role, which was done as shown below:

![Creating Role](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20Role.PNG)

Click _Allow_, then navigate to the IAM Dashboard and click _Roles -> Your new Role -> Attach policy_ and select the _AmazonDynamoDBFullAccess_ permissions policy:

![Creating Role](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20Role%20(2).PNG)

Now, return to creation of the lambda function and select _Choose an existing role_ in the _Role_ dropdown menu, and select the new Role as shown in the original screenshot.  Then click _Create function_.

_Particle-Data-Lambda_ is written in Node.js, and was based on [this resource](https://github.com/nicjansma/dht-logger).  An outline of the code is as follows:

1. Connections to AWS and specifically DynamoDB are set up
2. A handler function is called that receives the Webhook's POST as the parameter `event`
3. The data is extracted from `event` by calling `JSON.parse(event.body);`
4. Each desired data attribute is entered into a new object called `item`
5. Attempt to post `item` to the DynamoDB Table using the function `dynamodb.putItem`
6. A callback function will return an error if the attempt was unsuccessful, or will return a success response object if the attempt was successful

### Creating the API Gateway Endpoint

The API Gateway Endpoint provides a means for sending input to the Lambda function.  The Particle Webhook will call the API Gateway Endpoint's URL, and then it will trigger the Lambda function.  Setting up the API Gateway Endpoint includes creating the Endpoint using Lambda proxy integration, creating an API Key, and creating a Usage Plan.  

Open the Lambda Console, navigate to the Particle-Data-Lambda Configuration tab, click _API Gateway_, and scroll down to _Configure triggers_:

![Creating API Gateway](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20API%20Gateway.PNG)

Click _Add_, then at the top of the page click _Save_.  Now, the API url with endpoint value is available as shown:

![View API Gateway Endpoint](https://github.com/SpiraInc/ouroboros/blob/master/images/View%20Gateway%20Endpoint.PNG)

Now we need to create the access key.  Open the API Gateway Console and click _API Keys -> Actions -> Create API Key_.  The key was named `ParticleAPIGatewayKey` as shown below:

![Creating API Key](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20API%20Key.PNG)

In order to associate this key with our API Gateway Endpoint, a Usage Plan must be created.  In the API Gateway Console, click _Usage Plans -> Create_:

![Creating Usage Plan](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20Usage%20Plan.PNG)
![Creating Usage Plan](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20Usage%20Plan%20(2).PNG)
![Creating Usage Plan](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20Usage%20Plan%20(3).PNG)

Now, the API key can be viewed as shown:

![Viewing API Key](https://github.com/SpiraInc/ouroboros/blob/master/images/View%20API%20Key.PNG)

### Creating the Webhooks

Two Webhooks were created, one for logging temperature and one for logging pH.  In the Particle Console, click _Integrations -> New Integration -> Webhook_.

 - The AWS Webhooks can be created using the Webhook Builder.
 - The Event Names are _phValue_ and _Temp_, since these must identical to the event names published in the Particle Build app. The two Webhooks are exactly the same other than the Event Name.
 - The URL is `https://[endpoint].execute-api.us-east-1.amazonaws.com/prod/Particle-Data-Lambda`
 - The Request Type is _POST_, the Request Format is _JSON_, and the Device is _Any_.

![Creating AWS Webhook](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20AWS%20Webhook.PNG)

Click _Advanced Settings_.  

 - The _JSON Data_ field shows the data portion of the event JSON that will be sent to AWS.  Add the device name to this list of properties by inserting `"device": "{{PARTICLE_DEVICE_NAME}}"`.

![Creating AWS Webhook](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20AWS%20Webhook%20(2).PNG)
 
 - In the HTTP Headers field, add a key-value pair where the key is x-api-key and the value is the API key.

![Creating AWS Webhook](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20AWS%20Webhook%20(3).PNG)

The [HTTP request code](https://github.com/SpiraInc/ouroboros/blob/master/aws_webhook.json) can be viewed by clicking _CUSTOM TEMPLATE_. When finished, click _Create Webhook_.  

### Testing

The Webhook logs can be monitored by opening the Particle Console and clicking _Integrations_, selecting a Webhook, and scrolling down to _Logs_.  A list of logs associated with recent publish events is shown.  In particular, the _Response_ section of a log is useful for investigating why an attempt to insert in DynamoDB was unsuccessful.

The lambda function's console logs can be monitored by navigating to the Particle-Data-Lambda Montioring Resource and clicking _Jump to Logs_.  However, a CloudWatch Log Group will have to be created in order to receive logs.

In the lambda function, you can create test event objects to run the lambda function without requiring data from Particle.  On the lambda function's Configuration page, go to the drop down menu next to _Test_ and click _Configure Test Events_.  By creating a test that modeled what the Photon would publish, we received the following error message:

![Lambda Test Error](https://github.com/SpiraInc/ouroboros/blob/master/images/Lambda%20Test%20Error.PNG)

This means that the lambda function is not authorized to post data to DynamoDB.  To solve this, we realized that additional permissions were required for the lambda function's Role, and added them as explained in **Creating the Lambda Function for processing data**.

Upon testing real-time data, we received the following Bad Request Response in the Webhook logs:

![Webhook Log Error](https://github.com/SpiraInc/ouroboros/blob/master/images/Bad%20Request%20Response.PNG)

In order to investigate this response, we set up logging of the API Gateway Endpoint.  This requires creation of a new Role that gives the API Gateway permission to log to CloudWatch.  Steps for setting this up can be found [here](https://kennbrodhagen.net/2016/07/23/how-to-enable-logging-for-api-gateway/).

We discovered that this was occurring because the lambda function was not returning a response in the proper format.  The API Gateway Endpoint requires a response of the form:

```
{
    "statusCode": httpStatusCode,
    "headers": { "headerName": "headerValue", ... },
    "body": "{\"myKey\":\"myValue\", ...}"
}
```

We return the status code `200`, an empty header object, and a body of stringified event data.  The response is returned using the following command:

```
context.succeed(response);
```
# Exporting Data for Visualization

### Exporting to Adafruit

To export to our Adafruit.io dashboard, we created an IFTTT applet that listens for the Particle events and then posts the data to the dashboard.  Click _My Applets -> New Applet -> +this_, choose the Particle service, and the _New event published_ trigger.  Then set up the trigger fields as shown:

![Creating IFTTT Applet](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20IFTTT.PNG)

For the action, choose the Adafruit service, and the _Send data to Adafruit IO_ action.  Then set up the action fields as shown:

![Creating IFTTT Applet](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20IFTTT%20(2).PNG)

This approach is limited by the fact that the IFTTT applet can only be implemented for one specific device.  Data posting could also be done through implementation in Particle Build, using Adafruit's client/server libraries. However we decided to use Adafruit as our quick and basic option, and instead will use D3 on S3 for our primary method of data visualization in the long-term.  We used the [MetricsGraphics](https://www.metricsgraphicsjs.org/) library, which is built on top of D3.

### Creating the S3 bucket

The S3 bucket provides a website for which we can write code to visualize the data.  In the future, the website code can be relocated to the Spira domain.

To create the S3 bucket, go to the S3 Resource and click _Create Bucket_.  The bucket is named `particle-photon-data-visualization`.  Click _Next_.

 - In _Set properties_ and _Set permissions_, none of the permissions were changed from default.
 - Once the bucket has been created, click on it in the S3 Resource, and click _Properties -> Static Website Hosting -> Use this bucket to host a website_.  Then we set the name of the file with the website code to `index.html` and an error file to `error.html`.

We must upload an index file, as well as a javascript file (`script.js`), a CSS stylesheet file (`style.css`), and a set of MetricsGraphics files (first create a `dist` subfolder to hold them) to the S3 bucket.  This is done without changing defaults, except for selecting _Grant public read access to this object(s)_ in the _Select Files_ step. 

We must also obtain credentials that allow the website's code to access our DynamoDB table.  This is done by creating an IAM User and a custom Policy that provides read permissions on our table.  Go to the IAM Console and select _Users -> Add User_, then enter specifications as shown:

![Creating IAM User](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20DB%20Reader%20User.PNG)

Click _Next:Permissions_, choose _Attach existing policies directly_ and click _Create policy_.  You will be redirected to creation of a policy.  Enter a JSON policy as shown:

![Creating IAM User](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20DB%20Reader%20User%20(2).PNG)

The DynamoDB ARN can be found by opening the DynamoDB Console, clicking _Tables -> Particle-Photon-Data_, and is found in _Table Details_ in the _Overview_ tab.  Next, click _Review Policy_ and continue:

![Creating IAM User](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20DB%20Reader%20User%20(3).PNG)

Then, go back to creating the User and attach the new Policy:

![Creating IAM User](https://github.com/SpiraInc/ouroboros/blob/master/images/Creating%20DB%20Reader%20User%20(4).PNG)

Click _Review_, then _Create user_.  After that, the Access key ID and Secret access key will become available:

![Viewing AWS Credentials](https://github.com/SpiraInc/ouroboros/blob/master/images/View%20AWS%20Credentials.PNG)

Save these credentials for later use.

### Writing the website HTML

The `index.html` code is a standard HTML document.  The header includes references to the following files:

 - the AWS SDK script file, which allows us to connect and work with DynamoDB
 - the D3 v4 script file
 - the MetricsGraphics script file
 - the JQuery script file
 - our own script file
 - the MetricsGraphics stylesheet
 - our own stylesheet. 

Include the script tags in this order: 
```
<script src='https://sdk.amazonaws.com/js/aws-sdk-2.1.40.min.js'></script>
<script src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js'></script>
<script src='https://d3js.org/d3.v4.js'></script>
<script src='dist/metricsgraphics.min.js'></script>
<script src="script.js"></script>
```
Include the stylesheet tags in this order:
```
<link href="dist/metricsgraphics.css" rel="stylesheet" type="text/css">
<link href="style.css" rel="stylesheet" type="text/css">
```

In the body, there is an SVG element for each graph:

### Querying the DynamoDB table

The graphs for our website will display temperature and pH data collected over the past 24 hours.  We write queries in our website's javascript to fetch this data from our DynamoDB table.

In `script.js`, we start by creating a connection to AWS services:
```
AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.Credentials('[Access key ID]', '[Secret access key]');
```
And create an object to access DynamoDB:
```
var dynamodb = new AWS.DynamoDB();
```
Create a timestamp for 24 hours ago:
```
var dayAgoTimeStamp = new Date().getTime() - 86400000;
dayAgoTimeStamp = new Date(dayAgoTimeStamp).toISOString();
```

Write the query parameters according to DynamoDB query conventions.  Our queries tell DynamoDB to return data entries where the device attribute is `Demo-build`, the event attribute is `Temp` or `phValue`, and the time attribute is greater than or equal to `dayAgoTimeStamp` (according to String comparison):
```
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
    	':dataType': {"S":"Temp"}, //or "S":"phValue"
        ':timeStamp': {"S":dayAgoTimeStamp}
    }
};
```

The query is performed with the following command:
```
dynamodb.query(temperatureParams, function(err, data) {
    if (err) {
      console.log(err);
      return null;
    } else {
      // do things with query data
    }
});
```

The query results are saved in the `data` variable shown above.  In the _else_ statement, we iterate through `data` and extract each time and temperature (or pH) value.  We also process it into the proper format for D3, which means each data point is saved as an object, the time is converted to a Date object, and temperature and pH are converted to numbers.  Finally, each data point object is inserted into an array:
```
for (var key in data.Items) {
    var currentTemp = data.Items[key].data.S;
    var currentTime = data.Items[key].time.S;
    var dataPoint = {
        "time": new Date(currentTime.substring(0,19)),
        "temp": +currentTemp
    }
    temperatureData.push(dataPoint);
}
```
### Creating Visualizations with D3

Once we have made our queries, the `drawAll()` function is called. Since javascript is asynchronous, this function may be called before the queries have completed.  So before doing any drawing, we check to see if the data has been entered to our arrays.  If not, wait 100 milliseconds and then try again:

```
function drawAll () {
    if (temperatureData.length == 0 || phData.length == 0) {
        setTimeout(function(){drawAll()},100);
    }else{
        // draw graphs!
    }
}
```

The temperature graph is created and drawn using this function:
```
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
    x_mouseover: format_x_tooltip,
    y_mouseover: format_y_tooltip,
    animate_on_load: true
});
```
### Testing

The S3 website can be tested by writing console logs in the `script.js` code, then opening the S3 website in Google Chrome (most other browsers will work as well),  and pressing _Ctrl+Shift+I_ to open developer tools.  Click the _Console_ tab to view any logs that have occurred since the web page loaded, as shown in this graphic:

License
----
