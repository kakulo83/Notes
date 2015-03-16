String.interpolate = function () {
	// First argument is the string where the interpolation occurs
	// The next n arguments are the values to be interpolated into the string (denoted with '%@')
	// ex:  String.interpolate("My what a big %@ you have", "ass");

	// Check if correct number of interpolation arguments are given	
	var string = arguments[0];
	var numberOfInterpolations = string.match(new RegExp("%@", "g")).length;
	if (numberOfInterpolations > arguments.length - 1)
		throw "insufficient arguments";
	if (numberOfInterpolations < arguments.length - 1)
		throw "too many arguments";

	// Perform interpolation
	for (var i=1; i<arguments.length; i++) {
		string = string.replace("%@", arguments[i]);		
	}
	return string;
};
