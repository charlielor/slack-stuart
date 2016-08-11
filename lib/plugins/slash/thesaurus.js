/********************************************
 *
 * Thesaurus - Find synonyms and antonyms of a given word
 *
 * Author: Charlie Lor @lorcharlie
 *
 ********************************************/

const OK = 200;
const ALTERNATE = 303;
const NOTFOUND = 404;
const ERROR = 500;

var request = require('request');
var logme = require('logme');
var _ = require('underscore');

var getWords = function(stuart, url, user, callback) {
	// Call API to get syn/ant
	request.get({
		url: url
	}, function(err, res, body) {
		if (err) {
			logme.error("Error in request call: " + err);
		} else {
			var data;
			console.log(res.statusCode);
			switch (res.statusCode) {
				case OK:
					var result = {};
					
					// Try to parse data
					try {
						data = JSON.parse(body)
					} catch(err) {
						logme.error(err);
					}
					
					if (data) {
						// noun/verb/adjectives
						var pos = _.keys(data);
						// For each part of speech
						_.each(pos, function(value, key, list) {
							var posVal = value;
							
							// If pos is undefined
							if (result[posVal] === undefined) {
								result[posVal] = {};
							}
							
							// syn/ant/usr/sim/rel
							var thes = _.keys(data[posVal]);
							
							// For each thes, put it in results
							_.each(thes, function(value, key, list) {
								result[posVal][value] = _.sample(data[posVal][value]);								

							});
						});
						callback(result);						
					}
					
					break;
				case ALTERNATE: // Probably not working since it forwards to the alternate word
					stuart.slack_post("Original word was not found but an alternate word has been found!", '@'+user, user);
					break;
				case NOTFOUND:
					stuart.slack_post("You searched for: *" + word + "*\n\n No data could be found for the word or alternates", '@'+user, user);
					break;
				case ERROR:
					stuart.slack_post("Usage exceeded OR API key is invalid or inactive", '@'+user, user);
					break;
				default:
					stuart.slack_post("API error", '@'+user, user);
					logme.error("Error - Response code: " + res.statusCode);
					break;
			}
		}
	});
}

module.exports.run = function(request, args, stuart, plugin) {
	// If arguments are correct, continue, else show usage
	if (args.length === 1) {
		var footer = "Thesaurus service provided by words.bighugelabs.com";
		
		// API Key for Big Huge Thesaurus
		var key = plugin.config.key;
		
		// Version of API
		var version = plugin.config.version;
		
		// Get the word needing the thesaurus
		var word = args[0]
		
		// Set up the API URL
		var url = "http://words.bighugelabs.com/api/" + version + "/" + key + "/" + word + "/json";
		
		// Make the API call and show in chat
		getWords(stuart, url, request.user_name, function(result) {
			// If results is defined, output result
			if (result) {
				var output = "You searched for: *" + word + "*\n\n";
			
				_.each(result, function(value, key, list) {
					output += key + ": \n\n"
				
					_.each(value, function(value, key, list) {
						output += ">*" + key + "*: " + value + "\n";
					});
				
					output += "\n\n\n";
				});
			
				output += footer;
		
				// Display output to user in their own channel
				stuart.slack_post(output, '@'+request.user_name, request.user_name);
			} else {
				stuart.slack_post("How did you get here?", '@'+request.user_name, request.user_name);
				logme.inspect(result);
				logme.error("results is not defined and switch didn't catch status code");
			}
			
		});
		
	} else {
		stuart.slack_post("Too many arguments. Usage: '/stuart thesaurus [word]", '@'+request.user_name, request.user_name);
	}
}

module.exports.help = function(request, stuart) {
	stuart.slack_post("Find synonyms and antonyms of a given word. Usage: '/stuart thesaurus [word]", '@'+request.user_name, request.user_name);
}