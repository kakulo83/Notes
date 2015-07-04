var gui = require("nw.gui");
var win = gui.Window.get();
var nativeMenuBar = new gui.Menu({ type: "menubar" });

var fs             = require("fs");
var util           = require("util");
var exec           = require('child_process').exec;
var elastic_search = require('child_process').exec;

var Utilities         = require("./js/utilities.js");
var Constants         = require("./js/constants.js");
var UI                = require("./js/ui_constants.js");
var IndexController   = require("./js/index_controller.js");
var TreeController    = require("./js/tree_controller.js");
var ObjectController  = require("./js/object_controller.js");
var ProcessController = require("./js/process_controller.js");

// check operating system for the menu
if (process.platform === "darwin") {
    nativeMenuBar.createMacBuiltin("VIL Tool");
}

win.menu = nativeMenuBar;
var app = null;

// Entry point for app
$(document).ready(function() {
	window.$ = $;
	window.d3 = d3;
	window.Handlebars = Handlebars;
	window._ = _;
	window.CodeMirror = CodeMirror;
	win.showDevTools();
	var subject = gui.App.argv[0];
	app = new App();
	app.init(subject);
});

App = function() { };
App.prototype.init = function(subject) {
	this.subject = subject;

	this.getMode = function() { return this.mode; };
	this.setMode = function(newMode) { this.mode = newMode; };

	this.getSubject = function() { return this.subject; };
	this.setSubject = function(newSubject) { this.subject = newSubject; };
	
	this.getProcess = function() { return this.process; };
	this.setProcess = function(newProcess) { this.process = newProcess; };

	this.getObject = function() { return this.object; };
	this.setObject = function(newObject) { this.object= newObject; };

	this.index_controller   = new IndexController(this, subject, window);
	this.tree_controller    = new TreeController(this, subject, window);

	this.object_controller = ObjectController;
	this.object_controller.init(this, window);

	this.process_controller = ProcessController;
	this.process_controller.init(this, window);

	document.addEventListener("keydown", this.handleKeyPress.bind(this), false);
	this.changeMode(Constants.Mode.TREE);

	//this.initElasticSearch();
}

App.prototype.changeMode = function(mode, selection) {
	this.setMode(mode);
	switch(mode) {
		case Constants.Mode.INDEX:
			this.index_controller.makeActive();
			break;
		case Constants.Mode.TREE:
			this.tree_controller.makeActive();
			break;
		case Constants.Mode.PROCESS:
			this.process_controller.makeActive(selection);
			break;
		case Constants.Mode.OBJECT:
			this.object_controller.makeActive(selection);
			break;
		default:
	}
}

App.prototype.handleKeyPress = function(e) {
	e = e || window.event;
  var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	//console.log("Character typed: " + String.fromCharCode(charCode));
	//console.log("Character code: " + charCode);

	switch(this.getMode()) {
		case Constants.Mode.INDEX:
			this.index_controller.handleKeyPress(e);
			break;
		case Constants.Mode.TREE:
			this.tree_controller.handleKeyPress(e);
			break;
		case Constants.Mode.PROCESS:
			this.process_controller.handleKeyPress(e);
			break;
		case Constants.Mode.OBJECT:
			this.object_controller.handleKeyPress(e);
			break;
		default:
			break;
	}
}

App.prototype.toggleMenu = function() {
	if ($(UI.MODE_MENU_CONTAINER).is(":visible")) 
		$(UI.MODE_MENU_CONTAINER).hide();
	else
		$(UI.MODE_MENU_CONTAINER).show();
}

App.prototype.globalFind = function(query) {
	myCmd = 'ag --ackmate -G "(.object|.process)" --no-numbers -a -C ' + query + ' /Users/robertcarter/Documents/VIL/' + this.getSubject() + '.notes/';

	var deferred = $.Deferred();

	exec(myCmd,  function (query, deferred, error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
			deferred.reject();
		}
		if (! stdout) {
			deferred.resolve(false);
		}
		var searchResults = Utilities.parseAckmateString(stdout);
		this.renderSearchResults(searchResults, query);
		deferred.resolve(true);
	}.bind(this, query, deferred));
	return deferred;
}

