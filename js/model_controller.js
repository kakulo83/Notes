var Constants = require("./constants.js");
/*
*		           ---- (model)
*            /
*    (model) ------ (model)
*            \
*              ---- (model)
*/

var ModelController = function(app) { 
	this.app = app;
};

ModelController.prototype.initGui = function() {
	$("#main-pane").attr("class", "");
	$("#main-pane").addClass("MODEL");
	$(".MODE").text("MODEL");	
}

ModelController.prototype.handleKeyPress = function(e) {

		var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
		
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_CANCEL:
	
				break;
			case Constants.KeyEvent.DOM_VK_HELP: 

				break;
			case Constants.KeyEvent.DOM_VK_BACK_SPACE: 

				break;
			case Constants.KeyEvent.DOM_VK_TAB: 

				break;
			case Constants.KeyEvent.DOM_VK_CLEAR:

				break;
			case Constants.KeyEvent.DOM_VK_RETURN:

				break;
			case Constants.KeyEvent.DOM_VK_ENTER:

				break;
			case Constants.KeyEvent.DOM_VK_SHIFT:

				break;
			case Constants.KeyEvent.DOM_VK_CONTROL:

				break;
			case Constants.KeyEvent.DOM_VK_ALT:

				break;
			case Constants.KeyEvent.DOM_VK_PAUSE:

				break;
			case Constants.KeyEvent.DOM_VK_CAPS_LOCK:

				break;
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				// TODO If focus is on vim session (vim acting upon a canvas html canvas), escape serves the usual vim role
				break;
			case Constants.KeyEvent.DOM_VK_SPACE:

				break;
			case Constants.KeyEvent.DOM_VK_PAGE_UP:

				break;
			case Constants.KeyEvent.DOM_VK_PAGE_DOWN:

				break;
			case Constants.KeyEvent.DOM_VK_END:

				break;
			case Constants.KeyEvent.DOM_VK_HOME:

				break;
			case Constants.KeyEvent.DOM_VK_LEFT:

				break;
			case Constants.KeyEvent.DOM_VK_UP:

				break;
			case Constants.KeyEvent.DOM_VK_RIGHT:

				break;
			case Constants.KeyEvent.DOM_VK_DOWN:

				break;
			case Constants.KeyEvent.DOM_VK_PRINTSCREEN:

				break;
			case Constants.KeyEvent.DOM_VK_INSERT:

				break;
			case Constants.KeyEvent.DOM_VK_DELETE:

				break;
			case Constants.KeyEvent.DOM_VK_0:

				break;
			case Constants.KeyEvent.DOM_VK_1:

				break;
			case Constants.KeyEvent.DOM_VK_2:

				break;
			case Constants.KeyEvent.DOM_VK_3:

				break;
			case Constants.KeyEvent.DOM_VK_4:

				break;
			case Constants.KeyEvent.DOM_VK_5:

				break;
			case Constants.KeyEvent.DOM_VK_6:

				break;
			case Constants.KeyEvent.DOM_VK_7:

				break;
			case Constants.KeyEvent.DOM_VK_8:

				break;
			case Constants.KeyEvent.DOM_VK_9:

				break;
			case Constants.KeyEvent.DOM_VK_COLON:

				break;
			case Constants.KeyEvent.DOM_VK_SEMICOLON:

				break;
			case Constants.KeyEvent.DOM_VK_EQUALS:

				break;
			case Constants.KeyEvent.DOM_VK_A:

				break;
			case Constants.KeyEvent.DOM_VK_B:

				break;
			case Constants.KeyEvent.DOM_VK_C:

				break;
			case Constants.KeyEvent.DOM_VK_D:

				break;
			case Constants.KeyEvent.DOM_VK_E:

				break;
			case Constants.KeyEvent.DOM_VK_F:

				break;
			case Constants.KeyEvent.DOM_VK_G:

				break;
			case Constants.KeyEvent.DOM_VK_H:
				this.app.changeMode(Constants.Mode.HIERARCHY);	
				break;
			case Constants.KeyEvent.DOM_VK_I:

				break;
			case Constants.KeyEvent.DOM_VK_J:
				
				break;
			case Constants.KeyEvent.DOM_VK_K:

				break;
			case Constants.KeyEvent.DOM_VK_L:

				break;
			case Constants.KeyEvent.DOM_VK_M:

				break;
			case Constants.KeyEvent.DOM_VK_N:

				break;
			case Constants.KeyEvent.DOM_VK_O:
			
				break;
			case Constants.KeyEvent.DOM_VK_P:
				this.app.changeMode(Constants.Mode.PROCESS);
				break;
			case Constants.KeyEvent.DOM_VK_Q:

				break;
			case Constants.KeyEvent.DOM_VK_R:

				break;
			case Constants.KeyEvent.DOM_VK_S:

				break;
			case Constants.KeyEvent.DOM_VK_T:

				break;
			case Constants.KeyEvent.DOM_VK_U:

				break;
			case Constants.KeyEvent.DOM_VK_V:

				break;
			case Constants.KeyEvent.DOM_VK_W:

				break;
			case Constants.KeyEvent.DOM_VK_X:

				break;
			case Constants.KeyEvent.DOM_VK_Y:

				break;
			case Constants.KeyEvent.DOM_VK_Z:

				break;
			case Constants.KeyEvent.DOM_VK_CONTEXT_MENU:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD0:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD1:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD2:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD3:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD4:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD5:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD6:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD7:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD8:

				break;
			case Constants.KeyEvent.DOM_VK_NUMPAD9:

				break;
			case Constants.KeyEvent.DOM_VK_MULTIPLY:

				break;
			case Constants.KeyEvent.DOM_VK_ADD:

				break;
			case Constants.KeyEvent.DOM_VK_SEPARATOR:

				break;
			case Constants.KeyEvent.DOM_VK_SUBTRACT:

				break;
			case Constants.KeyEvent.DOM_VK_DECIMAL:

				break;
			case Constants.KeyEvent.DOM_VK_DIVIDE:

				break;
			case Constants.KeyEvent.DOM_VK_F1:

				break;
			case Constants.KeyEvent.DOM_VK_F2:

				break;
			case Constants.KeyEvent.DOM_VK_F3:

				break;
			case Constants.KeyEvent.DOM_VK_F4:

				break;
			case Constants.KeyEvent.DOM_VK_F5:

				break;
			case Constants.KeyEvent.DOM_VK_F6:

				break;
			case Constants.KeyEvent.DOM_VK_F7:

				break;
			case Constants.KeyEvent.DOM_VK_F8:

				break;
			case Constants.KeyEvent.DOM_VK_F9:

				break;
			case Constants.KeyEvent.DOM_VK_F10:

				break;
			case Constants.KeyEvent.DOM_VK_F11:

				break;
			case Constants.KeyEvent.DOM_VK_F12:

				break;
			case Constants.KeyEvent.DOM_VK_F13:

				break;
			case Constants.KeyEvent.DOM_VK_F14:

				break;
			case Constants.KeyEvent.DOM_VK_F15:

				break;
			case Constants.KeyEvent.DOM_VK_F16:

				break;
			case Constants.KeyEvent.DOM_VK_F17:

				break;
			case Constants.KeyEvent.DOM_VK_F18:

				break;
			case Constants.KeyEvent.DOM_VK_F19:

				break;
			case Constants.KeyEvent.DOM_VK_F20:

				break;
			case Constants.KeyEvent.DOM_VK_F21:

				break;
			case Constants.KeyEvent.DOM_VK_F22:

				break;
			case Constants.KeyEvent.DOM_VK_F23:

				break;
			case Constants.KeyEvent.DOM_VK_F24:

				break;
			case Constants.KeyEvent.DOM_VK_NUM_LOCK:

				break;
			case Constants.KeyEvent.DOM_VK_SCROLL_LOCK:

				break;
			case Constants.KeyEvent.DOM_VK_COMMA:

				break;
			case Constants.KeyEvent.DOM_VK_PERIOD:

				break;
			case Constants.KeyEvent.DOM_VK_SLASH:

				break;
			case Constants.KeyEvent.DOM_VK_BACK_QUOTE:

				break;
			case Constants.KeyEvent.DOM_VK_OPEN_BRACKET:

				break;
			case Constants.KeyEvent.DOM_VK_BACK_SLASH:

				break;
			case Constants.KeyEvent.DOM_VK_CLOSE_BRACKET:

				break;
			case Constants.KeyEvent.DOM_VK_QUOTE:

				break;
			case Constants.KeyEvent.DOM_VK_META:

				break;
			default:
				// code
		}				

}


module.exports = ModelController;
