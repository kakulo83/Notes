var fs        = require("fs"); 
var Constants = require("./constants.js");
var Utilities = require("./utilities.js");
var UI        = require("./ui_constants.js");
var exec      = require('child_process').exec;

var State = {
	NORMAL: 0,
	FOOTER_MENU: 1,
	IMAGE: 2,
	VIDEO: 3,
	VIM: 4,
	VISUAL_SELECT: 5,
	WORD_SELECT: 6,
	LOCAL_MENU: 7,
	FOLDING_CONTENT: 8,
	COMMANDPROMPT: 9,
	QUICKLINK: 10,
	POP_QUICKLINK: 11,
	SEARCH_RESULTS: 12,
	GLOBAL_SEARCH: 13,
	ADD_CONTENT_MENU: 14
};

var ObjectController = {
	init: function(app, window) {
		this.app = app;
		$ = window.$;
		Handlebars = window.Handlebars;
		d3 = window.d3;
		_ = window._;
		CodeMirror = window.CodeMirror;
		MathJax = window.MathJax;

		this.unsavedData = false;
		this.contents = []; 
		this.file = "";
		this.currentContent = null;
		this.linkableObjects = [];
		this.keyStrokeStack = [];
	}
}

ObjectController.makeActive = function(selection) {
	// subject is the subject matter, object is the specific topic
	this.state = State.NORMAL;
	this.file = selection.file;
	this.object = selection;
	this.unsavedData = false;
	this.getData();
}

ObjectController.getData = function() {
	d3.html(this.file, this.renderData.bind(this));
}

ObjectController.renderData = function(error, object) {
	var modeTemplate; 

	if (object) {
		modeTemplate = Handlebars.templates.object;
		$(UI.MODE_CONTAINER).html(modeTemplate());

		this.contents = $(object).children(".content");
		this.setCurrentContent(this.contents[0]);
		$(UI.OBJECT_CONTAINER).append(object);
	}
	else {
		modeTemplate = Handlebars.templates.object_empty;
		$(UI.MODE_CONTAINER).html(modeTemplate({ title: this.object.name }));
		this.contents = [];
		this.contents = this.contents.concat($(".content").toArray());
	}

	// Init drag-and-drop 
	window.ondragover = function(e) { e.preventDefault(); return false };
	window.ondrop = this.onDrop.bind(this);
	var droppableDiv = $(UI.OBJECT_CONTAINER)[0];
	droppableDiv.ondragover = function () { this.className = 'hover'; return false; };
	droppableDiv.ondragleave = function () { this.className = ''; return false; };
	droppableDiv.ondrop = function (e) {
		e.preventDefault();
		return false;
	};

	// render footer 
	var footerTemplate = Handlebars.templates.footer;
	var footerData = { mode: Constants.Mode.OBJECT.toString() };
	$("footer").html(footerTemplate(footerData));

	// render math
	this.renderAllMath();
}

ObjectController.onDrop = function(e) {
	e.preventDefault();
	var file = e.dataTransfer.files[0];

	if (! /image|video/.test(file.type)) return;

	var destination = Constants.PATH + this.app.getSubject() + ".notes/data/" + file.name;
	var mvFileCommand = Utilities.interpolate("mv %@ %@", file.path, destination);
	
	exec(mvFileCommand, function (destination, error, stdout, stderr) {
    if (error !== null) { console.log('exec error: ' + error); }
		this.appendImageObject(destination);
	}.bind(this, destination));
}

ObjectController.onObjectModified = function(mutationRecords) {
	mutationRecords.forEach ( function (mutation) {
		if (mutation.type == "childList") {
			this.unsavedData = true;
		}
	}.bind(this));
}

ObjectController.setCurrentContent = function(content) {
	$(this.currentContent).removeClass("active");
	this.currentContent = content;
	$(content).addClass("active");
}

