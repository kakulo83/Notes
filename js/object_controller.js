var fs = require("fs"); 
var Constants  = require("./constants.js");
var Utilities = require("./utilities.js");
var exec = require('child_process').exec;

var State = {
	NORMAL: 0,
	MAIN_MENU: 1,
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
	SEARCH_RESULTS: 12
};

var Menu = {
	NORMAL: 0,
	VISUAL_SELECT: 1,
	WORD: 2
}

var ObjectController = function(app) {
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
};

ObjectController.prototype.makeActive = function(selection) {
	// subject is the subject matter, object is the specific topic
	this.state = State.NORMAL;
	this.object = selection;
	this.unsavedData = false;
	this.getObjectData();
}

ObjectController.prototype.getObjectData = function() {
	d3.html(this.object.file, this.renderData.bind(this));
}

ObjectController.prototype.renderData = function(error, object) {
	var modeTemplate = Handlebars.templates.object;
	$("#mode-container").html(modeTemplate());

	// init mutation observer that will watch for content changes
	var targetNodes = $("#object-container, .text_content, .image_content");
	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	var DOMObserver = new MutationObserver (this.onContentModified.bind(this));
	var obsConfig = { childList: false, characterData: true, attributes: false, subtree: false };

	targetNodes.each(function () {
		DOMObserver.observe(this, obsConfig);
	});

	if (object) {
		this.contents = $(object).children(".content");
		this.setCurrentContent(this.contents[0]);
		$("#object-container").append(object);
	}
	else {
		var pTitle = window.document.createElement("P");
		pTitle.className = "editable title";
		pTitle.textContent = this.object.name;

		var titleDiv = window.document.createElement("DIV");
		titleDiv.className = "text_content content";
		$(titleDiv).append(pTitle);
		$("#object-container").prepend(titleDiv);

		var new_text = window.document.createElement("DIV");
		new_text.className = "text_content content active";
		$(new_text).append("<p class='editable'>Add text</p>");
		$("#object-container").append(new_text);			

		this.contents.push(titleDiv);
		this.contents.push(new_text);
		this.setCurrentContent(new_text);
	}

	// render footer 
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Constants.Mode.OBJECT.toString()
	};
	$("footer").html(footerTemplate(footerData));

	// render math
	this.renderAllMath();
}