App.prototype.renderSearchResults = function(searchResults, query) {
	var searchResultsDiv = window.document.createElement("DIV");
	searchResultsDiv.className = "searchresults";	

	var queryHeader = window.document.createElement("H3");
	queryHeader.innerHTML = "Results for: " + query;
	$(searchResultsDiv).append(queryHeader);

	var searchMatchesContainer = window.document.createElement("DIV");
	searchMatchesContainer.className = "search-matches-container";
	$(searchResultsDiv).append(searchMatchesContainer);

	// Iterate through each result
	for (var i=0; i<searchResults.length; i++) {
		// show the file path
		var matchDiv = window.document.createElement("DIV");
		matchDiv.className = "search-match";
		var file = window.document.createElement("P");
		file.className = "filepath";
		file.innerHTML = searchResults[i].file;
		$(matchDiv).append(file);
		var context = searchResults[i].context;	
		// show the context

		var classPattern = /class=[',\"]([\w- ])*[',\"]/g;
		var idPattern = /id=[',\"]([\w- ])*[',\"]/g;
		for (var j=0; j<context.length; j++) {
			// check if context contains location indices (40 4:<h3 ...</h3>)
			if ( (/^\d+.*\:.*/).test(context[j]) ) { 
				var strippedContext = context[j].split(":")[1].replace(classPattern, "").replace(idPattern, "");
				strippedContext.replace(query, "<span class='query-match'>" + query + "</span>");
				$(matchDiv).append(strippedContext);
			}
			else {
				var additionalContext = context[j].replace(classPattern, "").replace(idPattern, "");
				$(matchDiv).append(additionalContext);

				/*
				$(matchDiv).find("div").removeClass().removeAttr("data-depth");
				$(matchDiv).find("p:not(:first)").removeClass().attr("id", "");
				$(matchDiv).find("h3").removeClass().attr("id", "");
				*/
			}
		}
		$(searchMatchesContainer).append(matchDiv);
	}
	$(searchResultsDiv).find(".search-match").first().addClass("active");
	$("#mode-container").append(searchResultsDiv);
	this.renderMath(searchResultsDiv);
}

App.prototype.moveDownSearchResult = function() {
	var nextSearchMatch = $(UI.SEARCH_MATCH_ACTIVE).next();
	if (nextSearchMatch.length === 0) { nextSearchMatch = $(UI.SEARCH_MATCH).first(); }
	$(UI.SEARCH_MATCH_ACTIVE).removeClass("active");
	$(nextSearchMatch).addClass("active");
	var boundingRect = nextSearchMatch[0].getBoundingClientRect();
	$(UI.SEARCH_MATCH_ACTIVE)[0].scrollIntoView({block: "end"});
}

App.prototype.moveUpSearchResult = function() {
	var prevSearchMatch = $(UI.SEARCH_MATCH_ACTIVE).prev();
	if (prevSearchMatch.length === 0) { prevSearchMatch = $(".search-match").last(); }
	$(UI.SEARCH_MATCH_ACTIVE).removeClass("active");
	$(prevSearchMatch).addClass("active");
	$(UI.SEARCH_MATCH_ACTIVE)[0].scrollIntoView({block: "top"});
}

App.prototype.renderMath = function(element) {
	if (element)

		MathJax.Hub.Queue(["Typeset", MathJax.Hub, element]);
	else
		MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
}

App.prototype.openMatch = function() {
	// determine match file type and open appropriate mode
	var filepath = $(".search-match.active .filepath").text();
	var fileExtension = /[^.]+$/.exec(filepath)[0];
	var fileName = filepath.replace(/^.*[\\\/]/, '');

	switch (fileExtension) {
		case Constants.FILETYPE.OBJECT:
			var selection = { "name": fileName, "file": filepath };
			this.changeMode(Constants.Mode.OBJECT, selection);
			break;
		case Constants.FILETYPE.PROCESS:
			var selection = { "name": fileName, "file": filepath };
			this.changeMode(Constants.Mode.PROCESS, selection);
			break;
	}
}

App.prototype.initElasticSearch = function() {
	// Check if there is an ealstic_search process running
	
	// If no process is found, start a new elastic_search process
	elastic_search_command = 'elasticsearch'; 
	elastic_search(myCmd,  function (error, stdout, stderr) {
		if (error) {
		 console.log(error.stack);
		 console.log('Error code: '+error.code);
		 console.log('Signal received: '+error.signal);
		}
		console.log('Child Process STDOUT: '+stdout);
		console.log('Child Process STDERR: '+stderr);
	}.bind(this));

	elastic_search.on("exit", function(code) {
		console.log('Child process exited with exit code '+code);
	}.bind(this));
}