ObjectController.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;

	if (this.state === State.NORMAL) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_F:
				if (e.metaKey) {
					this.app.showGlobalFindInputField();
					this.state = State.GLOBAL_SEARCH;
				}
				else if (e.shiftKey) {
					showYellowSelector();
					this.state = State.POP_QUICKLINK;
				}
				else {
					showYellowSelector();
					this.state = State.QUICKLINK;
				}
				break;
			case Constants.KeyEvent.DOM_VK_G:
				if (e.shiftKey) {
					var lastContent = this.contents.last()[0];
					var scrollAmount = lastContent.getBoundingClientRect().bottom;
					window.scrollBy(0, scrollAmount);
					this.setCurrentContent(lastContent);
				} else {
					window.scrollTo(0,0);	
					this.setCurrentContent(this.contents[0]);
				}
				break;
			case Constants.KeyEvent.DOM_VK_I:
				this.app.changeMode(Constants.Mode.INDEX, null);
				break;
			case Constants.KeyEvent.DOM_VK_J:
				// Move down content
				this.moveDownContent();
				break;
			case Constants.KeyEvent.DOM_VK_K:
				// Move up content 
				this.moveUpContent();
				break;
			case Constants.KeyEvent.DOM_VK_L:
				// toggle open hidden content
				if ( $(this.currentContent).find(".folded-content").length !== 0) {
					$(this.currentContent).find(".folded-content").remove();
					$(this.currentContent).children().show();

					var next = $.inArray(this.currentContent, this.contents) + 1;
					var currentDepth = Number.parseInt(this.currentContent.dataset.depth);
					for (var i = next; i < this.contents.length; i++) {
						if ( Number.parseInt(this.contents[i].dataset.depth) >= currentDepth )
							$(this.contents[i]).show();
						else
							break;
					}
				}
				break;
			case Constants.KeyEvent.DOM_VK_M:
				this.state = State.FOOTER_MENU;
				this.showFooterMenu();
				break;
			case Constants.KeyEvent.DOM_VK_O:
				this.showObject();									
				break;
			case Constants.KeyEvent.DOM_VK_P:
				this.showProcess();
				break;
			case Constants.KeyEvent.DOM_VK_R:
				// Unfold one level
				break;
			case Constants.KeyEvent.DOM_VK_T:
				if (this.unsavedData) {
					var confirm = window.prompt("To save unsaved content type 'yes'", "");
					if (confirm !== null && confirm.toLowerCase() === "yes") {
						this.save();
						this.app.changeMode(Constants.Mode.TREE);
					} 
					else {
						this.app.changeMode(Constants.Mode.TREE);	
					}
				} else {
					this.app.changeMode(Constants.Mode.TREE);	
				}
				break;
			case Constants.KeyEvent.DOM_VK_V:
				if (! e.shiftKey)	{ return; }
				$(this.currentContent).find(".editable").addClass("highlighted");
				this.state = State.VISUAL_SELECT;
				break;
			case Constants.KeyEvent.DOM_VK_B:	
				// move backward one word within text-content	
				if ( $(this.currentContent).find("span.currentWord").length != 0) {
					var newCurrentWord = $(".currentWord").prev();
					$(".currentWord").removeClass("currentWord");
					$(newCurrentWord).addClass("currentWord");
					this.state = State.WORD_SELECT;
				}
				break;	
			case Constants.KeyEvent.DOM_VK_E:	
				// return if content is NOT of type textObject
				if ( ! /text_content/.test(this.currentContent.className) )
					return;
				// check if there already exists a highlighted word
				if ( $(this.currentContent).find("span.currentWord").length !== 0) {
					var newCurrentWord = $(".currentWord").next();
					$(".currentWord").removeClass("currentWord");
					$(newCurrentWord).addClass("currentWord");
					this.state = State.WORD_SELECT;
				}
				else {
					$(this.currentContent).find(".editable span:first-child").addClass("currentWord");
					this.state = State.WORD_SELECT;
				}
				break;
			case Constants.KeyEvent.DOM_VK_Z:
				// Folding Initiation key
				this.state = State.FOLDING_CONTENT;
				break;
			case Constants.KeyEvent.DOM_VK_PERIOD:
				if (! e.shiftKey)
					return;
				this.increaseFoldDpeth(this.currentContent);
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_COMMA:
				if (! e.shiftKey)
					return;
				this.decreaseFoldDepth(this.currentContent);
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_COLON:
				this.state = State.COMMANDPROMPT;
				e.preventDefault();
				showCommandPrompt();
				break;
			default:
		}
	}
	else if (this.state === State.GLOBAL_SEARCH) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_RETURN:
				this.app.performGlobalFind();	
				this.state = State.SEARCH_RESULTS;
				this.app.closeFind();
				break;	
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				this.app.closeFind();	
				this.state = State.NORMAL;
				break;
		}
	}
	else if (this.state === State.COMMANDPROMPT) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				hideCommandPrompt();
				this.state = State.NORMAL;
				break;	
			case Constants.KeyEvent.DOM_VK_RETURN:
				this.processCommandPrompt();
				// current state is set in processCommandPrompt function
				hideCommandPrompt();
				break;
			default:
		}
	}
	else if (this.state === State.FOOTER_MENU) {
		//var vimWindow = window.open("vim.html", "_blank", 'screenX=0,screenY=0,width=800,height=600'); 
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_A:
				this.state = State.ADD_CONTENT_MENU;
				this.showAddContentSubMenu();
				break;
			case Constants.KeyEvent.DOM_VK_D:
				this.deleteContent();
				break;
			case Constants.KeyEvent.DOM_VK_E:
				this.editTextObject();
				hideMenu();	
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				// process input from command prompt
				break;
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;
				hideMenu();	
				break;
			default:
		}
	}
	else if (this.state === State.VIM) { 
		// no handlers because we want the event to bubble up to the handlers in the codeMirror js
	}
	else if (this.state === State.IMAGE) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				hideCommandPrompt();
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				var uri = $("#command-prompt").val();
				this.appendImageObject(uri);
				break;
		}
	}
	else if (this.state === State.VIDEO) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				hideCommandPrompt();
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				var uri = $("#command-prompt").val();
				this.appendVideoObject(uri);
				this.state = State.NORMAL;
				break;
		}
	}
	else if (this.state === State.VISUAL_SELECT) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				hideLocalMenu(this.currentContent);			
				$(this.currentContent).find(".editable").removeClass("highlighted");
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_M:
				this.showVisualSelectMenu();
				break;
			case Constants.KeyEvent.DOM_VK_N:
				nextMenuItem();
				break;
			case Constants.KeyEvent.DOM_VK_P:
				previousMenuItem();
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				// Determine which action has been selected and execute it
				var activeMenuItem = $(".local-menu-item.active");
				this.state = State.NORMAL;	
				this.processVisualSelection(activeMenuItem);	
				break;
		}
	}
	else if (this.state === State.WORD_SELECT) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_A:
				// create an in-page linkable anchor
				if (e.shiftKey)
					this.makeAnchor();
				break;
			case Constants.KeyEvent.DOM_VK_L:
				// create a link to another linkable anchor
				if (e.shiftKey)
					this.showLinkOptions();
				break;
			case Constants.KeyEvent.DOM_VK_N:
				nextMenuItem();
				break;
			case Constants.KeyEvent.DOM_VK_P:
				previousMenuItem();
				break;
			case Constants.KeyEvent.DOM_VK_B:	
				// move backward one word within text-content	
				if ( $(this.currentContent).find("span.currentWord").length != 0) {
					var newCurrentWord = $(".currentWord").prev();
					$(".currentWord").removeClass("currentWord");
					$(newCurrentWord).addClass("currentWord");
				}
				break;	
			case Constants.KeyEvent.DOM_VK_E:	
				// if it is, check if it contains a currentWord <span>
				if ( $(this.currentContent).find("span.currentWord").length !== 0) {
					var newCurrentWord = $(".currentWord").next();
					$(".currentWord").removeClass("currentWord");
					$(newCurrentWord).addClass("currentWord");
				} 
				break;
			case Constants.KeyEvent.DOM_VK_J:
				this.state = State.NORMAL;
				this.moveDownContent();
				break;
			case Constants.KeyEvent.DOM_VK_K:
				this.state = State.NORMAL;
				this.moveUpContent();
				break;
			case Constants.KeyEvent.DOM_VK_M:
				this.showCurrentWordMenu();
				break;
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				if ($(this.currentContent).find(".local-menu-container").length !== 0) {
					hideLocalMenu(this.currentContent);			
				}
				else if ($(this.currentContent).find("span.currentWord").length !== 0) {
					$(".currentWord").removeClass("currentWord");
					$(this.currentContent).find(".editable").removeClass("highlighted");
					this.state = State.NORMAL;
				}
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				// handle selected item
				var selectedOption = $(".local-menu-item.active");
				if ( (/link-option/).test(selectedOption[0].className) ) {
					hideLocalMenu(this.currentContent);
					this.createLink(selectedOption);
					this.state = State.NORMAL;
				}
				break;
		}
	}
	else if (this.state === State.FOLDING_CONTENT) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_C:
				// close all content from current content depth and any subsequent that are deeper
				// until next content AT same depth as current content or lesser depth				

				// hide all nested content
				var currentDepth = Number.parseInt(this.currentContent.dataset.depth);
				$(this.currentContent).children().hide();
				$(this.currentContent).prepend("<div class='folded-content'>+</div>");	

				// Fold all content from curentContnet, any deeper, any the same level, up until
				// content at a lower depth number is encountered
				var start = $.inArray(this.currentContent, this.contents) + 1;
				for (var i = start; i < this.contents.length; i++) {
					var nextObject = this.contents[i];
					var nextDepth = Number.parseInt(nextObject.dataset.depth);
					if (nextDepth < currentDepth)
						break;	
					$(nextObject).hide();
				}
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_O:
	  		$(this.currentContent).find(".folded-content").remove();
				$(this.currentContent).children().show();

				var next = $.inArray(this.currentContent, this.contents) + 1;
				var currentDepth = Number.parseInt(this.currentContent.dataset.depth);
				for (var i = next; i < this.contents.length; i++) {
					if ( Number.parseInt(this.contents[i].dataset.depth) >= currentDepth )
						$(this.contents[i]).show();
					else
						break;
				}
				this.state = State.NORMAL;
			case Constants.KeyEvent.DOM_VK_M:
				if (e.shiftKey) {
					this.foldAllObject();
				}
				else {

				}
				this.state = State.NORMAL;
				break;			
			case Constants.KeyEvent.DOM_VK_R:
				if (e.shiftKey) {
					this.unfoldAllObject();
				}
				else {

				}
				this.state = State.NORMAL;
				break;
		}
	}
	else if (this.state === State.QUICKLINK) {
		if (charCode === Constants.KeyEvent.DOM_VK_ESCAPE) {
			this.state = State.NORMAL;
			this.keyStrokeStack = [];
			removeYellowSelector();
		}
		else if (_.contains([ Constants.KeyEvent.DOM_VK_A, Constants.KeyEvent.DOM_VK_C, Constants.KeyEvent.DOM_VK_D, Constants.KeyEvent.DOM_VK_E, Constants.KeyEvent.DOM_VK_F, Constants.KeyEvent.DOM_VK_G, Constants.KeyEvent.DOM_VK_H, Constants.KeyEvent.DOM_VK_J, Constants.KeyEvent.DOM_VK_K, Constants.KeyEvent.DOM_VK_L, Constants.KeyEvent.DOM_VK_M, Constants.KeyEvent.DOM_VK_P, Constants.KeyEvent.DOM_VK_S, Constants.KeyEvent.DOM_VK_W ], charCode)) {
			var newChar = String.fromCharCode(charCode);
			this.keyStrokeStack.push(newChar);
			// Attempt to select node	
			var linkLetters = this.keyStrokeStack.join("").toLowerCase();
			var query = Utilities.interpolate(".quicklink.%@", linkLetters);
			var quicklink = $(query);
			if ($(quicklink).length) {
				var objectName = $(quicklink).siblings(".object-link").text();
				var objectFile = $(quicklink).siblings(".object-link").attr("href");
				this.openLink({"name": objectName, "file": objectFile });
				this.state = State.NORMAL;
			}
		}
	}
	else if (this.state === State.POP_QUICKLINK) {
		if (charCode === Constants.KeyEvent.DOM_VK_ESCAPE) {
			this.state = State.NORMAL;
			this.keyStrokeStack = [];
			removeYellowSelector();
		}
		else if (_.contains([ Constants.KeyEvent.DOM_VK_A, Constants.KeyEvent.DOM_VK_C, Constants.KeyEvent.DOM_VK_D, Constants.KeyEvent.DOM_VK_E, Constants.KeyEvent.DOM_VK_F, Constants.KeyEvent.DOM_VK_G, Constants.KeyEvent.DOM_VK_H, Constants.KeyEvent.DOM_VK_J, Constants.KeyEvent.DOM_VK_K, Constants.KeyEvent.DOM_VK_L, Constants.KeyEvent.DOM_VK_M, Constants.KeyEvent.DOM_VK_P, Constants.KeyEvent.DOM_VK_S, Constants.KeyEvent.DOM_VK_W ], charCode)) {
			var newChar = String.fromCharCode(charCode);
			this.keyStrokeStack.push(newChar);
			// Attempt to select node	
			var linkLetters = this.keyStrokeStack.join("").toLowerCase();
			var query = Utilities.interpolate(".quicklink.%@", linkLetters);
			var quicklink = $(query);
			if ($(quicklink).length) {
				var objectName = $(quicklink).siblings(".object-link").attr("href");
				var new_win = window.gui.Window.open("file:///Users/robertcarter/Downloads/dogsVscats.jpg?object=derp");
			}
		}
	}
	else if (this.state === State.SEARCH_RESULTS) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;	
				$(".searchresults").remove();		
				break;
			case Constants.KeyEvent.DOM_VK_J:
				this.app.moveDownSearchResult();			
				break;
			case Constants.KeyEvent.DOM_VK_K:
				this.app.moveUpSearchResult();		
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				this.app.openSearchMatch();
				break;
		}
	}
	else if (this.state === State.ADD_CONTENT_MENU) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				hideMenu();
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_T:
				this.appendTextObject();
				hideMenu();
				break;
			case Constants.KeyEvent.DOM_VK_I:
				e.preventDefault();
				hideMenu();
				showCommandPrompt("Enter Image file/url");
				this.state = State.IMAGE;
				break;
			case Constants.KeyEvent.DOM_VK_S:
				hideMenu();
				$.when(this.app.screenCapture(this.object.name)).then(function(screenPath) {
					var newObjectDiv = window.document.createElement("DIV");
					newObjectDiv.className = "image_content content";	
					newObjectDiv.setAttribute("data-depth", 0);
					var image = window.document.createElement("IMG");
					image.src = screenPath;
					newObjectDiv.appendChild(image);		
					$(this.currentContent).after(newObjectDiv);
					this.contents.push(newObjectDiv);
					this.setCurrentContent(newObjectDiv);
					this.state = State.NORMAL;
				}.bind(this));
				break;
			case Constants.KeyEvent.DOM_VK_V:
				e.preventDefault();
				hideMenu();
				showCommandPrompt("Enter Video file/url");	
				this.state = State.VIDEO;
				break;
		}
	}
}

