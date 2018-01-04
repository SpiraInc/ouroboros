[![N|Solid](https://www.livespira.com/wp-content/uploads/2017/02/spira_logotype_Spira-Green_rgb-1.png)](https://www.livespira.com/)
# Overview
This guide documents the steps required to ingest time series sensor data from Particle Photon chips, post this data to the AWS database and Adafruit.io, and create D3 visualizations of data on an S3 website.

The chip is being programmed in C++ using the Particle Build interface. It is currently logging temperature and pH data, and we aim to expand to more outputs.  The current goal is to create Particle webhooks that listen to the chip's published data, then POST the data to a AWS API Gateway Endpoint where an AWS Lambda function will ingest the data and post to AWS DynamoDB. An AWS S3 website will query DynamoDB and create graphs using the D3.js library.  There will also be Particle code that will POST the data to Adafruit.io to create pretty graphs. 

### Obtaining sensor data from Particle Build

The main code for this chip is the app [`particle_master`](https://github.com/SpiraInc/ouroboros/blob/master/particle_master) on Particle Build.  When this code is run, the temperature and pH sensors are read every minute or so, and this data is published (made available to the Webhooks) using the following commands:

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

We will be using an AWS DynamoDB table to store our data, which has been named `Particle-Photon-Data`.  The table was created by clicking _Create table_ in the DynamoDB dashboard.  The table properties and settings were chosen as shown in the graphic below:

The successfully logged data can be viewed in the DynamoDB dashboard as shown below:

### Creating the Lambda Function for processing data

The lambda function can be thought of as an intermediary in the "handshake" between Particle and DynamoDB.  The lambda function receives a JSON event object from the Webhook's POST request, processes the data, and inserts it into the table in DynamoDB.  It was created by navigating to the Lambda resource and clicking _Create function_.  Our lambda function is named `Particle-Data-Lambda` and settings were chosen as shown in the graphic below:

The function's Role must have permission to write to DynamoDB.  To provide this permission, we created a new Role by clicking _Create a custom role_ in the _Role_ dropdown menu shown above.  This redirects to creation of an IAM Role, which was done as shown below:

To add the necessary permissions, navigate to the IAM Dashboard and click _Roles -> Your new Role -> Attach policy_ and select the _AmazonDynamoDBFullAccess_ permissions policy:

Now, return to creation of the lambda function and select _Choose an existing role_ in the _Role_ dropdown menu, and select the new Role.  Then click _Create function_.

### Creating the API Gateway Endpoint

The API Gateway Endpoint was built with Lambda proxy integration as opposed to custom integration.  More information about the difference between these two can be found [here](https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started-with-lambda-integration.html).

Open the Particle-Data-Lambda Configuration and click _API Gateway_.

 - The API name is `ParticleAPIGateway`.
 - The deployment stage is _prod_.
 - The security mechanism is _Open with access key_.

Click _Create_ then _Save_ in order to finish setting up the API.  Now, the API url with endpoint value is available as shown below:

To obtain the API key, navigate to the API Gateway and click _API Keys -> Actions -> Create API Key_.  The key was named `ParticleAPIGatewayKey` as shown below:

In order to associate this key with our API Gateway Endpoint, a Usage Plan must be created.

### Creating the Webhooks

Two Webhooks were created, one for logging temperature and one for logging pH.  In the Particle Console, click _Integrations -> New Integration -> Webhook_.

 - The AWS Webhooks can be created using the Webhook Builder.
 - The Event Names are _phValue_ and _Temp_, since these must identical to the event names published in the Particle Build app. The two Webhooks are exactly the same other than the Event Name.
 - The URL is `https://[endpoint].execute-api.us-east-1.amazonaws.com/prod/Particle-Data-Lambda`
 - The Request Type is _POST_, the Request Format is _JSON_, and the Device is _Any_.

Click _Advanced Settings_.  

 - The _JSON Data_ field shows the data portion of the event JSON that will be sent to AWS.  Add the device name to this list of properties by inserting `"device": "{{PARTICLE_DEVICE_NAME}}"`.
 - In the HTTP Headers field, add a key-value pair where the key is `x-api-key` and the value is the API key.

Click _Create Webhook_.


### Testing

The lambda function's console logs can be monitored by navigating to the Particle-Data-Lambda Montioring Resource and clicking _Jump to Logs_.  However, a CloudWatch Log Group will have to be created in order to receive logs.

In the lambda function, you can create test functions to run the lambda function without posting data from Particle.  On the lambda function's Configuration page, go to the drop down menu next to _Test_ and click _Configure Test Events_.  
From this we received the following error message:
This means that the lambda function is not authorized to post data to DynamoDB.  To solve this, we realized that additional permissions were required for the lambda function's Role, and added them as explained in **Creating the Lambda Function for processing data**.

Upon testing data, we received the following Bad Request Response:

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

To export to our Adafruit.io dashboard, we created an IFTTT applet that listens for the Particle events and then posts the data to the dashboard.

This approach is limited by the fact that the IFTTT applet can only be implemented for one specific device.  Data posting could also be done through implementation in Particle Build, using Adafruit's client/server libraries. However we decided to use Adafruit as our quick and basic option, and instead will use D3 on S3 for our primary method of data visualization in the long-term.

### Creating the S3 bucket

The S3 bucket provides a website for which we can write code to visualize the data.  In the future, the website code can be relocated to the Spira domain.

To create the S3 bucket, go to the S3 Resource and click _Create Bucket_.  The bucket is named `particle-photon-data-visualization`.  Click _Next_.

 - In _Set properties_ and _Set permissions_, none of the permissions were changed from default.
 - Once the bucket has been created, click on it in the S3 Resource, and click _Properties -> Static Website Hosting -> Use this bucket to host a website_.  Then we set the name of the file with the website code to `index.html` and an error file to `error.html`.

We must upload an index file, as well as a javascript file (`script.js`) and a CSS stylesheet file (`style.css`) to the S3 bucket.  This is done without changing defaults, except for selecting _Grant public read access to this object(s)_ in the _Select Files_ step.

We must also obtain credentials that allow the website's code to access our DynamoDB table.  This is done by creating an IAM User and a custom Policy that provides read permissions on our table.

### Writing the website code

The `index.html` code is a standard HTML document.  Note some important details:

 - The header must include the AWS SDK script file, which allows us to connect and work with DynamoDB. Include the tag: 
```
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1.40.min.js"></script>
```
 - In order for this web page to run our javascript code, include this tag as well:
```
<script src="script.js"></script>
```

In `script.js`, we start by creating a connection to AWS services using the following code:
```
AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.Credentials('[Access key ID]', '[Secret access key]');
```

### Creating Visualizations with D3

### Testing

The S3 website can be tested by writing console logs in the `script.js` code, then opening the S3 website in Google Chrome (most other browsers will work as well),  and pressing _Ctrl+Shift+I_ to open developer tools.  Click the _Console_ tab to view any logs that have occurred since the web page loaded, as shown in this graphic:

License
----