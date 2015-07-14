var gui = require("nw.gui");
var win = gui.Window.get();
var nativeMenuBar = new gui.Menu({ type: "menubar" });

var fs                   = require("fs");
var util                 = require("util");
var executeSilverSearcher = require('child_process').exec;
var executeElasticSearch = require('child_process').exec;

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

	this.elasticsearchclient = this.initElasticSearch();
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

App.prototype.addToElasticSearch = function(data) {
	this.elasticsearchclient.exists({
		index: "notes",
		type: this.subject,
		id: Utilities.hashCode(data.file)
	}, function(error, exists) {
		if (exists === true) {
			this.updateElasticSearchIndex(data);
		} else {
			this.createElasticSearchIndex(data);	
		}
	}.bind(this));	
}

App.prototype.updateElasticSearchIndex = function(data) {
	var record = Utilities.getElasticSearchJson(data.html);
	this.elasticsearchclient.update({
		index: "notes",
		type: this.subject,
		id: Utilities.hashCode(data.file),
		body: {
			doc: {
				title: record.title,
				content: record.body,
				rawHtml: record.html,
				file: data.file
			}
		}
	}, function(error, response) {
		if (error) 
			console.log("Update failed!");
		else
			console.log("Update successful");
	});
}

App.prototype.createElasticSearchIndex = function(data) {
	var record = Utilities.getElasticSearchJson(data.html);
	this.elasticsearchclient.create({
		index: "notes",
		type: this.subject,
		id: Utilities.hashCode(data.file),
		body: {
			title: record.title,
			content: record.body,
			rawHtml: record.html,
			file: data.file
		}
	}, function(error, response) {
		if (error)
			console.log("Create failed!");
		else
			console.log("Create successful");
	});
}

App.prototype.showGlobalFindInputField = function() {
	$("#global-search-container").show();
	$("#global-search-input").attr("placeholder", "Enter query");
	$("#global-search-input").val("");
	$("#global-search-input").focus();
}

App.prototype.performGlobalFind = function() {
	var searchterms = $("#global-search-input").val();

	this.elasticsearchclient.search({
		index: "notes",
		type: this.subject,
		body: {        
   		query: {               
   			match_phrase: {
					content: searchterms
				}
  		}
		}
	}, function(searchterms, error, response) {
		var hits = response.hits.hits;	
		this.showGlobalFindResults(searchterms, hits);
	}.bind(this,searchterms));
}

App.prototype.showGlobalFindResults = function(query, hits) {
	// display results
	results = _.map(hits, function(hit) {
		var result = hit._source;
		var title = result.title;
		var html = result.rawHtml;
		var file = result.file;
		return { "title": title, "html": html, "file": file };
	});

	var data = { 
		"query": query,
		"results": results
	};

	// render results	
	var searchResultsHtml =  window.Handlebars.templates.globalsearch(data);
	$("#mode-container").append(searchResultsHtml);

}

App.prototype.closeFind = function() {
	$("#global-search-container").hide();
}

App.prototype.localFind = function(query) {
	myCmd = 'ag --ackmate -G "(.object|.process)" --no-numbers -a -C ' + query + ' /Users/robertcarter/Documents/VIL/' + this.getSubject() + '.notes/';
	var deferred = $.Deferred();
	executeSilverSearcher(myCmd,  function (query, deferred, error, stdout, stderr) {
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

	var header = window.document.createElement("H3");
	header.innerHTML = "Results for: ";
	var queryName = window.document.createElement("SPAN");
	queryName.className = "queryname";
	queryName.innerHTML = query;
	$(header).append(queryName);
	$(searchResultsDiv).append(header);

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

App.prototype.openSearchMatch = function() {
	// determine match file type and open appropriate mode
	var filepath = $(".search-match.active .filepath").text();
	var fileExtension = /[^.]+$/.exec(filepath)[0];
	var fileName = filepath.replace(/^.*[\\\/]/, '');
	var selection = {};

	switch (fileExtension) {
		case Constants.FILETYPE.OBJECT:
			selection = { "name": fileName, "file": filepath };
			this.changeMode(Constants.Mode.OBJECT, selection);
			break;
		case Constants.FILETYPE.PROCESS:
			selection = { "name": fileName, "file": filepath };
			this.changeMode(Constants.Mode.PROCESS, selection);
			break;
	}
}

App.prototype.initElasticSearch = function() {
	// Check if there is an ealstic_search process running by using the ElasticSearchClient to 
	// attempt to contact elasticsearch on port 9200.  If no response is given, start a new
	// elasticsearch process

	var elasticsearch = require("elasticsearch");

	var ElasticSearchClient = new elasticsearch.Client({
		protocol: "https"
	});
	
  ElasticSearchClient.ping({
		requestTimeout: 30000,
		// undocumented params are appended to the query string
			hello: "elasticsearch"
		},

		function (error) {
			if (error) {
				console.error('elasticsearch cluster is down!');
			} else {
				console.log('Elasticsearch cluster running :)');
			}
	});
	
	return ElasticSearchClient;
		
	/*
	elastic_search_command = 'elasticsearch'; 
	executeElasticSearch(elastic_search_command,  function (error, stdout, stderr) {
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
	*/
}