ObjectController.prototype.onContentModified = function(mutationRecords) {
	mutationRecords.forEach ( function (mutation) {
		if (mutation.type == "childList") {
			this.unsavedData = true;
		}
	}.bind(this));
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
			case Constants.KeyEvent.DOM_VK_F:
				// show links on page
				showYellowSelector();
				if (e.shiftKey)
					this.state = State.POP_QUICKLINK;
				else
					this.state = State.QUICKLINK;
				break;
			case Constants.KeyEvent.DOM_VK_I:
				// Insert object 
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
				this.state = State.MAIN_MENU;
				showMenu();	
				break;
			case Constants.KeyEvent.DOM_VK_P:
				this.app.changeMode(Constants.Mode.PROCESS);
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
				// return if content is NOT of type textContent
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
			case Constants.KeyEvent.DOM_VK_ADD:
				// Zoom in?
				break;
			case Constants.KeyEvent.DOM_VK_SUBTRACT:
				// Zoom out?
				break;
			case Constants.KeyEvent.DOM_VK_PERIOD:
				if (! e.shiftKey)
					return;
				increaseFoldDpeth(this.currentContent);
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_COMMA:
				if (! e.shiftKey)
					return;
				decreaseFoldDepth(this.currentContent);
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
	else if (this.state === State.MAIN_MENU) {
		//var vimWindow = window.open("vim.html", "_blank", 'screenX=0,screenY=0,width=800,height=600'); 
		//this.state = State.VIM;
		//this.openVI();					

		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_A:
				this.appendTextContent();
				hideMenu();
				break;
			case Constants.KeyEvent.DOM_VK_D:
				hideMenu();	
				var confirm = window.prompt("To delete this content, type 'yes'", "");
				if (confirm.toLowerCase() === "yes") {
					$(this.currentContent).remove();
					var index = $.inArray(this.currentContent, this.contents);		
					this.contents.splice(index, 1);
					this.setCurrentContent(this.contents[0]);
					this.state = State.NORMAL;
				}	
				break;
			case Constants.KeyEvent.DOM_VK_E:
				this.editTextContent();
				hideMenu();	
				break;
			case Constants.KeyEvent.DOM_VK_I:
				hideMenu();	
				showCommandPrompt("enter file or url");	
				this.state = State.IMAGE;
				hideMenu();									
				break;
			case Constants.KeyEvent.DOM_VK_M:
				hideMenu();
				this.appendMathContent();
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
			
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				var uri = $("#command-prompt").val();
				this.appendImageContent(uri);
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
				hideLocalMenu(this.currentContent);			
				$(this.currentContent).find(".editable").removeClass("highlighted");
				this.state = State.NORMAL;	
				break;

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
					var nextContent = this.contents[i];
					var nextDepth = Number.parseInt(nextContent.dataset.depth);
					if (nextDepth < currentDepth)
						break;	
					$(nextContent).hide();
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
					this.foldAllContent();
				}
				else {

				}
				this.state = State.NORMAL;
				break;			
			case Constants.KeyEvent.DOM_VK_R:
				if (e.shiftKey) {
					this.unfoldAllContent();
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
			var query = String.interpolate(".quicklink.%@", linkLetters);
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
			var query = String.interpolate(".quicklink.%@", linkLetters);
			var quicklink = $(query);
			if ($(quicklink).length) {
				var objectName = $(quicklink).siblings(".object-link").attr("href");
				var new_win = window.gui.Window.open("file:///Users/robertcarter/Downloads/dogsVscats.jpg?object=derp");

				/*
				function getParameterByName(name) {
					name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
					var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
							results = regex.exec(location.search);
					return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
				}
				
				function getParameter(theParameter) { 
					var params = window.location.search.substr(1).split('&');
				 
					for (var i = 0; i < params.length; i++) {
						var p=params[i].split('=');
					if (p[0] == theParameter) {
						return decodeURIComponent(p[1]);
					}
					}
					return false;
				}	

				example:
					http://technicaloverload.com?test1=yes&test2=no&test3=http%3A%2F%2Ftechnicaloverload.com%2F					

					getParameter('test1') --> yes
					getParameter('test2') --> no
					getParameter('test3') --> http://technicaloverload.com/
					getParameter('test4') --> false	
				*/

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
				this.moveDownSearchResult();			
				break;
			case Constants.KeyEvent.DOM_VK_K:
				this.moveUpSearchResult();		
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				this.openSearchMatch();
				break;
		}
	}
}

ObjectController.prototype.processCommandPrompt = function() {
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
			this.app.globalFind(argument);
			this.state = State.SEARCH_RESULTS;
			break;
		default:			
	}
}

// TODO Find out why app.js can't use String.interpolate
ObjectController.prototype.globalFind = function(query) {
	myCmd = String.interpolate('ag --ackmate -G "(.object|.process)" --no-numbers -a -C %@ /Users/robertcarter/Documents/VIL/%@.notes/', query, this.app.getSubject());
	exec(myCmd,  function (query, error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
			return;
		}
		var searchResults = Utilities.parseAckmateString(stdout);
		var searchResultsDiv = window.document.createElement("DIV");
		searchResultsDiv.className = "searchresults";	

		// Iterate through each result
		for (var i=0; i<searchResults.length; i++) {
			// show the file path
			var matchDiv = window.document.createElement("DIV");
			matchDiv.className = "search-match";
			var file = window.document.createElement("P");
			file.className = "filepath";
			file.innerHTML = searchResults[i].file;
			$(matchDiv).append(file);
			var context = searchResults[i].context;	
			// show the context
			for (var j=0; j<context.length; j++) {
				// check if context contains location indices (40 4:<h3 ...</h3>)
				if ( (/^\d+\s+\d+\:.*/).test(context[j]) ) {
					var match = $(context[j].split(":")[1]);
					$(match).removeClass();
					match = match[0].outerHTML.replace(query, String.interpolate("<span class='query-match'>%@</span>", query));
					$(matchDiv).append(match);
				}
				else {
					var additionalContext = context[j];
					$(additionalContext).removeClass();
					$(additionalContext).children().removeClass();
					$(matchDiv).append(additionalContext);
					$(matchDiv).find("div").removeClass();
					$(matchDiv).find("p:not(:first)").removeClass().attr("id", "");
					$(matchDiv).find("h3").removeClass().attr("id", "");		
				}
			}
			$(searchResultsDiv).append(matchDiv);
		}
		$("#mode-container").append(searchResultsDiv);

		this.app.renderMath(searchResultsDiv);
	}.bind(this, query) );
}