ObjectController.showAddContentSubMenu = function() {
	var subMenu = Handlebars.templates.add_content_menu;
	var options = { options: ["(t)ext", "(i)mage", "(s)creenshot", "(v)ideo" ] };
	$("#mode-menu-container").html(subMenu(options));
}

ObjectController.processCommandPrompt = function() {
	var commandArray = $("#command-prompt").val().split(" ");
	var option = commandArray[0].toLowerCase();
	var argument = commandArray[1] || "";

	switch(option) {
		case "w":
			this.save();
			this.state = State.NORMAL;
			hideCommandPrompt();			
			break;
		case "f":
			var performSearch = this.app.localFind(argument);
			performSearch.done(function(haveResults) {
				if (haveResults)
					this.state = State.SEARCH_RESULTS;
				else
					this.state = State.NORMAL;
			}.bind(this));
			break;
		default:
	}
}

//ObjectController.showObject = function() { }

ObjectController.showProcess = function() {
	var fileComponents = this.file.split(/\//);

	var dirIndex = _.indexOf(fileComponents, "objects");
	fileComponents[dirIndex] = "processes";

	var processName = _.last(fileComponents).split(".")[0] + ".process";
	fileComponents[fileComponents.length - 1] = processName;

	var processFile = fileComponents.join("/");

	var selection = { "name": this.object.name, "file": processFile };
	this.app.changeMode(Constants.Mode.PROCESS, selection);
}

ObjectController.showFooterMenu = function() {
	var footerTemplate = Handlebars.templates.footer;
	var footerData;

	if ($(".content").length > 0) {	
		footerData = {
			mode: Constants.Mode.OBJECT.toString(),
			options: ["(e)dit", "(a)dd content", "(d)elete" ] 
		};
	} else {
		footerData = {
			node: Constants.Mode.OBJECT.toString(),
			options: ["(a)dd content"]
		};	
	}

	$("footer").html(footerTemplate(footerData));
	$("#mode-menu-container").show();
	$("#mode-menu").css("visibility", "visible");
}

ObjectController.showVisualSelectMenu = function() {
	var localMenuDiv = window.document.createElement("DIV");
	localMenuDiv.className = "local-menu-container";
	var localMenu = window.Handlebars.helpers.localMenu(["Increase font", "Decrease font", "Make Bold", "Interpret as LaTeX", "Interpret as Code", "Undo", "Change me in showVisualSelectionMenu function"]);
	$(localMenuDiv).append(localMenu);
	$(this.currentContent).prepend(localMenuDiv);
}

ObjectController.showCodeLanguageMenu = function() {
	var localMenuDiv = window.document.createElement("DIV");
	localMenuDiv.className = "local-menu-container";
	var localMenu = window.Handlebars.helpers.localMenu(["Javascript", "Ruby", "Scheme", "Html", "CSS", "Bash", "C++", "C", "Objective-C", "Lisp", "Java" ]);
	$(localMenuDiv).append(localMenu);
	$(this.currentContent).prepend(localMenuDiv);
}

ObjectController.showCurrentWordMenu = function() {
	var currentWord = $(".currentWord")[0];
	var localMenuDiv = window.document.createElement("DIV");
	localMenuDiv.className = "local-menu-container link-targets";
	var localMenu = window.Handlebars.helpers.localMenu(["Modify me in showCurrentWordMenu function"], "");
	$(localMenuDiv).append(localMenu);
	$(currentWord).append(localMenuDiv);
}

ObjectController.openVI = function() {
	this.state = State.VIM;

	/* CODE MIRROR & VIM binding */ 
	// codemirror.js :  Line 5802 is the "save" function
	// vim_keymappings.js:  Line 4474 is the "write" function fo vim
	
	// Grab editable html, replace with a temporary textarea
	var editable = $(this.currentContent).find(".editable")[0];

	if ( $(".active .editable").hasClass("math") ) {
		var tempTextArea = window.document.createElement("TEXTAREA");
		tempTextArea.className = editable.className; 

		// grab TeX markup
		if ($(".active .math script").length !== 0)
			var TeXMarkup = "\\(" + $(".active .math script").html() + "\\)";
		else
			var TeXMarkup = $(".active .math").html();
	
		tempTextArea.innerHTML = TeXMarkup;
		$(editable).replaceWith(tempTextArea);

		// Initialize VIM
		this.vim = CodeMirror.fromTextArea(tempTextArea, {
			autofocus: true,
			lineNumbers: true,
			keyMap: "vim",
			showCursorWhenSelecting: true
		});

		CodeMirror.on(this.vim, 'vim-saving-done', this.closeVI.bind(this));
		CodeMirror.on(this.vim, 'vim-quitting-done', this.closeVI.bind(this));
	}
	else {
		var tempTextArea = window.document.createElement("TEXTAREA");
		tempTextArea.className = editable.className; 

		var links = $(editable).find(".object-link");
		var style = $(".active .editable").attr("style");

		tempTextArea.innerHTML = editable.textContent;
		$(editable).replaceWith(tempTextArea);

		// Initialize VIM
		this.vim = CodeMirror.fromTextArea(tempTextArea, {
			autofocus: true,
			lineNumbers: true,
			keyMap: "vim",
			showCursorWhenSelecting: true
		});

		// Save any links onto the this.vim object for re-insertion upon closeVI()
		this.vim["links"] = links;
		this.vim["style"] = style;

		CodeMirror.on(this.vim, 'vim-saving-done', this.closeVI.bind(this));
	}
}

ObjectController.closeVI = function(e) {
	// get new text
	var newText = this.vim.getValue();

	// split the text by white space then iterate through each component.  match the component
	// against a WORD regex expression.  If a word is present, surround it with a <span> tag.
	// If an exclamation mark is found that belongs to the word retain it, if it does not such as
	// a word ending with a period ex: "ending." then surround the word but leave out the 
	// punctuation mark.  Collect as html all these <span> surrounded words and punctuations, 
	// flatten them, and replace <p> tag's innerHTML with this flattened html.

	// TODO Patch for the caase in which the text is TeX content, <span> tags shouldn't be applied
	// 			to math equations

	// Break text into word components for non math content

	if ( /math/.test(this.vim.getTextArea().className) ) {
		var updatedObject = window.document.createElement("P");	
		var classNames = this.vim.getTextArea().className;
		updatedObject.className = classNames;
		$(updatedObject).append(newText);
		$(this.currentContent).html(updatedObject);
		try {
			this.app.renderMath(updatedObject);
		}
		catch (error) {
			$(updatedObject).append(newText);
			$(this.currentContent).html(updatedObject);
		}
	}
	else {
		var wordComponents = newText.split(/\b/);

		// Iterate through each component and if it is a word wrap it with a <span> tag	
		var spanWrappedWords = _.map(wordComponents, function(component) {
															if ( ! (/\b/).test(component))
																return component;
															var wrappedWord = window.document.createElement("SPAN");
															//wrappedWord.className = "word";
															wrappedWord.innerHTML = component;		
															return wrappedWord;
														},this);

		// Create new paragraph tag with span wrapped words
		var updatedObject = window.document.createElement("PRE");
		var classNames = this.vim.getTextArea().className;
		updatedObject.className = classNames;
		$(updatedObject).append(spanWrappedWords);
		$(this.currentContent).html(updatedObject);

		$(".active .editable").attr("style", this.vim.style);

		// reinsert links if their words are still in the updated text content
		var links = this.vim.links;
		_.each(links, function(link) {
			var linkQuery = Utilities.interpolate(".word:contains('%@'):first", link.innerHTML);
			$(this.currentContent).find(linkQuery).html(link);
		},this);
	}
	
	// remove vim editor
	this.vim = null;
	
	// save changes
	this.save();
	this.state = State.NORMAL;
}

ObjectController.editTextObject = function() {
	// using codemirror
	this.openVI();
}

ObjectController.appendTextObject = function() {
	var newObjectDiv = window.document.createElement("DIV");
	newObjectDiv.className = "text_content content";
	newObjectDiv.setAttribute("data-depth", 0);

	var newObjectParagraph = window.document.createElement("P");	
	newObjectParagraph.className = "editable";
	newObjectParagraph.innerHTML = "";
	newObjectDiv.appendChild(newObjectParagraph);

	$(this.currentContent).after(newObjectDiv);

	// GET INDEX OF CURRENTCONTENT (we might be appending content in the middle of the page) SPLICE NEW CONTENT
	var indexCurrent = $.inArray(this.currentContent, this.contents);
	if (indexCurrent < this.contents.length - 1)
		this.contents.splice(indexCurrent+1, 0, newObjectDiv);	
	else 
		this.contents.push(newObjectDiv);

	this.setCurrentContent(newObjectDiv);

	// Open vi
	this.openVI();
}

ObjectController.appendImageObject = function(uri) {
	hideCommandPrompt();	
	var newObjectDiv = window.document.createElement("DIV");
	newObjectDiv.className = "image_content content";	
	newObjectDiv.setAttribute("data-depth", 0);
	var image = window.document.createElement("IMG");
	image.src = uri;
	newObjectDiv.appendChild(image);		
	$(this.currentContent).after(newObjectDiv);

	// GET INDEX OF CURRENTCONTENT (we might be appending content in the middle of the page) SPLICE NEW CONTENT
	var indexCurrent = $.inArray(this.currentContent, this.contents);
	if (indexCurrent < this.contents.length - 1)
		this.contents.splice(indexCurrent+1, 0, newObjectDiv);	
	else 
		this.contents.push(newObjectDiv);

	this.setCurrentContent(newObjectDiv);
	this.state = State.NORMAL;
}

ObjectController.appendVideoObject = function(uri) {
	hideCommandPrompt();
	var newObjectDiv = window.document.createElement("DIV");
	newObjectDiv.className = "video_content content";	
	newObjectDiv.setAttribute("data-depth", 0);

	var video = window.document.createElement("VIDEO");
	video.src = uri;
	video.controls = true;

	newObjectDiv.appendChild(video);		

	$(this.currentContent).after(newObjectDiv);
	this.contents.push(newObjectDiv);
	this.setCurrentContent(newObjectDiv);
}

ObjectController.appendMathObject = function() {
	var newObjectDiv = window.document.createElement("DIV");
	newObjectDiv.className = "text_content content";
	
	var newObjectParagraph = window.document.createElement("P");
	newObjectParagraph.className = "editable math";
	newObjectParagraph.innerHTML = "Add TEX here";
	newObjectDiv.appendChild(newObjectParagraph);

	$(this.currentContent).after(newObjectDiv);

	// GET INDEX OF CURRENTCONTENT (we might be appending content in the middle of the page) SPLICE NEW CONTENT
	var indexCurrent = $.inArray(this.currentContent, this.contents);
	if (indexCurrent < this.contents.length - 1)
		this.contents.splice(indexCurrent+1, 0, newObjectDiv);	
	else 
		this.contents.push(newObjectDiv);

	this.setCurrentContent(newObjectDiv);

	// Open vi
	this.openVI();
}

ObjectController.deleteContent = function() {
	hideMenu();
	var confirm = window.prompt("To delete this content, type 'yes'", "");
	if (confirm.toLowerCase() === "yes") {
		$(this.currentContent).remove();
		var index = $.inArray(this.currentContent, this.contents);
		this.contents.splice(index, 1);
		this.setCurrentContent(this.contents[0]);
		this.state = State.NORMAL;
	}
}

ObjectController.openSearchMatch = function() {
	var filepath = $(".search-match.active .filepath").text();
	var fileExtension = /[^.]+$/.exec(filepath)[0];
	var fileName = filepath.replace(/^.*[\\\/]/, '');

	switch (fileExtension) {
		case Constants.FILETYPE.OBJECT:
			var selection = { "name": fileName, "file": filepath };
			this.makeActive(selection);
			break;
		case Constants.FILETYPE.PROCESS:

			break;	
	}
}

ObjectController.moveDownContent = function() {
	var index = $.inArray(this.currentContent, this.contents) + 1;
	var nextObject = this.contents[index];

	// remove current word
	$(".active .currentWord").removeClass("currentWord");

	if (nextObject !== undefined) {
		if ( $(nextObject).is(":visible") ) {
			this.setCurrentContent(nextObject);
			scrollDown(this.currentContent);	
		} else {
			// nextObject is NOT visible, therefore keep advancing until visible content is found	
			index = index + 1;
			for (var i = index; i < this.contents.length; i++) {
				if ($(this.contents[i]).is(":visible") ) {
					this.setCurrentContent(this.contents[i]);
					scrollDown(this.currentContent);
					break;
				}
			}
		}
	} 
  else {
		window.scrollBy(0, 400);
		var currentContentBottom = this.currentContent.getBoundingClientRect().bottom;
		if (currentContentBottom > window.innerHeight / 2)
			scrollPastContent();	
	}
}

ObjectController.moveUpContent = function() {
	var index = $.inArray(this.currentContent, this.contents) - 1;
	var previousObject = this.contents[index]; 

	// remove current word
	$(".active .currentWord").removeClass("currentWord");

	if (previousObject !== undefined ) {
		if ( $(previousObject).is(":visible") ) {
			this.setCurrentContent(previousObject);
			scrollUp(this.currentContent);
		} else {
			// previousObject is NOT visible	
			index = index - 1;
			for (var i = index; i >= 0; i--) {
				if ($(this.contents[i]).is(":visible") ) {
					this.setCurrentContent(this.contents[i]);
					scrollUp(this.currentContent);
					break;
				}
			}
		}	
	}
}

ObjectController.save = function() {
	var data = "";	
	
	_.each(this.contents, function(content) {
		if ( $(content).find(".editable").hasClass("math") ) {
			var TeX = "\\(" + $(content).find(".math script").html() + "\\)";
			var editable = $(content).find(".editable").clone();
			$(editable).html(TeX);

			var preRenderedObject = $(content).clone();
			$(preRenderedObject).find(".editable").replaceWith(editable);
			data = data + preRenderedObject[0].outerHTML + "\n";	
		} else
			data = data + content.outerHTML + "\n";	
	},this);
	data = data.replace(/active/, "");

	fs.writeFile(this.file, data, function(err) {
		if (err) throw err;
		console.log('It\'s saved!');
	});
	this.unsavedData = false;

	this.app.addToElasticSearch({ file: this.file, html: data });	
}

ObjectController.makeAnchor = function() {

}

ObjectController.showLinkOptions = function() {
	if (this.linkableObjects.length == 0)	{
		var getLinkableObjectPromise = this.getLinkableObjects();
		getLinkableObjectPromise.done(function(result) {
			this.linkableObjects = result;
			var currentWord = $(".currentWord")[0];
			var localMenuDiv = window.document.createElement("DIV");
			localMenuDiv.className = "local-menu-container link-targets";
			var localMenu = window.Handlebars.helpers.linkOptions(this.linkableObjects, "link-option");
			$(localMenuDiv).append(localMenu);
			$(currentWord).append(localMenuDiv);
		}.bind(this));
	}
	else {
		var currentWord = $(".currentWord")[0];
		var localMenuDiv = window.document.createElement("DIV");
		localMenuDiv.className = "local-menu-container link-targets";
		var localMenu = window.Handlebars.helpers.linkOptions(this.linkableObjects, "link-option");
		$(localMenuDiv).append(localMenu);
		$(currentWord).append(localMenuDiv);
	}
}

ObjectController.createLink = function(selectedOption) {
	var target = selectedOption[0].dataset.file;
	var targetText = $("span.currentWord").html();
	var link   = Utilities.interpolate("<a href='%@' class='object-link'>%@</a>", target, targetText);
	$("span.currentWord").html(link);
}

ObjectController.getLinkableObjects = function() {
	var deferred = new $.Deferred();
	var objectTreePath = Utilities.interpolate("%@%@.notes/%@.tree", Constants.PATH, this.app.subject, this.app.subject);
	d3.json(objectTreePath, function(error, nodes) {
		var linkableObjects = _.map(Utilities.flattenTree(nodes), function(object) {
														return { "name": object.name, "file": object.file };	
													});
		deferred.resolve(linkableObjects);
	}.bind(this));
	return deferred.promise();
}

ObjectController.openLink = function(selectedObject) {
	this.keyStrokeStack = [];	
	this.makeActive(selectedObject);
}

ObjectController.popLink = function() {

}

ObjectController.foldAllObject = function() {
	var depth1Object = $(".content[data-depth=1]").toArray();
	_.each(depth1Object, function(content) {
		var currentDepth = 1;
		$(content).children().hide();
		$(content).prepend("<div class='folded-content'>+</div>");	

		// Fold all content from curentContnet, any deeper, any the same level, up until
		// content at a lower depth number is encountered
		var start = $.inArray(content, this.contents) + 1;
		for (var i = start; i < this.contents.length; i++) {
			var nextObject = this.contents[i];
			var nextDepth = Number.parseInt(nextObject.dataset.depth);
			if (nextDepth < currentDepth)
				break;	
			$(nextObject).hide();
		}
	},this);
}

ObjectController.unfoldAllObject = function() {
	var depth1Object = $(".content[data-depth=1]").toArray();
	_.each(depth1Object, function(content) {
		$(content).find(".folded-content").remove();
		$(content).children().show();

		var next = $.inArray(content, this.contents) + 1;
		var currentDepth = 1;
		for (var i = next; i < this.contents.length; i++) {
			if ( Number.parseInt(this.contents[i].dataset.depth) >= currentDepth )
				$(this.contents[i]).show();
			else
				break;
		}
	},this);
}

ObjectController.renderAllMath = function() {
	this.app.renderMath();
}

ObjectController.processVisualSelection = function(selection) {
	// triage based on which selection
	var id = $(".local-menu-item.active").data("id");
	var text = $(".content.active .editable");

	hideLocalMenu(this.currentContent);			
	$(this.currentContent).find(".editable").removeClass("highlighted");
	
	switch(id) {
		case "increase_font":
			var newSize = parseInt($(text).css("font-size").replace("px","")) + 5;
			$(text).css("font-size", newSize.toString() + "px");
			break;
		case "decrease_font":
			var newSize = parseInt($(text).css("font-size").replace("px","")) - 5;
			$(text).css("font-size", newSize.toString() + "px");
			break;
		case "make_bold":
			$(text).css("font-weight", "bold");
			break;
		case "interpret_as_latex":
			var latex = $(text).text();
			var style = $(".content.active .editable").attr("style"); 
			var ptag = window.document.createElement("P");
			$(ptag).attr("style", style);
			$(ptag).addClass("editable math");
			$(ptag).text(latex);
			$(text).replaceWith(ptag);
			this.app.renderMath();
			break;
		case "interpret_as_code":
			this.showCodeLanguageMenu();
			this.state = State.VISUAL_SELECT;	
			break;
		case "javascript":
			var code = $(text).text();			
			$(text).html("");
			var codetag = window.document.createElement("CODE");
			$(codetag).addClass("javascript hljs");
			$(codetag).text(code);
			$(text).append(codetag);
			$("pre code").each(function(i, block) {
				window.hljs.highlightBlock(block);
			});
			break;
		case "ruby":
			this.wrapTextInCodeTag(text, "ruby");			
			break;
		case "scheme":
			this.wrapTextInCodeTag(text, "scheme");
			break;
		case "html":
			this.wrapTextInCodeTag(text, "html");			
			break;
		case "css":
			this.wrapTextInCodeTag(text, "css");			
			break;
		case "c++":
			this.wrapTextInCodeTag(text, "c++");			
			break;
		case "c":
			this.wrapTextInCodeTag(text, "c");			
			break;
		case "objective-c":
			this.wrapTextInCodeTag(text, "objective-c");			
			break;
		case "lisp":
			this.wrapTextInCodeTag(text, "lisp");			
			break;
		case "java":
			this.wrapTextInCodeTag(text, "java");			
			break;
		case "bash":
			this.wrapTextInCodeTag(text, "bash");
			break;
		case "undo":
			// TODO Add code and LaTeX undo action
			$(text).css("font-size", "inherit");
			$(text).css("font-weight", "normal");
			break;
	}	
}

ObjectController.wrapTextInCodeTag = function(text, language) {
	var code = $(text).text();			
	$(text).html("");

	var codetag = window.document.createElement("CODE");
	$(codetag).addClass(Utilities.interpolate("%@ hljs", language));
	$(codetag).text(code);
	$(text).append(codetag);
	$("pre code").each(function(i, block) {
		window.hljs.highlightBlock(block);
	});
}

ObjectController.increaseFoldDpeth = function(currentContent) {
	var depth = Number.parseInt(currentContent.getAttribute("data-depth"));
	if (depth) {
		if (depth + 1 < 7)
			depth = depth + 1;	
		currentContent.setAttribute("data-depth", depth);
	} else {
		currentContent.setAttribute("data-depth", 1);
	}
}

ObjectController.decreaseFoldDepth = function(currentContent) {
	var depth = Number.parseInt(currentContent.getAttribute("data-depth"));
	if (depth) {
		if (depth - 1 >= 0) 
			depth = depth - 1;
		currentContent.setAttribute("data-depth", depth);		
	}
}

function nextMenuItem() {
	var activeMenuItem = $(".local-menu-item.active");
	var allLocalMenuItems = $(".local-menu-item").toArray();
	var index = $.inArray(activeMenuItem[0], allLocalMenuItems);

	if (index+1 < allLocalMenuItems.length) {
		$(activeMenuItem).removeClass("active");		
		$(allLocalMenuItems[index+1]).addClass("active");
	}
}

function previousMenuItem() {
	var activeMenuItem = $(".local-menu-item.active");
	var allLocalMenuItems = $(".local-menu-item").toArray();
	var index = $.inArray(activeMenuItem[0], allLocalMenuItems);
					
	if (index -1 >= 0) {	
		$(activeMenuItem).removeClass("active");
		$(allLocalMenuItems[index-1]).addClass("active");
	}
}

function scrollDown(nextObject) {
	var boundingRect = nextObject.getBoundingClientRect();

  // (content is completely hidden)
	if (boundingRect.top >= Constants.MODE_CONTAINER_HEIGHT) {
		// move top to just below visible	and then add the height of the content
		var delta = boundingRect.top - Constants.MODE_CONTAINER_HEIGHT + boundingRect.height;
		window.scrollBy(0, delta);
	} // (content is partly hidden)
	else if (boundingRect.top + boundingRect.height >= Constants.MODE_CONTAINER_HEIGHT) {
		// how much content is hidden?
		var delta = boundingRect.bottom - Constants.MODE_CONTAINER_HEIGHT
		window.scrollBy(0, delta);
	}
}

function scrollUp(previousObject) {
	var boundingRect = previousObject.getBoundingClientRect();

	// (content is completely hidden)
	if (boundingRect.bottom <= 0) {
		var delta = boundingRect.bottom - boundingRect.height;
		window.scrollBy(0, delta);
	}
	else if (boundingRect.top <= 0) {
		var delta = boundingRect.top;
		window.scrollBy(0, delta);
	}
}

function scrollPastContent() {
	var currentHeight = $("#object-container").height();
	$("#object-container").height(currentHeight + 400);
	window.scrollBy(0, 400);
}

function hideLocalMenu(currentContent) {
	$(currentContent).find(".local-menu-container").remove();
}

function showCommandPrompt(placeholder) {
	$("#command-prompt").attr("disabled", false);
	if (placeholder) { $("#command-prompt").attr("placeholder", placeholder); }
	$("#command-prompt").focus();
}

function hideCommandPrompt() {
	$("#command-prompt").val("");
	$("#command-prompt").attr("placeholder", "");
	$("#command-prompt").attr("disabled", true);
}

function showMenuPrompt(prompt) {
	$("#mode-menu").css("visibility", "hidden");
	$("#menu-prompt").prop("disabled", false);
	$("#menu-prompt").attr("placeholder", "");
	$("#menu-prompt").focus();
}

function hideMenu() {
	$("#mode-menu-container").hide();
}

function showYellowSelector() {
	var allLinks = $(".object-link").toArray();

	for (var i = 0; i < allLinks.length; i++) {
		var quicklink = window.document.createElement("A");
		var hint = Utilities.stringNumberToHintString(i);
		quicklink.innerHTML = hint;
		quicklink.className = "quicklink object " + hint;
		$(allLinks[i]).before(quicklink);	
	}
}

function removeYellowSelector() {
	$("a.quicklink").remove();
}

window.Handlebars.registerHelper("localMenu", function(items, className) {
	var menu = "<ul class='local-menu'>";
	for (var i=0; i<items.length; i++) {
		var id = items[i].toLowerCase().replace(/ /g, "_");	
		if (i === 0) 
			menu = menu + Utilities.interpolate("<li class='local-menu-item %@ active' data-id='%@'>", className, id) + items[i] + "</li>";
		else 
			menu = menu + Utilities.interpolate("<li class='local-menu-item %@' data-id='%@'>", className, id) + items[i] + "</li>";
	}
	return menu = menu + "</ul>";
});

window.Handlebars.registerHelper("linkOptions", function(items) {
	var menu = "<ul class='local-menu'>";	
	for (var i=0; i<items.length; i++) {
		if (i === 0)
			menu = menu + Utilities.interpolate("<li class='local-menu-item link-option active' data-file='%@'>%@</li>", items[i].file, items[i].name);
		else
			menu = menu + Utilities.interpolate("<li class='local-menu-item link-option' data-file='%@'>%@</li>", items[i].file, items[i].name);
	}
	return menu = menu + "</ul>";
});

module.exports = ObjectController;
