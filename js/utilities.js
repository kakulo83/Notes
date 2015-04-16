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

var stringNumberToHintString = function(number, numHintDigits) {
	var characterSet = ["s", "a", "d", "f", "j", "k", "l", "e", "w", "c", "m", "p", "g", "h" ];
  var base, hintString, hintStringLength, i, remainder, _i, _ref;
  if (numHintDigits == null) {
    numHintDigits = 2;
  }
  base = characterSet.length;
  hintString = [];
  remainder = 0;
  while (true) {
    remainder = number % base;
    hintString.unshift(characterSet[remainder]);
    number -= remainder;
    number /= Math.floor(base);
    if (!(number > 0)) {
      break;
    }
  }
  hintStringLength = hintString.length;
  for (i = _i = 0, _ref = numHintDigits - hintStringLength; _i < _ref; i = _i += 1) {
    hintString.unshift(characterSet[0]);
  }
  return hintString.join("");
};

JSON.circularStringify = function(object) {
	return JSON.stringify(object, function(key, value) {
		if (key == 'parent' || key == 'x0' || key == 'y0' || key == 'depth' || key == 'x' || key == 'y' || key == 'id' || key == 'size') {
			 return value.id;
		 }
		else { 
			return value; 
		}
	});
}

Handlebars.registerHelper("render-html", function(context) {
	var html = context;
	return new Handlebars.SafeString(html);
});