ObjectController.prototype.showVisualSelectMenu = function() {
	var localMenuDiv = window.document.createElement("DIV");
	localMenuDiv.className = "local-menu-container";
	var localMenu = window.Handlebars.helpers.localMenu(["visual menu item1", "change me in showVisualSelectionMenu function"], "");
	$(localMenuDiv).append(localMenu);
	$(this.currentContent).prepend(localMenuDiv);
}

ObjectController.prototype.showCurrentWordMenu = function() {
	var currentWord = $(".currentWord")[0];
	var localMenuDiv = window.document.createElement("DIV");
	localMenuDiv.className = "local-menu-container link-targets";
	var localMenu = window.Handlebars.helpers.localMenu(["Modify me in showCurrentWordMenu function"], "");
	$(localMenuDiv).append(localMenu);
	$(currentWord).append(localMenuDiv);
}

ObjectController.prototype.openVI = function() {
	this.state = State.VIM;

	/* CODE MIRROR & VIM binding */ 
	// codemirror.js :  Line 5802 is the "save" function
	// vim_keymappings.js:  Line 4468 is the "write" function fo vim
	
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
	}
	else {
		var tempTextArea = window.document.createElement("TEXTAREA");
		tempTextArea.className = editable.className; 

		var links = $(editable).find(".object-link");

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

		CodeMirror.on(this.vim, 'vim-saving-done', this.closeVI.bind(this));
	}
}

ObjectController.prototype.closeVI = function(e) {
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
		var updatedContent = window.document.createElement("P");	
		var classNames = this.vim.getTextArea().className;
		updatedContent.className = classNames;
		$(updatedContent).append(newText);
		$(this.currentContent).html(updatedContent);
		try {
			this.app.renderMath(updatedContent);
		}
		catch (error) {
			$(updatedContent).append(newText);
			$(this.currentContent).html(updatedContent);
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
		var updatedContent = window.document.createElement("PRE");
		var classNames = this.vim.getTextArea().className;
		updatedContent.className = classNames;
		$(updatedContent).append(spanWrappedWords);
		$(this.currentContent).html(updatedContent);

		// reinsert links if their words are still in the updated text content
		var links = this.vim.links;
		_.each(links, function(link) {
			var linkQuery = String.interpolate(".word:contains('%@'):first", link.innerHTML);
			$(this.currentContent).find(linkQuery).html(link);
		},this);
	}
	
	// remove vim editor
	this.vim = null;
	this.state = State.NORMAL;
}

ObjectController.prototype.editTextContent = function() {
	// using codemirror
	this.openVI();
}

ObjectController.prototype.appendTextContent = function() {
	var newContentDiv = window.document.createElement("DIV");
	newContentDiv.className = "text_content content";
	newContentDiv.setAttribute("data-depth", 0);

	var newContentParagraph = window.document.createElement("P");	
	newContentParagraph.className = "editable";
	newContentParagraph.innerHTML = "Add text here";
	newContentDiv.appendChild(newContentParagraph);
	
	$(this.currentContent).after(newContentDiv);

	// GET INDEX OF CURRENTCONTENT (we might be appending content in the middle of the page) SPLICE NEW CONTENT
	var indexCurrent = $.inArray(this.currentContent, this.contents);
	if (indexCurrent < this.contents.length - 1)
		this.contents.splice(indexCurrent+1, 0, newContentDiv);	
	else 
		this.contents.push(newContentDiv);

	this.setCurrentContent(newContentDiv);

	// Open vi
	this.openVI();
}

