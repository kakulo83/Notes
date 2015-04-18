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

	this.state = State.NORMAL;
	this.contents = [];
	this.currentContent = null;
};

ObjectController.prototype.makeActive = function(selection) {
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
	else if (this.state === State.VIM) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ENTER:
				
				break;
			default:
		}
	}
}

ObjectController.prototype.openVI = function() {
	this.state = State.VIM;

	/* JSVI VIM */ 
	//$(this.currentContent).append("<textarea id='editor'>Vi Editor Test</textarea>");
	//$("#mode-container").append("<textarea id='editor'>Vi Editor Test</textarea>");
	//var editor = vi(this, document.querySelector("#editor"));


	/* EMSCRIPTEN FULL VIM 
	var vimEditor = Handlebars.templates.vim;
	$(this.currentContent).append(vimEditor() );

	var Module = {
		VIMJS_ALLOW_EXIT: true,
		noInitialRun: false,
		//noExitRuntime: true,
		arguments: ['/usr/local/share/vim/example.js'],
		preRun: [ function() { 
			try {
				FS.mkdir('/Users');
				FS.mount(NODEFS, { root: '/Users' }, '/Users');
			} catch(e) { }
			try {
				FS.mkdir('/home');
				FS.mount(NODEFS, { root: '/home' }, '/home');
			} catch(e) { }
			vimjs.pre_run(); 
		} ],
		postRun: [],
	};
	*/

	/* CODE MIRROR & VIM binding */ 
	var codeMirrorTemplate = Handlebars.templates.codemirror;
	$(this.currentContent).append(codeMirrorTemplate());

}

ObjectController.prototype.closeVI = function(text) {
	this.state = State.NORMAL;
}

ObjectController.prototype.appendTextContent = function() {
	hideMenu();	
	this.openVI();
}

ObjectController.prototype.appendImageContent = function() {

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

function hideMenu() {
	$("#mode-menu-container").hide();
}

module.exports = ObjectController;
