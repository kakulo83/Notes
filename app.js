//var ProcessController = require("./js/process_controller.js");
//var ObjectController = require("./js/object_controller.js");

var gui = require("nw.gui");
var win = gui.Window.get();
var fs = require("fs");
var Constants = require("./js/constants.js");

global.$ = $;
global.d3 = d3;
var app = null;

$(document).ready(function() {
	win.showDevTools();
	app = new App();	
	app.init();
});

App = function() { };
App.prototype.init = function() {
	this.getMode = function() { return this.mode; };
	this.setMode = function(newMode) { this.mode = newMode; };

	this.getSubject = function() { return this.subject; };
	this.setSubject = function(newSubject) { this.subject = newSubject; };
	
	this.getProcess = function() { return this.process; };
	this.setProcess = function(newProcess) { this.process = newProcess; };

	this.getObject = function() { return this.object; };
	this.setObject = function(newObject) { this.object= newObject; };


	this.tree_controller    = new TreeController(this);
	this.process_controller = new ProcessController(this);
	this.object_controller  = new ObjectController(this);

	document.addEventListener("keyup", this.handleKeyPress.bind(this), false);
	this.changeMode(Mode.TREE);
}

App.prototype.changeMode = function(mode) {
	this.setMode(mode);
	switch(mode) {
		case Mode.TREE:
			// TODO Render the current subject	
			this.tree_controller.renderView();
			break;
		case Mode.PROCESS:
			this.process_controller.renderView();
			break;
		case Mode.OBJECT:
			this.object_controller.renderView();	
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
		case Mode.TREE:
			this.tree_controller.handleKeyPress(e);
			break;
		case Mode.PROCESS:
			this.process_controller.handleKeyPress(e);
			break;
		case Mode.OBJECT:
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