ObjectController.prototype.appendImageContent = function(uri) {
	hideCommandPrompt();	
	var newContentDiv = window.document.createElement("DIV");
	newContentDiv.className = "image_content content";	
	newContentDiv.setAttribute("data-depth", 0);

	var image = window.document.createElement("IMG");
	image.src = uri;

	newContentDiv.appendChild(image);		


	$(this.currentContent).after(newContentDiv);
	this.contents.push(newContentDiv);
	this.setCurrentContent(newContentDiv);
	this.state = State.NORMAL;
}

ObjectController.prototype.appendMathContent = function() {
	var newContentDiv = window.document.createElement("DIV");
	newContentDiv.className = "text_content content";
	
	var newContentParagraph = window.document.createElement("P");
	newContentParagraph.className = "editable math";
	newContentParagraph.innerHTML = "Add TEX here";
	newContentDiv.appendChild(newContentParagraph);

	$(this.currentContent).after(newContentDiv);

	// GET INDEX OF CURRENTCONTENT (we might be appending content in the middle of the page) SPLICE NEW CONTENT
	var indexCurrent = $.inArray(this.currentContent, this.contents);
	if (indexCurrent < this.contents.length - 1)
		this.contents.splice(indexCurrent+1, 0, newContentDiv);	
	else 
		this.contents.push(newContentDiv);

	this.setCurrentContent(newContentDiv);

	// Open vi
	this.openVI();
}

