var ObjectController = require("./object_controller.js");
var fs = require("fs");
var Constants = require("./constants.js");
var Utilities = require("./utilities.js");

var State = {
	NORMAL: 0,
	PROCESS_NAVIGATE: 1,
	FOLDING_CONTENT: 2,
	IMAGE: 3,
	VIDEO: 4,
	VISUAL_SELECT: 5,
	WORD_SELECT: 6,
	LOCAL_MENU: 7,
	FOLDING_CONTEN: 8,
	COMMANDPROMPT: 9,
	QUICKLINK: 10,
	POP_QUICKLINK: 11,
	SEARCH_RESULTS: 12,
	FOOTER_MENU: 13,
	GLOBAL_SEARCH: 14
};

var ProcessController = Object.create(ObjectController);

ProcessController.makeActive = function(selection) {
	this.state = State.NORMAL;
	this.title = selection.name;
	this.file = selection.file;
	this.getData();
}

ProcessController.renderData = function(error, processes) {
	var modeTemplate = Handlebars.templates.process;
	$("#mode-container").html(modeTemplate());

	if (processes) {
		this.processes = $(processes).find(".process");
		this.contents = $(processes).find(".content");
		$("#process-container").append(processes);
	}
	else {
		var pTitle = window.document.createElement("P");
		pTitle.className = "editable title";
		pTitle.textContent = this.title;

		var titleDiv = window.document.createElement("DIV");
		titleDiv.className = "text_content content";
		$(titleDiv).append(pTitle);
		$("#process-container").prepend(titleDiv);

		var new_text = window.document.createElement("DIV");
		new_text.className = "text_content content active";
		$(new_text).append("<p class='editable'>Add text</p>");

		var newProcessDiv = window.document.createElement("DIV");
		newProcessDiv.className = "process";	
		$(newProcessDiv).append(new_text);

		$("#process-container").append(newProcessDiv);

		this.contents = [];
		this.contents.push(titleDiv);
		this.contents.push(new_text);
		this.setCurrentContent(new_text);
	}
	// render footer 
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Constants.Mode.PROCESS.toString()
	};
	$("footer").html(footerTemplate(footerData));

	// render math
	this.renderAllMath();
}

ProcessController.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	if (this.state === State.NORMAL) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_F:
 				// show links on page
				if (e.metaKey) {
					this.app.showGlobalFind();
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
			case Constants.KeyEvent.DOM_VK_I:
				this.app.changeMode(Constants.Mode.INDEX, null);
				break;
			case Constants.KeyEvent.DOM_VK_J:
				// Move down content
				this.moveToNextContentOrProcess();
				break;
			case Constants.KeyEvent.DOM_VK_K:
				// Move up content 
				this.moveToPreviousContentOrProcess();
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
			case Constants.KeyEvent.DOM_VK_ADD:
				// Zoom in?
				break;
			case Constants.KeyEvent.DOM_VK_SUBTRACT:
				// Zoom out?
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
				this.app.globalFind();	
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
		//this.state = State.VIM;
		//this.openVI();					
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_A:
				this.appendTextObject();
				hideMenu();
				break;
			case Constants.KeyEvent.DOM_VK_D:
				if (e.shiftKey) {
					this.deleteProcess();
					hideMenu();
					this.state = State.NORMAL;
				}
				else 
					this.deleteContent();
				break;
			case Constants.KeyEvent.DOM_VK_E:
				this.editTextObject();
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
				this.appendMathObject();
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_N:
				hideMenu();
				this.addNewProcess();
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
				this.appendImageObject(uri);
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
				this.processVisualSelection(activeMenuItem);	
				hideLocalMenu(this.currentContent);			
				$(this.currentContent).find(".editable").removeClass("highlighted");
				this.state = State.NORMAL;	
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
				this.app.openMatch();
				break;
		}
	}
}

ProcessController.moveToNextContentOrProcess = function() {
	this.moveDownContent();	
	var parentProcessOfCurrentContent = $(this.currentContent).closest(".process");
	if (this.currentProcess !== parentProcessOfCurrentContent)
		this.setCurrentProcess(parentProcessOfCurrentContent);		
}

