[![N|Solid](https://www.livespira.com/wp-content/uploads/2017/02/spira_logotype_Spira-Green_rgb-1.png)](https://www.livespira.com/)
# Overview
This guide documents the steps required to ingest time series sensor data from Particle Photon chips and post this data to the AWS database and Adafruit.io.

The chip is being programmed in C++ using the Particle Build interface. It is currently logging temperature and pH data, and we aim to expand to more outputs.  The current goal is to create Particle webhooks that listen to the chip's published data, then POST the data to a AWS API Gateway Endpoint where an AWS Lambda function will ingest the data and post to AWS DynamoDB. There will be another set of Particle webhooks that will POST the data to Adafruit.io to create pretty graphs. 

# Obtaining Sensor Data from Particle Build

The main code for this chip is the app [`particle_master`](https://github.com/SpiraInc/ouroboros/blob/master/particle_master) on Particle Build.  When this code is run, the temperature and pH sensors are read every 20 seconds or so, and this data is published (made available to the Webhooks) using the following commands:

```
Particle.publish("phValue", String(phValue, 2));
Particle.publish("Temp", String(Temp, 2));
```

 - The first parameter is the name of the event associated with the publish. Our Webhooks will listen for these two specific events in order to be triggered.  
 - The second parameter is the data value.


# Exporting Data to Amazon Web Services


###  Creating the AWS Data Table

We will be using an AWS DynamoDB table to store our data, which has been named `Particle-Photon-Data`.  The table was created by clicking _Create table_ in the DynamoDB dashboard.  The table properties and settings were chosen as shown in the graphic below:

The successfully logged data can be viewed in the DynamoDB dashboard as shown below:

### Creating the Lambda Function for Processing Data

The lambda function can be thought of as an intermediary in the "handshake" between Particle and DynamoDB.  The lambda function receives a JSON event object from the Webhook's POST request, processes the data, and inserts it into the table in DynamoDB.  It was created by navigating to the Lambda resource and clicking _Create function_.

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

Click _Advanced Settings_.  The _JSON Data_ field shows the data portion of the event JSON that will be sent to AWS.

 - In the HTTP Headers field, add a key-value pair where the key is `x-api-key` and the value is the API key.

Click _Create Webhook_.
### Testing

The lambda function's console logs can be monitored by navigating to the Particle-Data-Lambda Montioring Resource and clicking _Jump to Logs_.

# Exporting Data to Adafruit

### Creating the feeds

### Creating the Webhooks

### Testing

License
----