ObjectController.prototype.openSearchMatch = function() {
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

ObjectController.prototype.moveDownSearchResult = function() {
	var nextSearchMatch = $(".search-match.active").next();
	if (nextSearchMatch.length === 0) { nextSearchMatch = $(".search-match:first-child"); }
	$(".search-match.active").removeClass("active");
	$(nextSearchMatch).addClass("active");
	var boundingRect = nextSearchMatch[0].getBoundingClientRect();
	$(".search-match.active")[0].scrollIntoView({block: "end"});
}

ObjectController.prototype.moveUpSearchResult = function() {
	var prevSearchMatch = $(".search-match.active").prev();
	if (prevSearchMatch.length === 0) { prevSearchMatch = $(".search-match:last-child"); }
	$(".search-match.active").removeClass("active");
	$(prevSearchMatch).addClass("active");
	$(".search-match.active")[0].scrollIntoView({block: "top"});
}

ObjectController.prototype.moveDownContent = function() {
	var index = $.inArray(this.currentContent, this.contents) + 1;
	var nextContent = this.contents[index];

	// remove current word
	$(".active .currentWord").removeClass("currentWord");

	if (nextContent !== undefined) {
		if ( $(nextContent).is(":visible") ) {
			this.setCurrentContent(nextContent);
			scrollDown(this.currentContent);	
		} else {
			// nextContent is NOT visible, therefore keep advancing until visible content is found	
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
}

ObjectController.prototype.moveUpContent = function() {
	var index = $.inArray(this.currentContent, this.contents) - 1;
	var previousContent = this.contents[index]; 

	// remove current word
	$(".active .currentWord").removeClass("currentWord");

	if (previousContent !== undefined ) {
		if ( $(previousContent).is(":visible") ) {
			this.setCurrentContent(previousContent);
			scrollUp(this.currentContent);
		} else {
			// previousContent is NOT visible	
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

ObjectController.prototype.save = function() {
	var data = "";	
	_.each(this.contents, function(content) {
		if ( $(content).find(".editable").hasClass("math") ) {
			var TeX = "\\(" + $(content).find(".math script").html() + "\\)";
			var editable = $(content).find(".editable").clone();
			$(editable).html(TeX);

			var preRenderedContent = $(content).clone();
			$(preRenderedContent).find(".editable").replaceWith(editable);
			data = data + preRenderedContent[0].outerHTML + "\n";	
		} else
			data = data + content.outerHTML + "\n";	
	},this);
	data = data.replace(/active/, "");

	fs.writeFile(this.object.file, data, function(err) {
		if (err) throw err;
		console.log('It\'s saved!');
	});
	this.unsavedData = false;
}

ObjectController.prototype.makeAnchor = function() {

}

ObjectController.prototype.showLinkOptions = function() {
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

ObjectController.prototype.createLink = function(selectedOption) {
	var target = selectedOption[0].dataset.file;
	var targetText = $("span.currentWord").html();
	var link   = String.interpolate("<a href='%@' class='object-link'>%@</a>", target, targetText);
	$("span.currentWord").html(link);
}

ObjectController.prototype.getLinkableObjects = function() {
	var deferred = new $.Deferred();
	var objectTreePath = String.interpolate("%@%@.notes/%@.tree", Constants.PATH, this.app.subject, this.app.subject);
	d3.json(objectTreePath, function(error, nodes) {
		var linkableObjects = _.map(Utilities.flattenTree(nodes), function(object) {
														return { "name": object.name, "file": object.file };	
													});
		deferred.resolve(linkableObjects);
	}.bind(this));
	return deferred.promise();
}

ObjectController.prototype.openLink = function(selectedObject) {
	this.keyStrokeStack = [];	
	this.makeActive(selectedObject);
}

ObjectController.prototype.popLink = function() {

}

ObjectController.prototype.foldAllContent = function() {
	var depth1Content = $(".content[data-depth=1]").toArray();
	_.each(depth1Content, function(content) {
		var currentDepth = 1;
		$(content).children().hide();
		$(content).prepend("<div class='folded-content'>+</div>");	

		// Fold all content from curentContnet, any deeper, any the same level, up until
		// content at a lower depth number is encountered
		var start = $.inArray(content, this.contents) + 1;
		for (var i = start; i < this.contents.length; i++) {
			var nextContent = this.contents[i];
			var nextDepth = Number.parseInt(nextContent.dataset.depth);
			if (nextDepth < currentDepth)
				break;	
			$(nextContent).hide();
		}
	},this);
}

ObjectController.prototype.unfoldAllContent = function() {
	var depth1Content = $(".content[data-depth=1]").toArray();
	_.each(depth1Content, function(content) {
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

ObjectController.prototype.renderAllMath = function() {
	this.app.renderMath();
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

function increaseFoldDpeth(currentContent) {
	var depth = Number.parseInt(currentContent.getAttribute("data-depth"));
	if (depth) {
		if (depth + 1 < 7)
			depth = depth + 1;	
		currentContent.setAttribute("data-depth", depth);
	} else {
		currentContent.setAttribute("data-depth", 1);
	}
}

function decreaseFoldDepth(currentContent) {
	var depth = Number.parseInt(currentContent.getAttribute("data-depth"));
	if (depth) {
		if (depth - 1 >= 0) 
			depth = depth - 1;
		currentContent.setAttribute("data-depth", depth);		
	}
}

function scrollDown(nextContent) {
	var boundingRect = nextContent.getBoundingClientRect();

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

function scrollUp(previousContent) {
	var boundingRect = previousContent.getBoundingClientRect();

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

function showMenu() {
	var footerTemplate = Handlebars.templates.footer;
	var footerData;
	if ($(".content").length > 0) {	
		footerData = {
			mode: Constants.Mode.OBJECT.toString(),
			options: ["(e)dit", "(a)ppend text", "(i)nsert image", "(m)athematics", "(d)elete" ]
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
		if (i === 0)
			menu = menu + String.interpolate("<li class='local-menu-item %@ active'>", className) + items[i] + "</li>";
		else 
			menu = menu + String.interpolate("<li class='local-menu-item %@'>", className) + items[i] + "</li>";
	}
	return menu = menu + "</ul>";
});

window.Handlebars.registerHelper("linkOptions", function(items) {
	var menu = "<ul class='local-menu'>";	
	for (var i=0; i<items.length; i++) {
		if (i === 0)
			menu = menu + String.interpolate("<li class='local-menu-item link-option active' data-file='%@'>%@</li>", items[i].file, items[i].name);
		else
			menu = menu + String.interpolate("<li class='local-menu-item link-option' data-file='%@'>%@</li>", items[i].file, items[i].name);
	}
	return menu = menu + "</ul>";
});

module.exports = ObjectController;
