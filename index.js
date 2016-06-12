/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * App ID for the skill
 */
var APP_ID = ""; 

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * http node module included to support the http request to Yahoo's YQL query service.
 */
var https = require('https');

/**
 * Node.js util native module included so that an object can be checked to see if it is an Array object or not
 */
var util = require('util');

/**
 * Get the U.S U3 and U6 unemployment values from the BLS: http://www.bls.gov/lau/stalt.htm
 */
 
 function getUnemploymentResponse(response) {
	 
	 makeUnemploymentRequest(function unemploymentLoadedCallback(err, unemploymentResponse) {
		 
		var speechOutput; 
	
		var result = []; 
		
		console.log("unemploymentLoadedCallback was run.");
		
		if (err) {
			speechOutput = "Sorry, Reporter is having trouble retrieving the latest U.S federal unemployment value right now. Please try again later.";
		} else {
			
			getNames(unemploymentResponse); 

			function getNames(obj, name) {

				for (var key in obj) {

					if (obj.hasOwnProperty(key)) {

						if (util.isArray(obj[key])) {

							var unemploymentArray = obj[key];
							result.push(unemploymentArray[0]);
							result.push(unemploymentArray[1]);
							console.log("else if was run.");
							
						} else if ("object" == typeof(obj[key])) {

							getNames(obj[key], name);
						
						}
					} 
				} 
			} 	

			var intermediarySpeech;
			
			if (/^\s+$/.test(result.toString())) {
				intermediarySpeech = "<speak>An error has occurred. Please try again later. If you continue to receive this message, please contact the developer."
			} else {
				
				console.log(result.toString());
				
				intermediarySpeech = "<speak>The 4-quarter moving-average for the U 3 unemployment rate is " + result[0].toString() + " percent and the 4-quarter moving-average for the U 6 unemployment rate is " + result[1].toString() + " percent. ";		
				
			}
			
			intermediarySpeech += "You can visit the Bureau of Labor Statistics's website, b l s dot gov, in your web browser to learn more.</speak>";
			
			console.log("intermediarySpeech output = " + intermediarySpeech.toString());
			
			speechOutput = {
				speech: intermediarySpeech.toString(),
				type: AlexaSkill.speechOutputType.SSML
			} 
			
			response.tell(speechOutput);
			
		} 

	}); 
	 
 } 

function makeUnemploymentRequest(unemploymentLoadedCallback) {
	 
	var baseURL = "https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20html%20WHERE%20url%3D%22http%3A%2F%2Fwww.bls.gov%2Flau%2Fstalt.htm%22%20and%20xpath%3D%22%2Fhtml%2Fbody%2Fdiv%5B5%5D%2Fdiv%2Fdiv%2Ftable%2Ftbody%2Ftr%2Ftd%5B2%5D%2Fdiv%2Ftable%2Ftbody%5B1%5D%2Ftr%5B1%5D%2Ftd%5B3%5D%7C%2Fhtml%2Fbody%2Fdiv%5B5%5D%2Fdiv%2Fdiv%2Ftable%2Ftbody%2Ftr%2Ftd%5B2%5D%2Fdiv%2Ftable%2Ftbody%5B1%5D%2Ftr%5B1%5D%2Ftd%5B6%5D%22&format=json";
	
	var url = baseURL;
	
	console.log(url);
	
	https.get(url, function (res) {
        var unemploymentResponseString = '';
        console.log('Status Code: ' + res.statusCode);

        if (res.statusCode != 200) {
            unemploymentLoadedCallback(new Error("Non 200 Response"));
        }

        res.on('data', function (data) {
            unemploymentResponseString += data;
        });

        res.on('end', function () {
            var unemploymentResponseObject = JSON.parse(unemploymentResponseString);

            if (unemploymentResponseObject.error) {
                console.log("Drudge Report error: " + unemploymentResponseObject.error.message);
                unemploymentLoadedCallback(new Error(unemploymentResponseObject.error.message));
            } else {
                unemploymentLoadedCallback(null, unemploymentResponseObject);
            }
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        unemploymentLoadedCallback(new Error(e.message));
    });
	
}

/**
 * ReporterUnemploymentRequester is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see http://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var ReporterUnemploymentRequester = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
ReporterUnemploymentRequester.prototype = Object.create(AlexaSkill.prototype);
ReporterUnemploymentRequester.prototype.constructor = ReporterUnemploymentRequester;

ReporterUnemploymentRequester.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("ReporterUnemploymentRequester onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

ReporterUnemploymentRequester.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("ReporterUnemploymentRequester onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleNewUnemploymentRequest(response);
};

/**
 * Overridden to show that a subclass can override this function to teardown session state.
 */
ReporterUnemploymentRequester.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("ReporterUnemploymentRequester onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

ReporterUnemploymentRequester.prototype.intentHandlers = {
    "GetNewUnemploymentIntent": function (intent, session, response) {
		console.log("new unemployment value intent reached");
		handleNewUnemploymentRequest(response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can ask Reporter to tell you the current U.S federal unemployment, or, you can say exit... What can I help you with?", "What can I help you with?");
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

function handleNewUnemploymentRequest(response) {
	
	getUnemploymentResponse(response); 
	
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {	
	
	// Create an instance of the ReporterUnemploymentRequester skill.
    var unemploymentRequester = new ReporterUnemploymentRequester();
	
    unemploymentRequester.execute(event, context);
};