ProcessController.moveToPreviousContentOrProcess = function() {
	this.moveUpContent();
	var parentProcessOfCurrentContent = $(this.currentContent).closest(".process");
	if (this.currentProcess !== parentProcessOfCurrentContent)
		this.setCurrentProcess(parentProcessOfCurrentContent);	
}

ProcessController.moveDownProcess = function() {
	var nextProcess = $(this.currentProcess).next();
	if (nextProcess.length > 0) {
		$(this.currentProcess).removeClass("active");
		this.setCurrentProcess(nextProcess);
	}
}

ProcessController.moveUpProcess = function() {
	var prevProcess = $(this.currentProcess).prev();
	if (prevProcess.length > 0) {
		$(this.currentProcess).removeClass("active");		
		this.setCurrentProcess(prevProcess);
	}
}

ProcessController.setCurrentProcess = function(process) {
	$(this.currentProcess).removeClass("active");
	this.currentProcess = process;
	$(process).addClass("active");
}

ProcessController.editProcess = function() {

}

ProcessController.showFooterMenu = function() {
	var footerTemplate = Handlebars.templates.footer;
	var footerData;

	if ($(".content").length > 0) {
		footerData = {
			mode: Constants.Mode.PROCESS.toString(), 
			options: ["(n)ew process", "(a)ppend text", "(i)nsert image", "(m)athematics", "(d)elete", "(D)elete Process" ]
		};
	} else {
		footerData = {
			node: Constants.Mode.PROCESS.toString(),
			options: ["(i)nsert text", "(a)ppend image"]
		};	
	}

	$("footer").html(footerTemplate(footerData));
	$("#mode-menu-container").show();
	$("#mode-menu").css("visibility", "visible");
}

ProcessController.addNewProcess = function() {
	$(".content.active").removeClass("active");

	var new_text = window.document.createElement("DIV");
	new_text.className = "text_content content active";
	$(new_text).append("<p class='editable'>Add text</p>");

	var newProcessDiv = window.document.createElement("DIV");
	newProcessDiv.className = "process";	
	$(newProcessDiv).append(new_text);

	$("#process-container").append(newProcessDiv);

	this.processes.push(newProcessDiv);
	this.contents.push(new_text);
	this.setCurrentContent(new_text);
	this.setCurrentProcess(newProcessDiv);
}

ProcessController.deleteProcess = function() {
	var newCurrentProcess = $(this.currentProcess).prev();
	var newCurrentContent = $(this.currentProcess).find(".content").first();
	$(this.currentProcess).remove();
	this.setCurrentProcess(newCurrentProcess);
	this.setCurrentContent(newCurrentContent)
}

ProcessController.createNewProcessDiv = function() {

}

ProcessController.showObject = function() {
	var fileComponents = this.file.split(/\//);

	var dirIndex = _.indexOf(fileComponents, "processes");
	fileComponents[dirIndex] = "objects";

	var objectName = _.last(fileComponents).split(".")[0] + ".object";
	fileComponents[fileComponents.length - 1] = objectName;

	var objectFile = fileComponents.join("/");

	//var objectFile = Constants.PATH + this.app.getSubject() + ".notes/objects/" + this.title + ".object";
	var selection = { "name": this.title, "file": objectFile };
	this.app.changeMode(Constants.Mode.OBJECT, selection);
}

ProcessController.save = function() {
	var data = ""; 
	var processes = $("#process-container").children().toArray();

	_.each(processes, function(content) {
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
	data = data.replace(/active/g, "");
	fs.writeFile(this.file, data, function(err) {
		if (err) throw err;
		console.log('It\'s saved!');
	});
	this.unsavedData = false;

	this.app.updateElasticSearchIndex({ file: this.file, html: data });
}

function showCommandPrompt(placeholder) {
	$("#command-prompt").attr("disabled", false);
	if (placeholder) { $("#command-prompt").attr("placeholder", placeholder); }
	$("#command-prompt").focus();
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

function hideLocalMenu(currentContent) {
	$(currentContent).find(".local-menu-container").remove();
}

function hideCommandPrompt() {
	$("#command-prompt").val("");
	$("#command-prompt").attr("placeholder", "");
	$("#command-prompt").attr("disabled", true);
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

module.exports = ProcessController;
