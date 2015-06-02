var fs = require("fs");
var Constants = require("./constants.js");
var Utilities = require("./utilities.js");

var State = {
	NORMAL: 0,
	MAIN_MENU: 1
};

var ProcessController = function(app, window) {
	this.app = app;
};

ProcessController.prototype.makeActive = function(selection) {
	this.process = Constants.PATH + this.app.getSubject() + ".notes/processes/" + selection.name + ".process";
	this.state = State.NORMAL;
	this.getProcess();
}

ProcessController.prototype.getProcess = function() {
	d3.html(this.process, this.renderView.bind(this));		
}

ProcessController.prototype.renderView = function(error, process) {

	// Generate Mode Template
	var modeTemplate = Handlebars.templates.process;
	var mainData = {
	};

	$("#mode-container").html(modeTemplate(mainData));

	// Generate Footer Template
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Constants.Mode.PROCESS.toString(),
		options: ["(a)dd process", "(m)ove process", "(d)elete process", "(c)opy process"]
	};
	$("footer").html(footerTemplate(footerData));
}

ProcessController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;

	switch(charCode) {
		case Constants.KeyEvent.DOM_VK_A:
			// Add new process 
			break;
		case Constants.KeyEvent.DOM_VK_C:
			// Copy process 
			break;
		case Constants.KeyEvent.DOM_VK_D:
			// Delete process 
			break;
		case Constants.KeyEvent.DOM_VK_I:
			// Insert process 
			break;
		case Constants.KeyEvent.DOM_VK_J:
			// Move down process
			break;
		case Constants.KeyEvent.DOM_VK_K:
			// Move up process 
			break;
		case Constants.KeyEvent.DOM_VK_M:
			// Open mode specific menu	

			// (Secondary) fold one level 
			break;	
		case Constants.KeyEvent.DOM_VK_O:
			this.app.changeMode(Constants.Mode.OBJECT);
			break;
		case Constants.KeyEvent.DOM_VK_R:
			// Unfold one level
			break;
		case Constants.KeyEvent.DOM_VK_T:
			this.app.changeMode(Constants.Mode.TREE);	
			break;
		case Constants.KeyEvent.DOM_VK_Z:
			// Folding Initiation key
			break;
		case Constants.KeyEvent.DOM_VK_ADD:
			// Zoom in?
			break;
		case Constants.KeyEvent.DOM_VK_SUBTRACT:
			// Zoom out?
			break;
		default:
			
	}
}

module.exports = ProcessController;
