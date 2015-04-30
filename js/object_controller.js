var fs = require("fs"); 
var Constants  = require("./constants.js");
var Utilities = require("./utilities.js");

var State = {
	NORMAL: 0,
	MENU: 1,
	IMAGE: 2,
	VIDEO: 3,
	VIM: 4,
	VISUAL_SELECT: 5,
	LOCAL_MENU: 6,
	TOGGLE: 7
};

var SubState = {
		
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

		// set the rawHTML property for each content 
		_.each(this.contents, function(content) {	
			content.rawHTML = content.outerHTML; 
		});
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
		var new_title = window.document.createElement("DIV");		
		new_title.class = "content";
		var h3 = window.document.createElement("H3");
		h3.id = "title";
		h3.class = "editable";
		h3.textContent = this.object;
		new_title.appendChild(h3);	

		var new_text = window.document.createElement("DIV");
		new_text.className = "text_content content active"	
		$(new_text).append("<p class='editable'>Add text</p>");
		$("#mode-container").append(new_title);
		$("#mode-container").append(new_text);			
		new_text.rawHTML = new_text.outerHTML;

		this.contents.push(new_text);
		this.setCurrentContent(new_text);
	}
	
	// render any math	
	renderMath();

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
				if (nextContent !== undefined ) {
					this.setCurrentContent(nextContent);
					scrollDown(this.currentContent);	
				}
				break;
			case Constants.KeyEvent.DOM_VK_K:
				// Move up content 
				var currentIndex = $.inArray(this.currentContent, this.contents);
				var previousContent = this.contents[currentIndex-1]; 
				if (previousContent !== undefined ) {
					this.setCurrentContent(previousContent);
					scrollUp(this.currentContent);
				}
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
			case Constants.KeyEvent.DOM_VK_V:
				if (! e.shiftKey)	
					return;
				$(this.currentContent).find(".editable").addClass("highlighted");
				this.state = State.VISUAL_SELECT;
				break;
			case Constants.KeyEvent.DOM_VK_Z:
				// Folding Initiation key
				this.state = State.TOGGLE;
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
				saveObjectData(this.contents, { "subject": this.subject, "object": this.object });			
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_COMMA:
				if (! e.shiftKey)
					return;
				decreaseFoldDepth(this.currentContent);
				saveObjectData(this.contents, { "subject": this.subject, "object": this.object });			
				this.state = State.NORMAL;
				break;
			default:
		}
	}
	else if (this.state === State.MENU) {
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
					saveObjectData(this.contents, { "subject": this.subject, "object": this.object });			
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
				this.appendMathContent();
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
				$(this.currentContent).find(".editable").removeClass("highlighted");
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_M:
				showLocalMenu(this.currentContent);
				$(this.currentContent).find(".editable").removeClass("highlighted");
				this.state = State.LOCAL_MENU;
				break;
		}
	}
	else if (this.state === State.LOCAL_MENU) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				hideLocalMenu(this.currentContent);			
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_N:
				// move to next option	
				var activeMenuItem = $(".local-menu-item.active");
				var allLocalMenuItems = $(".local-menu-item").toArray();
				var index = $.inArray(activeMenuItem[0], allLocalMenuItems);

				if (index+1 < allLocalMenuItems.length) {
					$(activeMenuItem).removeClass("active");		
					$(allLocalMenuItems[index+1]).addClass("active");
				}
				break;
			case Constants.KeyEvent.DOM_VK_P:
				// move to previous option
				var activeMenuItem = $(".local-menu-item.active");
				var allLocalMenuItems = $(".local-menu-item").toArray();
				var index = $.inArray(activeMenuItem[0], allLocalMenuItems);
								
				if (index -1 >= 0) {	
					$(activeMenuItem).removeClass("active");
					$(allLocalMenuItems[index-1]).addClass("active");
				}
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				// Determine which action has been selected and execute it
				var activeMenuItem = $(".local-menu-item.active");
				hideLocalMenu(this.currentContent);			
				this.state = State.NORMAL;	
				break;
		}
	}
	else if (this.state === State.TOGGLE) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_C:

				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_O:

				this.state = State.NORMAL;
				break;
			case Constants.KeyEvent.DOM_VK_M:

				this.state = State.NORMAL;
				break;			
			case Constants.KeyEvent.DOM_VK_R:

				break;
			case Constants.KeyEvent.DOM_VK_L:

				this.state = State.NORMAL;
				break;	
		}
	}
}

ObjectController.prototype.openVI = function() {
	this.state = State.VIM;

	/* CODE MIRROR & VIM binding */ 
	// codemirror.js :  Line 5802 is the "save" function
	// vim_keymappings.js:  Line 4468 is the "write" function fo vim
	
	// Grab editable html, replace with a temporary textarea
	var htmlToReplace = $(this.currentContent).find(".editable")[0];
	var tempTextArea = window.document.createElement("TEXTAREA");
	tempTextArea.className = htmlToReplace.className; 

	var rawHTML = $($.parseHTML(this.currentContent.rawHTML)).find(".editable")[0];
	// extract the inner paragraph html
	var innerHTML = rawHTML.innerHTML;
	tempTextArea.innerHTML = innerHTML;
	$(htmlToReplace).replaceWith(tempTextArea);

	// Initialize VIM
	this.vim = CodeMirror.fromTextArea(tempTextArea, {
		autofocus: true,
		lineNumbers: true,
		keyMap: "vim",
		showCursorWhenSelecting: true
	});
	CodeMirror.on(this.vim, 'vim-saving-done', this.closeVI.bind(this));
}

