var gui = require("nw.gui");
var win = gui.Window.get();
var nativeMenuBar = new gui.Menu({ type: "menubar" });

var fs = require("fs");
var util = require("util");

var Constants = require("./js/constants.js");
var TreeController = require("./js/tree_controller.js");
var ObjectController = require("./js/object_controller.js");
//var ProcessController = require("./js/process_controller.js");

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

	this.getMode = function() { return this.mode; };
	this.setMode = function(newMode) { this.mode = newMode; };

	this.getSubject = function() { return this.subject; };
	this.setSubject = function(newSubject) { this.subject = newSubject; };
	
	this.getProcess = function() { return this.process; };
	this.setProcess = function(newProcess) { this.process = newProcess; };

	this.getObject = function() { return this.object; };
	this.setObject = function(newObject) { this.object= newObject; };

	this.tree_controller    = new TreeController(this, subject, window);
	this.object_controller  = new ObjectController(this, window);
	//this.process_controller = new ProcessController(this, window);

	document.addEventListener("keydown", this.handleKeyPress.bind(this), false);
	this.changeMode(Constants.Mode.TREE);
}

App.prototype.changeMode = function(mode, selection) {
	this.setMode(mode);
	switch(mode) {
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
  //var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	//console.log("Character typed: " + String.fromCharCode(charCode));
	//console.log("Character code: " + charCode);

	switch(this.getMode()) {
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
	if ($("#mode-menu-container").is(":visible")) 
		$("#mode-menu-container").hide();
	else
		$("#mode-menu-container").show();
}

