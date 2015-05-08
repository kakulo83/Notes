var fs = require("fs");
var Constants = require("./constants.js");
var Utilities = require("./utilities.js");

var ProcessController = function(app) {
	this.app = app;
};

ProcessController.prototype.renderView = function() {
	// Generate Mode Template
	var modeTemplate = Handlebars.templates.process;
	var mainData = {
	};

	$("#mode-container").html(modeTemplate(mainData));

	// Generate Footer Template
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Mode.PROCESS.toString(),
		options: ["(a)dd process", "(m)ove process", "(d)elete process", "(c)opy process"]
	};
	$("footer").html(footerTemplate(footerData));
}

ProcessController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;

	switch(charCode) {
		case KeyEvent.DOM_VK_A:
			// Add new process 
			break;
		case KeyEvent.DOM_VK_C:
			// Copy process 
			break;
		case KeyEvent.DOM_VK_D:
			// Delete process 
			break;
		case KeyEvent.DOM_VK_I:
			// Insert process 
			break;
		case KeyEvent.DOM_VK_J:
			// Move down process
			break;
		case KeyEvent.DOM_VK_K:
			// Move up process 
			break;
		case KeyEvent.DOM_VK_M:
			// Open mode specific menu	

			// (Secondary) fold one level 
			break;	
		case KeyEvent.DOM_VK_O:
			this.app.changeMode(Mode.OBJECT);
			break;
		case KeyEvent.DOM_VK_R:
			// Unfold one level
			break;
		case KeyEvent.DOM_VK_T:
			this.app.changeMode(Mode.TREE);	
			break;
		case KeyEvent.DOM_VK_Z:
			// Folding Initiation key
			break;
		case KeyEvent.DOM_VK_ADD:
			// Zoom in?
			break;
		case KeyEvent.DOM_VK_SUBTRACT:
			// Zoom out?
			break;
		default:
			this.baseController.handleKeyPress(e);
	}
}

module.exports = ProcessController;
