var NormalController = require("./js/normal_controller.js");
var HierarchyController = require("./js/hierarchy_controller.js");
var ProcessController = require("./js/process_controller.js");
var ModelController = require("./js/model_controller.js");
var Constants = require("./js/constants.js");
var GUI = require("nw.gui");

var app = null;

$(document).ready(function() {
	app = new App();	
	app.init();
});

var App = function() { };

App.prototype.init = function() {
	this.mode = Constants.Mode.NORMAL;
	this.getMode = function() { return this.mode; };
	this.setMode = function(newMode) { this.mode = newMode; };

	this.normal_controller = new NormalController(this);	
	this.hierarchy_controller = new HierarchyController(this);
	this.process_controller = new ProcessController(this);
	this.model_controller = new ModelController(this);

	document.addEventListener("keyup", this.handleKeyPress.bind(this), false);
	$(".MODE").addClass("NORMAL").text("NORMAL");
}

App.prototype.changeMode = function(mode) {
	$("#status-line .MODE").attr("class", "NORMAL");

	switch(mode) {
		case Constants.Mode.NORMAL:
			$("#status-line .MODE").addClass("NORMAL").text("NORMAL");
			break;
		case Constants.Mode.HIERARCHY:
			$("#status-line .MODE").addClass("HIERARCHY").text("HIERARCHY");
			break;
		case Constants.Mode.PROCESS:
			$("#status-line .MODE").addClass("PROCESS").text("PROCESS");
			break;
		case Constants.Mode.MODEL:
			$("#status-line .MODE").addClass("MODEL").text("MODEL");
			break;
		default:
	}		
}

App.prototype.handleKeyPress = function(e) {

	e = e || window.event;
  var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	//console.log("Character typed: " + String.fromCharCode(charCode));
	console.log("Character code: " + charCode);

	debugger

	// Delegate to controllers depending on current Mode	
	switch(this.getMode()) {
		case Constants.Mode.NORMAL:
			this.normal_controller.handleKeyPress(charCode);	
			break;
		case Constants.Mode.HIERARCHY:
			this.hierarchy_controller.handleKeyPress(charCode);
			break;
		case Constants.Mode.PROCESS:
			this.process_controller.handleKeyPress(charCode);
			break;
		case Constants.Mode.MODEL:
			this.model_controller.handleKeyPress(charCode);
			break;
		default:
	}
}