ObjectController.prototype.closeVI = function(e) {
	// get new text
	var newText = this.vim.getValue();

	// get textarea element
	var vimTextArea = this.vim.getTextArea();
	var classNames = vimTextArea.className;
	// remove vim vimTextArea and set vim to null
	this.vim.toTextArea();
	this.vim = null;

	var updatedContent = window.document.createElement("P");
	updatedContent.className = classNames;
	updatedContent.innerHTML = newText;	
	$(vimTextArea).replaceWith(updatedContent);

	// update data with new text
	var newHTML = $(this.currentContent).clone();
	$(newHTML).removeClass("active");
	$(newHTML).find(".editable").text(newText);	
	var newRawHTML = newHTML[0].outerHTML;
	this.currentContent.rawHTML = newRawHTML;

	// render any math
	if (classNames.match(/math/))	{
		window.katex.render(updatedContent.innerHTML, updatedContent);	
	}
	
	this.state = State.NORMAL;

	saveObjectData(this.contents, { "subject": this.subject, "object": this.object });			
}

ObjectController.prototype.editTextContent = function() {
	this.openVI();
}

ObjectController.prototype.appendTextContent = function() {
	var newContentDiv = window.document.createElement("DIV");
	newContentDiv.className = "text_content content";

	var newContentParagraph = window.document.createElement("P");	
	newContentParagraph.className = "editable";
	newContentParagraph.innerHTML = "Add text here";
	newContentDiv.appendChild(newContentParagraph);
	newContentDiv.rawHTML = newContentDiv.outerHTML;
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
	// cleanup command-prompt
	hideCommandPrompt();	

	var newContentDiv = window.document.createElement("DIV");
	newContentDiv.className = "image_content content";	

	var image = window.document.createElement("IMG");
	image.src = uri;

	newContentDiv.appendChild(image);		
	newContentDiv.rawHTML = newContentDiv.outerHTML;

	$(this.currentContent).after(newContentDiv);

	this.contents.push(newContentDiv);

	this.setCurrentContent(newContentDiv);

	saveObjectData(this.contents, { "subject": this.subject, "object": this.object });			

	this.state = State.NORMAL;
}

ObjectController.prototype.appendMathContent = function() {
	var newContentDiv = window.document.createElement("DIV");
	newContentDiv.className = "text_content content";
	
	var newContentParagraph = window.document.createElement("P");
	newContentParagraph.className = "editable math";
	newContentParagraph.innerHTML = "Add TEX here";
	newContentDiv.appendChild(newContentParagraph);
	newContentDiv.rawHTML = newContentDiv.outerHTML;
	$(this.currentContent).after(newContentDiv);
}

function increaseFoldDpeth(currentContent) {
	// check if content has ay depth at all
	// if it does, then increment it further	
	if (/depth/.test(currentContent.className) ) {
		// get the depth level integer
		var depthClass = currentContent.className.match(/depth-\d/)[0];
		$(currentContent).removeClass(depthClass);
		var newDepth = Number.parseInt(depthClass[6]) + 1;
		var newDepthClass = String.interpolate("depth-%@", newDepth);	
		$(currentContent).addClass(newDepthClass);	
	} else {
		// if it does not, then it must be implicitly at depth-0
		// therefore my intent is to set it to depth-1
		$(currentContent).addClass("depth-1");
	}

	// Update content's rawHTML data
	var oldRawHTML = $(currentContent.rawHTML)[0];
	oldRawHTML.className = currentContent.className;	
	$(oldRawHTML).removeClass("active");
	currentContent.rawHTML = oldRawHTML.outerHTML;
}

function decreaseFoldDepth(currentContent) {
	if (/depth/.test(currentContent.className) ) {
		var depthClass = currentContent.className.match(/depth-\d/)[0];
		$(currentContent).removeClass(depthClass);
		var newDepth = Number.parseInt(depthClass[6]) - 1;
		if (newDepth < 0) 
			newDepth = 0;	
		var newDepthClass = String.interpolate("depth-%@", newDepth);	
		$(currentContent).addClass(newDepthClass);

		// update content's rawHTML data
		var oldRawHTML = $(currentContent.rawHTML)[0];
		oldRawHTML.className = currentContent.className;	
		$(oldRawHTML).removeClass("active");
		currentContent.rawHTML = oldRawHTML.outerHTML;
	}
}

function foldAllContentToDepth(depth) {

}

function unfoldAllContentToDepth(depth) {

}

function foldContentToDepth(currentContent, depth) {

}

function unfoldContentToDepth(currentContent, depth) {

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

function showLocalMenu(currentContent) {
	var localMenuDiv = window.document.createElement("DIV");
	localMenuDiv.className = "local-menu-container";

	var localMenu = window.Handlebars.helpers.localMenu(["increase fold depth", "decrease fold depth"])	

	$(localMenuDiv).append(localMenu);
	$(currentContent).prepend(localMenuDiv);
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

function renderMath() {
	var mathContent = $(".math");
	_.each(mathContent, function(equation) {
		window.katex.render(equation.innerHTML, equation);
	});	 
}

function saveObjectData(htmlContent, selection) {
	var filePath = String.interpolate("%@%@.notes/%@.object", Constants.PATH, selection.subject, selection.object);

	//var title = window.document.getElementById("title");
	htmlContent = $(htmlContent).toArray()

	var data = "";
	for (var i = 0; i < htmlContent.length; i++) {
		data += htmlContent[i].rawHTML + "\n\n";	
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

window.Handlebars.registerHelper("localMenu", function(items) {
	var menu = "<ul class='local-menu'>";
	for (var i=0; i<items.length; i++) {
		if (i === 0)
			menu = menu + "<li class='local-menu-item active'>" + items[i] + "</li>";
		else 
			menu = menu + "<li class='local-menu-item'>" + items[i] + "</li>";
	}
	return menu = menu + "</ul>";
});

module.exports = ObjectController;
