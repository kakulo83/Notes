var fs = require("fs");
var Constants = require("./constants.js");
var Utilities = require("./utilities.js");

var State = {
	NORMAL: 0,
	MENU: 1,
	QUICKLINK: 2,
	COMMANDPROMPT: 3,
	MOVE_OBJECT: 4		
}

var IndexController = function(app, subject, window) {
	this.app = app;
	$ = window.$;
	Handlebars = window.Handlebars;
	_ = window._;

	this.nodes = null;
	this.file = null;
	this.subject = subject || null;
	this.keyStrokeStack = [];
	this.currentNode = null;
}

IndexController.prototype.makeActive = function() {
	this.state = State.NORMAL;
	if (this.nodes)
		this.renderView();	
	else
		this.getData(this.subject);
}

IndexController.prototype.getData = function(subject) {
	if (subject) {
		this.subject = subject;
		var file = String.interpolate("%@%@.notes/%@.tree", Constants.PATH, subject, subject); 
		d3.json(file, this.processData.bind(this));
	}
	else {
		var file = 	String.interpolate("%@%@.notes/%@.json", Constants.PATH, subject, subject); 
		var root = { "name": "New Subject", "file": file, "children": [], "orphans": [] };
		this.file = null;
		this.nodes = (root);
		this.renderView();
	}
}

IndexController.prototype.processData = function(error, nodes) {
	if (nodes) {
		this.file = String.interpolate("%@%@.notes/%@.json", Constants.PATH, this.subject, this.subject); 
		this.nodes = nodes;
		this.orphans = nodes.orphans;
		this.renderView();
	}
	else {
		var file = 	String.interpolate("%@%@.notes/%@.tree", Constants.PATH, this.subject, this.subject); 
		var root = { "name": this.subject , "file": file, "children": [], "orphans": [] };
		this.file = null;
		this.nodes = root;
	}
}

IndexController.prototype.renderView = function() {
	var modeTemplate = Handlebars.templates.index;	
	$("#mode-container").html(modeTemplate());

	// Do depth-first iteration of tree, append Objects as encountered
	var queue = [];

	var root = this.nodes;
	root["indentation"] = 0;
	queue.push(this.nodes);

	while (queue.length > 0) {
		var currentObject = queue.shift();
		
		// create object html	
		addObjectToDOM(currentObject);
		if (currentObject.children) {
			for(var i = currentObject.children.length-1; i>=0; i--) {
				var child = currentObject.children[i];
				var depth = currentObject.indentation + 1;
				child["indentation"] = depth; 
				queue.unshift(child);
			}
		} else if (currentObject._children) {
			for(var j = currentObject.children.length-1; j>=0; j--) {
				var child = currentObject.children[i];
				var depth = currentObject.indentation + 1;
				child["indentation"] = depth; 
				queue.unshift(child);
			}
		}
	}

	// Render footer
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Constants.Mode.INDEX.toString(),
		options: ["(a)dd object", "(m)ove and make child to", "(r)ename", "(d)etach object",  "(D)elete object"]
	}
	$("footer").html(footerTemplate(footerData));
}

IndexController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	if (this.state === State.NORMAL) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_T:
				this.app.changeMode(Constants.Mode.TREE, null);
				break;
			case Constants.KeyEvent.DOM_VK_P:

				break;
			case Constants.KeyEvent.DOM_VK_O:

				break;
		}
	}
}

function addObjectToDOM(object) {
	var div = window.document.createElement("DIV"); 
	div.className = String.interpolate("object indent-%@", object.indentation);
	div.innerHTML = object.name;
	div["__data__"] = object;
	$("#index-container").append(div);
}

module.exports = IndexController;
