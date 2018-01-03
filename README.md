[![N|Solid](https://www.livespira.com/wp-content/uploads/2017/02/spira_logotype_Spira-Green_rgb-1.png)](https://www.livespira.com/)
# Overview
This guide documents the steps required to ingest time series sensor data from Particle Photon chips and post this data to the AWS database and Adafruit.io.

The chip is being programmed in C++ using the Particle Build interface. It is currently logging temperature and pH data, and we aim to expand to more outputs.  The current goal is to create Particle webhooks that listen to the chip's published data, then POST the data to a AWS API Gateway Endpoint where an AWS Lambda function will ingest the data and post to AWS DynamoDB. There will be another set of Particle webhooks that will POST the data to Adafruit.io to create pretty graphs. 

# Obtaining Sensor Data from Particle Build

<<<<<<< HEAD
The main code for this chip is the app [`particle_master`](https://github.com/SpiraInc/ouroboros/blob/master/particle_master) on Particle Build.  When this code is run, the temperature and pH sensors are read every minute or so, and this data is published (made available to the Webhooks) using the following commands:
=======
The main code for this chip is the app [`particle_master`](https://github.com/SpiraInc/ouroboros/blob/master/particle_master) on Particle Build.  When this code is run, the temperature and pH sensors are read every 20 seconds or so, and this data is published (made available to the Webhooks) using the following commands:
>>>>>>> cc5f4f5927dd58cfe7d406e38ea5d19363fc9226

```
Particle.publish("phValue", String(phValue, 2));
Particle.publish("Temp", String(Temp, 2));
```

 - The first parameter is the name of the event associated with the publish. Our Webhooks will listen for these two specific events in order to be triggered.  
 - The second parameter is the data value.

<<<<<<< HEAD
In order to log the device name, a variable encoding the device name must be defined, which is done by defining the data variable as follows:

```
(todo)
```
=======
>>>>>>> cc5f4f5927dd58cfe7d406e38ea5d19363fc9226

# Exporting Data to Amazon Web Services


###  Creating the AWS Data Table

We will be using an AWS DynamoDB table to store our data, which has been named `Particle-Photon-Data`.  The table was created by clicking _Create table_ in the DynamoDB dashboard.  The table properties and settings were chosen as shown in the graphic below:

The successfully logged data can be viewed in the DynamoDB dashboard as shown below:

### Creating the Lambda Function for Processing Data

<<<<<<< HEAD
The lambda function can be thought of as an intermediary in the "handshake" between Particle and DynamoDB.  The lambda function receives a JSON event object from the Webhook's POST request, processes the data, and inserts it into the table in DynamoDB.  It was created by navigating to the Lambda resource and clicking _Create function_.  Our lambda function is named `Particle-Data-Lambda` and settings were chosen as shown in the graphic below:

The function's Role must have permission to write to DynamoDB.  To provide this permission, we created a new Role by clicking _Create a custom role_ in the _Role_ dropdown menu shown above.  This redirects to creation of an IAM Role, which was done as shown below:

To add the necessary permissions, navigate to the IAM Dashboard and click _Roles -> Your new Role -> Attach policy_ and select the _AmazonDynamoDBFullAccess_ permissions policy:

Now, return to creation of the lambda function and select _Choose an existing role_ in the _Role_ dropdown menu, and select the new Role.  Then click _Create function_.
=======
The lambda function can be thought of as an intermediary in the "handshake" between Particle and DynamoDB.  The lambda function receives a JSON event object from the Webhook's POST request, processes the data, and inserts it into the table in DynamoDB.  It was created by navigating to the Lambda resource and clicking _Create function_.
>>>>>>> cc5f4f5927dd58cfe7d406e38ea5d19363fc9226

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

<<<<<<< HEAD
Click _Advanced Settings_.  

 - The _JSON Data_ field shows the data portion of the event JSON that will be sent to AWS.  Add the device name to this list of properties by inserting `"device": "{{PARTICLE_DEVICE_NAME}}"`.
 - In the HTTP Headers field, add a key-value pair where the key is `x-api-key` and the value is the API key.

Click _Create Webhook_.


### Testing

The lambda function's console logs can be monitored by navigating to the Particle-Data-Lambda Montioring Resource and clicking _Jump to Logs_.  However, a CloudWatch Log Group will have to be created in order to receive logs.

In the lambda function, you can create test functions to run the lambda function without posting data from Particle.  On the lambda function's Configuration page, go to the drop down menu next to _Test_ and click _Configure Test Events_.  
From this we received the following error message:
This means that the lambda function is not authorized to post data to DynamoDB.  To solve this, we realized that additional permissions were required for the lambda function's Role, and added them as explained in **Creating the Lambda Function for Processing Data**.

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
=======
Click _Advanced Settings_.  The _JSON Data_ field shows the data portion of the event JSON that will be sent to AWS.

 - In the HTTP Headers field, add a key-value pair where the key is `x-api-key` and the value is the API key.

Click _Create Webhook_.
### Testing

The lambda function's console logs can be monitored by navigating to the Particle-Data-Lambda Montioring Resource and clicking _Jump to Logs_.

>>>>>>> cc5f4f5927dd58cfe7d406e38ea5d19363fc9226
# Exporting Data to Adafruit

### Creating the feeds

### Creating the Webhooks

### Testing

License
----