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

JSON.circularStringify = function(object) {
	/* ORIGINAL
	return JSON.stringify(object, function(key, value) {
		if (key == 'parent' || key == 'x0' || key == 'y0' || key == 'depth' || key == 'x' || key == 'y' || key == 'id' || key == 'size') {
			 return value.id;
		}
		else {
			return value; 
		}
	});
	*/

	/*
	var cache = [];
	return JSON.stringify(object, function(key, value) {
		if (typeof value === 'object' && value !== null) {
        if ( (cache.indexOf(value) !== -1) || key == 'parent' || key == 'x0' || key == 'y0' || key == 'depth' || key == 'x' || key == 'y' || key == 'id' || key == 'size') {
          // Circular reference found, discard key
          return;
        } 
        // Store value in our collection
        cache.push(value);
    }
    return value;
	});
	*/
	return JSON.stringify(object, function(key, value) {
		if (key == 'parent' || key == 'x0' || key == 'y0' || key == 'depth' || key == 'x' || key == 'y' || key == 'id' || key == 'size' ) {
			 return;
		}
		else {
			return value; 
		}
	});
}

exports.flattenTree = function (node) {
	var flatArray = [];
	var stack = [];
	stack.push(node);

	// simple breadth first traversal
	while (stack.length > 0) {	
		var currentNode = stack.pop();			
		if (currentNode.children) {
			for(var i=0; i<currentNode.children.length; i++) {
				stack.push(currentNode.children[i]);			
			}	
		}
		var orphan = { };
		orphan.name = currentNode.name;
		orphan.file = currentNode.file;
		orphan.parent = null;
		flatArray.push(orphan);
	}
	return flatArray;
}

exports.stringNumberToHintString = function(number, numHintDigits) {
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
}

exports.parseAckmateString = function(input) {
	var lines = input.split(/\n/);
	var output = [];
	for (var i = 0; i < lines.length; i++) {
		// if line is filename, create and push new result object into output array		
		if ( (/^:.*/).test(lines[i]) )
			output.push({ "file": lines[i].slice(1), "context": [] });
		// if line is part of the context, push onto context array of last result object
		else 
			output[output.length-1]["context"].push(lines[i]);	
	}
	return output;
}

