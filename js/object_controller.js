var fs = require("fs"); 
var Constants  = require("./constants.js");
var Utilities = require("./utilities.js");

var State = {
	NORMAL: 0,
	MENU: 1,
	IMAGE: 2,
	VIDEO: 3,
	VIM: 4
};

var ObjectController = function(app) { 
	this.app = app;
	$ = window.$;
	Handlebars = window.Handlebars;
	d3 = window.d3;
	_ = window._;
	CodeMirror = window.CodeMirror;

	this.state = State.NORMAL;
	this.contents = [];
	this.currentContent = null;
};

ObjectController.prototype.makeActive = function(selection) {
	// subject is the subject matter, object is the specific topic
	this.subject = selection.subject;
	this.object = selection.object;
	this.getObjectData(selection);
}

ObjectController.prototype.getObjectData = function(selection) {
	var objectPath = String.interpolate("%@%@.notes/%@.object", Constants.PATH, selection.subject, selection.object);
	d3.html(objectPath, this.processData.bind(this));
}

ObjectController.prototype.processData = function(error, object) {
	if (object) {
		this.contents = $(object).children(".content");
		this.setCurrentContent(this.contents[0]);
		this.renderView(object);
	}
	else {
		this.renderView();
	}
}

ObjectController.prototype.renderView = function(content) {
	// Generate Mode Template
	var modeTemplate = Handlebars.templates.object;
	var data = { content: content };

	$("#mode-container").html(modeTemplate());
	if (content) {
		$("#mode-container").append(content);	
	}
	else {
		new_text = window.document.createElement("DIV");
		new_text.className = "text_content content active"	
		$(new_text).append("<p class='editable'>Add text</p>");
		$("#mode-container").append(new_text);			
	}
	// resize textareas
	resizeTextAreas();

	// Generate Footer Template
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Constants.Mode.OBJECT.toString()
	};
	$("footer").html(footerTemplate(footerData));
}

ObjectController.prototype.setCurrentContent = function(content) {
	$(this.currentContent).removeClass("active");
	this.currentContent = content;
	$(content).addClass("active");
}

ObjectController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	if (this.state === State.NORMAL) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_I:
				// Insert object 
				break;
			case Constants.KeyEvent.DOM_VK_J:
				// Move down content
				var currentIndex = $.inArray(this.currentContent, this.contents);
				var nextContent = this.contents[currentIndex+1];
				if (nextContent !== undefined ) 
					this.setCurrentContent(nextContent);
				break;
			case Constants.KeyEvent.DOM_VK_K:
				// Move up content 
				var currentIndex = $.inArray(this.currentContent, this.contents);
				var previousContent = this.contents[currentIndex-1]; 
				if (previousContent !== undefined )
					this.setCurrentContent(previousContent);
				break;
			case Constants.KeyEvent.DOM_VK_M:
				this.state = State.MENU;
				showMenu();	
				break;	
			case Constants.KeyEvent.DOM_VK_P:
				this.app.changeMode(Constants.Mode.PROCESS);
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
				console.log(String.interpolate("No handler for %@", charCode));	
		}
	}
	else if (this.state === State.MENU) {
		//var vimWindow = window.open("vim.html", "_blank", 'screenX=0,screenY=0,width=800,height=600'); 
		//this.state = State.VIM;
		//this.openVI();					

		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_A:
				this.appendTextContent();								
				break;
			case Constants.KeyEvent.DOM_VK_D:

				break;
			case Constants.KeyEvent.DOM_VK_E:
				this.editTextContent();
				break;
			case Constants.KeyEvent.DOM_VK_I:
									
				break;
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;
				hideMenu();	
				break;
			default:
				console.log(String.interpolate("No handler for %@", charCode));
		}
	}
	else if (this.state === State.VIM) { }
}

ObjectController.prototype.openVI = function() {
	this.state = State.VIM;

	/* CODE MIRROR & VIM binding */ 
	// codemirror.js :  Line 5802 is the "save" function
	// vim_keymappings.js:  Line 4468 is the "write" function fo vim
	var textArea = $(this.currentContent).find(".editable")[0];		
	this.vim = CodeMirror.fromTextArea(textArea, {
		autofocus: true,
		lineNumbers: true,
		keyMap: "vim",
		showCursorWhenSelecting: true
	});
	var commandDisplay = $("#command-display");
	var keys = '';
	CodeMirror.on(this.vim, 'vim-keypress', function(key) {
		keys = keys + key;
		commandDisplay.innerHTML = keys;
	});
	CodeMirror.on(this.vim, 'vim-command-done', function(e) {
		keys = '';
		commandDisplay.innerHTML = keys;
	});
	CodeMirror.on(this.vim, 'vim-saving-done', this.closeVI.bind(this));
}

ObjectController.prototype.closeVI = function(e) {

	// get new text
	var newText = this.vim.getValue();
	// get textarea element
	var textarea = this.vim.getTextArea();
	// remove vim textarea and set vim to null
	this.vim.toTextArea();
	this.vim = null;

	// replace textarea with new textarea that has correct height
	var resizedTextArea = window.document.createElement("textarea");
	$(resizedTextArea).attr("class", "editable");
	$(resizedTextArea).attr("disabled", "yes");
	$(resizedTextArea).text(newText);
	$(textarea).replaceWith(resizedTextArea);
	this.state = State.NORMAL;

	resizeTextAreas();

	this.contents = $(".content");
	saveObjectData(this.contents, { "subject": this.subject, "object": this.object });			
}

ObjectController.prototype.editTextContent = function() {
	hideMenu();	
	this.openVI();
}

ObjectController.prototype.appendTextContent = function() {

}

ObjectController.prototype.appendImageContent = function() {

}

function saveObjectData(htmlContent, selection) {
	var filePath = String.interpolate("%@%@.notes/%@.object", Constants.PATH, selection.subject, selection.object);

	// TODO this.contents needs to be wrapped with "<div class="text_content content">", right now it's only the textareas
	var title = $(".title")[0];
	htmlContent = $(htmlContent).toArray()
	htmlContent.unshift(title);	

	var data = "";
	for (var i = 0; i < htmlContent.length; i++) {
		data += htmlContent[i].outerHTML + "\n\n";	
	}
	fs.writeFile(filePath, data, function(err) {
		if (err) throw err;
		// TODO Output to command-prompt that "File saved"	
	});
}

function showMenuPrompt(prompt) {
	$("#mode-menu").css("visibility", "hidden");
	$("#menu-prompt").prop("disabled", false);
	$("#menu-prompt").attr("placeholder", "");
	$("#menu-prompt").focus();
}

function showMenu() {
	var footerTemplate = Handlebars.templates.footer;
	var footerData;
	if ($(".content").length > 0) {	
		footerData = {
			mode: Constants.Mode.OBJECT.toString(),
			options: ["(e)dit", "(a)ppend text", "(i)nsert image", "(d)elete" ]
		};
	} else {
		footerData = {
			node: Constants.Mode.OBJECT.toString(),
			options: ["(i)nsert text", "(a)ppend image"]
		};	
	}

	$("footer").html(footerTemplate(footerData));
	$("#mode-menu-container").show();
	$("#mode-menu").css("visibility", "visible");
}

function resizeTextAreas() {
	// Resize all textareas as needed
	var textareas = $("textarea.editable");
	_.each(textareas, function(textarea) {
		$(textarea).css("height", textarea.scrollHeight);
	});
}

function hideMenu() {
	$("#mode-menu-container").hide();
}

module.exports = ObjectController;
