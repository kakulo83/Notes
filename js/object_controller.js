//var = require("./constants.js");

var ObjectController = function(app) { 
	this.app = app;
};

ObjectController.prototype.renderView = function() {

	// Generate Mode Template
	var modeTemplate = Handlebars.templates.object;
	var mainData = {
	};

	$("#mode-container").html(modeTemplate(mainData));

	// Generate Footer Template
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Mode.OBJECT.toString(),
		options: ["(a)dd object", "(m)ove object", "(d)elete object", "(c)opy object"]
	};
	$("footer").html(footerTemplate(footerData));

}

ObjectController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;

	switch(charCode) {
		case KeyEvent.DOM_VK_A:
			// Add new object 
			break;
		case KeyEvent.DOM_VK_C:
			// Copy object 
			break;
		case KeyEvent.DOM_VK_D:
			// Delete object 
			break;
		case KeyEvent.DOM_VK_I:
			// Insert object 
			var vimWindow = window.open("vim.html", "_blank", 'screenX=0,screenY=0,width=800,height=600'); 
			break;
		case KeyEvent.DOM_VK_J:
			// Move down object
			break;
		case KeyEvent.DOM_VK_K:
			// Move up object 
			break;
		case KeyEvent.DOM_VK_M:
			// Open mode specific menu	
			this.app.toggleMenu();	
			
			// (Secondary) fold one level 
			break;	
		case KeyEvent.DOM_VK_P:
			this.app.changeMode(Mode.PROCESS);
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
			console.log(String.interpolate("No handler for %@", charCode));	
	}

}

//module.exports = ObjectController;
