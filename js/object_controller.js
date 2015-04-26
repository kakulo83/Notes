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

		// set the rawHTML property for each content 
		_.each(this.contents, function(content) {	
			// TODO Fix this shit.  ALL content elements will OBVIOUSLY have the same 
			// value for rawHTML because it's being set on the proto object!!!!
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
		new_text = window.document.createElement("DIV");
		new_text.className = "text_content content active"	
		$(new_text).append("<p class='editable'>Add text</p>");
		$("#mode-container").append(new_text);			
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
				console.log(String.interpolate("No handler for %@", charCode));
		}
	}
	else if (this.state === State.VIM) { 

	}
	else if (this.state === State.IMAGE) {
		console.log("Handling image insert");
	
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_ESCAPE:
			
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				var uri = $("#command-prompt").val();
				this.appendImageContent(uri);
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

	var title = window.document.getElementById("title");
	htmlContent = $(htmlContent).toArray()

	var data = title.outerHTML + "\n\n";
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

module.exports = ObjectController;
