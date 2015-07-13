var fs = require("fs");
var Constants = require("./constants.js");
var Utilities = require("./utilities.js");

var State = { 
	NORMAL: 0,
	MENU: 1,
	QUICKLINK: 2,
	COMMANDPROMPT: 3,
	SCROLL: 4,  // TODO Add a scroll mode where I can scroll the entire tree if it gets too big
	MOVE_NODE: 5,
	MOVE_ORPHAN: 6,
	ORPHAN: 7,
	GLOBAL_SEARCH: 8,
	SEARCH_RESULTS: 9
};

// TreeController is being referenced from app.js as a node module.  This means the javascript
// scope of TreeController is the node javascript scope AND NOT the browser javascript scope.
// Because of this, window, $, and Handlebars have to be explicitly passed here
var $ = null;
var d3 = null;
var Handlebars = null;
var _ = null;

var TreeController = function(app, subject, window) {
	this.app = app;

	$ = window.$;
	Handlebars = window.Handlebars
	d3 = window.d3;
	_ = window._;

	this.chart = tree();
	this.orphans = [];
	this.state = State.NORMAL;
	this.ignoreKeyboardInput = false;  // without this flag, the full range of keyboard letters wouldn't be available for setting new node names, or quicklink letters because letters like 'a', 'd', 'm' etc would be captured as they are also hotkeys themselves.
	this.file = null;
	this.subject = subject || null; 
	this.keyStrokeStack = [];
	this.currentNode = null;
}

TreeController.prototype.makeActive = function() {
	this.state = State.NORMAL;
	if (this.chart.nodes()) //if (this.chart) 
		this.renderView();
	else
		this.getTreeData(this.subject);
}

TreeController.prototype.getTreeData = function(subject) {
	if (subject) {
		this.subject = subject;
		var file = String.interpolate("%@%@.notes/%@.tree", Constants.PATH, subject, subject); 
		d3.json(file, this.processData.bind(this));
	}
	else {
		// create the tree json in memory with New_Subject as the root node
		var file = 	String.interpolate("%@%@.notes/%@.json", Constants.PATH, subject, subject); 
		var root = { "name": "New Subject", "file": file, "children": [], "orphans": [] };
		this.file = null;
		this.chart.nodes(root);
		this.renderView();
	}
}

TreeController.prototype.processData = function(error, nodes) {
	if (nodes) {
		// file and data exists
		this.file = String.interpolate("%@%@.notes/%@.json", Constants.PATH, this.subject, this.subject); 
		this.chart.nodes(nodes);
		if (nodes.orphans) 
			this.orphans = nodes.orphans;
		this.renderView();	
	}
	else {
		// file/data not exist.  create the tree json in memory
		var file = 	String.interpolate("%@%@.notes/%@.tree", Constants.PATH, this.subject, this.subject); 
		var root = { "name": this.subject , "file": file, "children": [], "orphans": [] };
		this.file = null;
		this.chart.nodes(root);
		this.renderView();
	}
}

TreeController.prototype.renderView = function() {
	// Generate Mode Template
	var modeTemplate = Handlebars.templates.tree;
	var mainData = {
	};

	$("#mode-container").html(modeTemplate(mainData));
	$("#mode-container").prepend("<div id='orphans-container'><h3>Orphaned Objects</h3><ul id='orphans'></ul></div>");	

	if (this.chart.nodes().orphans)
		this.renderOrphans();	

	if (this.chart.nodes()) {
		this.chart.render();
		// TODO replace this shitty solution with either a proper render complete callback or add promises 
		setTimeout(function() {   //calls click event after a certain time
			this.currentNode = this.chart.nodes();
			var query = String.interpolate(".node.%@", this.chart.nodes().id);
			var rootNodeSVG = $(query);
			d3.select(rootNodeSVG[0]).select("circle")
				.attr("class", "current");
		}.bind(this), 500);	
	}

	// Render footer
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Constants.Mode.TREE.toString(),
		options: ["(a)dd node", "(m)ove and make child to", "(r)ename", "(d)etach node",  "(D)elete node"]
	};
	$("footer").html(footerTemplate(footerData));
}

TreeController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	if (this.state === State.QUICKLINK) {
		// is keystroke ESCAPE ?
		if (charCode === Constants.KeyEvent.DOM_VK_ESCAPE) {
			this.state = State.NORMAL;
			this.keyStrokeStack = [];
			removeYellowSelector();
		}
		// is keystroke part of the quicklink characterSet ?
		else if (_.contains([ Constants.KeyEvent.DOM_VK_A, Constants.KeyEvent.DOM_VK_C, Constants.KeyEvent.DOM_VK_D, Constants.KeyEvent.DOM_VK_E, Constants.KeyEvent.DOM_VK_F, Constants.KeyEvent.DOM_VK_G, Constants.KeyEvent.DOM_VK_H, Constants.KeyEvent.DOM_VK_J, Constants.KeyEvent.DOM_VK_K, Constants.KeyEvent.DOM_VK_L, Constants.KeyEvent.DOM_VK_M, Constants.KeyEvent.DOM_VK_P, Constants.KeyEvent.DOM_VK_S, Constants.KeyEvent.DOM_VK_W ], charCode)) {
			var newChar = String.fromCharCode(charCode);
			this.keyStrokeStack.push(newChar);
			// Attempt to select node	
			var linkLetters = this.keyStrokeStack.join("").toLowerCase();
			var query = String.interpolate(".quicklink.%@", linkLetters);
			var quicklink = $(query);

			// If selection exists 
			if ($(quicklink).length) {
				// determine which quicklink was chosen, SVG <g> for tree node, or <a> for orphan
				if( /orphan/.test(quicklink[0].className) ) {
					this.state = State.ORPHAN;
					this.setCurrentOrphanFromAnchorSelect(quicklink);
				}
				else {
					this.state = State.NORMAL;
					var node = $(quicklink).parent().parent();
					this.setCurrentNodeFromQuickLinkSelect(node);	
					this.state = State.NORMAL;
				}
				this.keyStrokeStack = [];
				removeYellowSelector();
			}
		}
	}
	else if (this.state === State.ORPHAN) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_J:
				var nextOrphan = $(".orphan .circle.current").parent().next();
				if (nextOrphan.length !== 0)
					this.setCurrentOrphan(nextOrphan);
				break;
			case Constants.KeyEvent.DOM_VK_K:
				var previousOrphan = $(".orphan .circle.current").parent().prev();
				if (previousOrphan.length !== 0)
					this.setCurrentOrphan(previousOrphan);
				break;
			case Constants.KeyEvent.DOM_VK_M:
				showYellowSelector();	
				this.state = State.MOVE_ORPHAN;
				break;
			case Constants.KeyEvent.DOM_VK_D:
				var confirm = window.prompt("To delete this content, type 'yes'", "");
				if (confirm.toLowerCase() === "yes") {
					this.deleteOrphan();
					this.state = State.NORMAL;
				}
				break;	
			case Constants.KeyEvent.DOM_VK_F:
				this.state = State.QUICKLINK;
				showYellowSelector();
				break;
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
	else if (this.state === State.NORMAL) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_F:
				if (e.metaKey) {
					this.app.showGlobalFind();
					this.state = State.GLOBAL_SEARCH;	
				}
				else {
					this.state = State.QUICKLINK;
					showYellowSelector();
				}
				break;
			case Constants.KeyEvent.DOM_VK_H:
				// Move to left node
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				if (this.currentNode.parent)
					this.setCurrentNodeFromDataStructureSelect(this.currentNode.parent);
				break;
			case Constants.KeyEvent.DOM_VK_I:
				this.app.changeMode(Constants.Mode.INDEX, null);
				break;
			case Constants.KeyEvent.DOM_VK_J:
				// Move down node		
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				var parent = this.currentNode.parent;
				if (!parent)
					return;
				var childPosition = $.inArray(this.currentNode, parent.children);
				if (childPosition < parent.children.length - 1)
					this.setCurrentNodeFromDataStructureSelect(parent.children[childPosition + 1]);
				else {
					var nextCousin = this.getNextCousinNode();
					if (nextCousin) { this.setCurrentNodeFromDataStructureSelect(nextCousin); }
				}
				break;
			case Constants.KeyEvent.DOM_VK_K:
				// Move up node
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				var parent = this.currentNode.parent;
				if (parent) {
					var childPosition = $.inArray(this.currentNode, parent.children);
					if (childPosition > 0)
						this.setCurrentNodeFromDataStructureSelect(parent.children[childPosition - 1]);
					else {
						var prevCousin = this.getPreviousCousinNode();
						if (prevCousin) { this.setCurrentNodeFromDataStructureSelect(prevCousin); }
					}
				}
				break;
			case Constants.KeyEvent.DOM_VK_L:
				// Move to right node
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				// if the current node has children, move to the right and top (first child) and set as the new current node
				if (this.currentNode.children)
					this.setCurrentNodeFromDataStructureSelect(this.currentNode.children[0]);		
				else {
					// if the current node does not have children, find the next sibling that does and move to the top most of its children
					var possibleNode = this.nextSiblingNodeWithChildren();				
					if (possibleNode !== null)
						this.setCurrentNodeFromDataStructureSelect(possibleNode);
				}

				break;
			case Constants.KeyEvent.DOM_VK_M:
				this.state = State.MENU;
				showMenu();	
				// (Secondary) fold one level 
				break;	
			case Constants.KeyEvent.DOM_VK_O:
				var selection = this.currentNode; 
				this.app.changeMode(Constants.Mode.OBJECT, selection);
				break;
			case Constants.KeyEvent.DOM_VK_P:
				var processFile = Constants.PATH + this.app.getSubject() + ".notes/processes/" + this.currentNode.name + ".process";
				var selection = { "name": this.currentNode.name, "file": processFile };
				this.app.changeMode(Constants.Mode.PROCESS, selection);
				break;
			case Constants.KeyEvent.DOM_VK_R:
				// Unfold one level
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
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				break;
			case Constants.KeyEvent.DOM_VK_RETURN: 
				// toggles children nodes
				var svgNode = this.getSVGFromNode(this.currentNode);
				d3.select(svgNode[0]).on("click")(d3.select(svgNode[0]).data()[0]);
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
				try {	
					this.processCommandPrompt();	
					hideCommandPrompt();
				}
				catch (error) { 
					console.log(error);
				}
				break;
			default:
		}
	}
	else if (this.state === State.MENU) {
		switch(charCode) {
			case Constants.KeyEvent.DOM_VK_M:
				if (! this.ignoreKeyboardInput) {
					this.state = State.MOVE_NODE;
					showYellowSelector();	
					this.ignoreKeyboardInput = true;
				}
				break;	
			case Constants.KeyEvent.DOM_VK_A:
				if (! this.ignoreKeyboardInput) {
					this.ignoreKeyboardInput = true;
					e.preventDefault();
					showMenuPrompt("Enter node name", "add_node");
				}
				break;
			case Constants.KeyEvent.DOM_VK_D:
				// Delete node
				if (! this.ignoreKeyboardInput) {
					// keyboard input 
					this.ignoreKeyboardInput = true;
					if (e.shiftKey) {
						var confirm = window.prompt("To delete this node, type 'yes'", "");
						if (confirm.toLowerCase() === "yes") 
							this.deleteNode();
							this.ignoreKeyboardInput = false;
					}
					else {
						var confirm = window.prompt("To detach this node, type 'yes'", "");
						if (confirm.toLowerCase() === "yes") 
							this.detachNode();
							this.ignoreKeyboardInput = false;
					}
					this.state = State.NORMAL;
				}
				break;
			case Constants.KeyEvent.DOM_VK_R:
				if (! this.ignoreKeyboardInput) {
					this.ignoreKeyboardInput = true;
					e.preventDefault();
					showMenuPrompt("Enter new name", "rename_node");
				}
				break;
			case Constants.KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;
				this.ignoreKeyboardInput = false;
				hideMenuPrompt();	
				break;
			case Constants.KeyEvent.DOM_VK_RETURN:
				var name = $("#menu-prompt").val();
				if ( $("#menu-prompt").hasClass("add_node") ) 
					this.addNewNode(name);
				else if ( $("#menu-prompt").hasClass("rename_node") )
					this.renameNode(name);
				this.ignoreKeyboardInput = false;
				hideMenuPrompt();	
				this.state = State.NORMAL;
				break;
			default:
		}
	}
	else if (this.state === State.MOVE_NODE) {
		if (charCode === Constants.KeyEvent.DOM_VK_ESCAPE) {
			this.state = State.NORMAL;
			this.keyStrokeStack = [];
			removeYellowSelector();
			hideMenuPrompt();
		}
		else if (_.contains([ Constants.KeyEvent.DOM_VK_A, Constants.KeyEvent.DOM_VK_C, Constants.KeyEvent.DOM_VK_D, Constants.KeyEvent.DOM_VK_E, Constants.KeyEvent.DOM_VK_F, Constants.KeyEvent.DOM_VK_G, Constants.KeyEvent.DOM_VK_H, Constants.KeyEvent.DOM_VK_J, Constants.KeyEvent.DOM_VK_K, Constants.KeyEvent.DOM_VK_L, Constants.KeyEvent.DOM_VK_M, Constants.KeyEvent.DOM_VK_P, Constants.KeyEvent.DOM_VK_S, Constants.KeyEvent.DOM_VK_W ], charCode)) {
			var newChar = String.fromCharCode(charCode);
			this.keyStrokeStack.push(newChar);
			// Attempt to select node	
			var linkLetters = this.keyStrokeStack.join("").toLowerCase();
			var query = String.interpolate(".quicklink.%@", linkLetters);
			var quicklink = $(query);
			if ($(quicklink).length) {
				// grab node and move it as a child to new parent
			}
		}
		this.ignoreKeyboardInput = false;
		this.state = State.NORMAL;
	}
	else if (this.state === State.MOVE_ORPHAN) {
		if (charCode === Constants.KeyEvent.DOM_VK_ESCAPE) {
			this.state = State.ORPHAN;
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
				// get the node that will become the parent
				var parentNode = quicklink.parent().parent()[0].__data__;	
				this.moveOrphan(parentNode);
				this.setCurrentNodeFromQuickLinkSelect(quicklink);
				this.state = State.NORMAL;
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

TreeController.prototype.getNextCousinNode = function() {
	var queue = [];
	queue.push(this.chart.nodes());
	var currentNode;

	while (queue.length > 0) {
		currentNode = queue.shift();

		if (currentNode.depth === this.currentNode.depth) {
			// find index of this.currentNode in the queue	
			var index = queue.indexOf(this.currentNode);
			if (index >= 0) 
				return queue[index+1];
			else 
				return queue[0];
		}
		if (currentNode.children) {
			for (var i=0; i<currentNode.children.length; i++) {
				queue.push(currentNode.children[i])
			}
		}
	}
	return null;
}

TreeController.prototype.getPreviousCousinNode = function() {
	var queue = [];
	queue.push(this.chart.nodes());

	while (queue.length > 0) {
		var currentNode = queue.shift();
		if (currentNode.depth === this.currentNode.depth) {
			// find index of this.currentNode in the queue	
			var index = queue.indexOf(this.currentNode);
			if (index > 0)
				return queue[index-1];	
			else
				return currentNode;
		}
		if (currentNode.children) {
			for (var i=0; i<currentNode.children.length; i++) {
				queue.push(currentNode.children[i])
			}
		}
	}
	return null;
}

TreeController.prototype.addNewNode = function(name) {
	if (name === "") {
		this.state = State.NORMAL;
		return;
	}
	this.state = State.NORMAL;

	var id = d3.selectAll(".node")[0].length + 1;
	var filePath = Constants.PATH + this.subject + ".notes/objects/" + name + ".object";
	var newNode = { name: name, file: filePath, depth: this.currentNode.depth+1, parent: this.currentNode, children: [] };
	// If current node has no array for it's children, give it one
	if (!this.currentNode.children)
		this.currentNode.children = [];
	this.currentNode.children.push(newNode);
	this.chart.update(this.chart.nodes());
}

TreeController.prototype.renameNode = function(name) {
	this.currentNode.name = name;	
	$("circle.current").siblings("text").text(name);
}

TreeController.prototype.deleteNode = function() {
	// remove all children from tree and make orphans
	if (this.currentNode.children || this.currentNode._children) {
		var new_orphans = Utilities.flattenTree(this.currentNode);
		// the currentNode is being deleted so shift the array by 1 to remove it
		new_orphans.shift();
		this.chart.nodes().orphans = this.chart.nodes().orphans.concat(new_orphans);
		this.renderOrphans();
	}

	// delete only selected node 
	var indexToDestroy = $.inArray(this.currentNode, this.currentNode.parent.children);
	this.currentNode.parent.children.splice(indexToDestroy, 1);

	this.currentNode.parent = null;
	
	// redraw the tree
	this.chart.update(this.chart.nodes());

	// make root node selected node
	this.setCurrentNodeFromDataStructureSelect(this.chart.nodes());

	hideMenuPrompt();
}

TreeController.prototype.deleteOrphan = function() {
	var name = $(".orphan.current").text();
	$(".orphan.current").remove();
	this.chart.nodes().orphans = _.reject(this.chart.nodes().orphans, function(orphan) {
																	return orphan.name === name;		
															},this);
	if (this.chart.nodes().orphans.length == 0)
		$("#orphans-container").hide();	
}

TreeController.prototype.detachNode = function() {
	// move children of deleted node to orphan array
	if (this.currentNode.children || this.currentNode._children) {
		var new_orphans = Utilities.flattenTree(this.currentNode);
		this.chart.nodes().orphans = this.chart.nodes().orphans.concat(new_orphans);
	}
	else {
		this.chart.nodes().orphans.push(this.currentNode);
	}

	// delete selected node from this.chart.nodes()
	var indexToDestroy = $.inArray(this.currentNode, this.currentNode.parent.children);
	this.currentNode.parent.children.splice(indexToDestroy, 1);
	
	// redraw the tree
	this.chart.update(this.chart.nodes());

	// render the orphans
	this.renderOrphans();

	// make root node selected node
	this.setCurrentNodeFromDataStructureSelect(this.chart.nodes());

	hideMenuPrompt();
}

TreeController.prototype.moveOrphan = function(parentNode) {
	// create the new legitimate child
	var name = $(".orphan.current .orphan-name").text();
	var file = Constants.PATH + this.subject + ".notes/objects/" + name + ".object";
	var newChild = { "name": name, "file": file, "parent": parentNode };

	// add as new child to parent node
	if (parentNode.children)
		parentNode.children.push(newChild);
	else {
		parentNode.children = [];
		parentNode.children.push(newChild);
	}

	// remove orphan from orphan UI 
	$(".orphan.current").remove();

	// remove orphan from this.chart().nodes().orphans
	var orphanIndex = 0;
	for (var i=0; i<this.chart.nodes().orphans.length; i++) {
		if (this.chart.nodes().orphans[i].name == name) {
			orphanIndex = i;
			break;	
		}
	}
	this.chart.nodes().orphans.splice(orphanIndex, 1);

	// hide orphans container when no orphans 
	if (this.chart.nodes().orphans.length == 0)
		$("#orphans-container").hide();	

	this.ignoreKeyboardInput = false;	
	this.keyStrokeStack = [];
	removeYellowSelector();	
	this.chart.update(this.chart.nodes());
}

TreeController.prototype.renderOrphans = function() {
	if (this.chart.nodes().orphans.length > 0)
		$("#orphans-container").show();
	else 
		$("#orphans-container").hide();

	$("#orphans").html("");

	_.each(this.chart.nodes().orphans, function(orphan) {		
		var orphanListItem = window.document.createElement("LI");
		orphanListItem.className = "orphan";	
			
		var circleSpan = window.document.createElement("SPAN");
		circleSpan.className = "circle";
		var orphanName = window.document.createElement("SPAN");
		orphanName.className = "orphan-name";
		orphanName.innerHTML = orphan.name;
		$(orphanListItem).append(circleSpan);
		$(orphanListItem).append(orphanName);
		$("#orphans").append(orphanListItem);
	}, this);
}

TreeController.prototype.getSVGFromNode = function(node) {
	return $(String.interpolate(".node.%@", node.id));	
}

TreeController.prototype.getNodeFromSVG = function(svgNode) {
	return $(svgNode)[0].__data__;	
	throw new Error("No matching nodes");	
}

TreeController.prototype.nextSiblingNodeWithChildren = function() {
	// This function attempts to find the current node's next sibling that has children.
	// If found, it returns the first child of that sibling, otherwise it returns null.
	var parent = this.currentNode.parent;
	var childPosition = $.inArray(this.currentNode, parent.children);
	// iterate through siblings.  The set the currentNode to the first child of the first sibling with children
	for (var i = childPosition + 1; i< parent.children.length; i++) {
		if (parent.children[i].children) {
			return this.currentNode = parent.children[i].children[0];
		}
	}
	return null;
}

TreeController.prototype.setCurrentNodeFromDataStructureSelect = function(newCurrentNode) {
	// This function updates the graphical representation of the current node from the data node.
	// It queries the gui for what is the current node, removes its 'current' class and then adds
	// the class 'current' to what is the new current node

	this.currentNode = newCurrentNode;	

	// Find the graphical representation of the new current node
	var id = newCurrentNode.id;
	var query = String.interpolate("g.node.%@", id);
	var svgNode = $(query);	
	
	// remove class "current" on current graphical representation of a node
	$("circle.current").attr("class", "");

	// add class "current" on the new current graphical representation of the node
	d3.select(svgNode[0]).select("circle")
				.attr("class", "current");
}

TreeController.prototype.setCurrentNodeFromQuickLinkSelect = function(svgNode) {
	// This function does 2 things.  First it sets the TreeController's current node (in reference to
	// the tree datastructure) to the specific object in the actual datastructure tree.
	// Second it visually sets the current node to red by adding the css class "current"
	// to the svg circle element.

	this.currentNode = this.getNodeFromSVG(svgNode);
	
	// remove class "current" on current node/orphan
	$("circle.current").attr("class", "");
	$(".orphan .circle").removeClass("current");

	// add class "current" on the new current graphical representation of the node
	d3.select(svgNode[0]).select("circle")
				.attr("class", "current");
}

TreeController.prototype.setCurrentOrphan = function(currentOrphan) {
	$(".orphan.current .circle.current").removeClass("current");
	$(".orphan.current").removeClass("current");
	$(currentOrphan).addClass("current");
	$(currentOrphan).find(".circle").addClass("current");
}

TreeController.prototype.setCurrentOrphanFromAnchorSelect = function(anchor) {
	$("circle.current").attr("class", "");	
	$(".quicklink.orphan").siblings(".circle").removeClass("current");
	$(anchor).parent().addClass("current");
	$(anchor).siblings(".circle").addClass("current");
}

TreeController.prototype.processCommandPrompt = function() {
	$(".file").text("");
	// options 'w' write, 'x' write and close
	var commandArray = $("#command-prompt").val().split(" ");
	var option = commandArray[0].toLowerCase();
	var argument = commandArray[1] || null;

	switch(option) {
		case "w":
			if (argument) {
				var directoryPath = String.interpolate("/Users/robertcarter/Documents/VIL/%@.notes/", argument);
	
				// check if the directory exists			
				fs.realpath(directoryPath, function(err, resolvedPath) {
					// directory exists; write to it
					if (!err) {
						var filePath = String.interpolate("/Users/robertcarter/Documents/VIL/%@.notes/%@.tree", argument, argument);
						writeToFile(file, this.chart.nodes());
					}
					// directory nonexistant;  create it first then write to it
					else {
						var directoryPath = arguments[0];
						fs.mkdirSync(directoryPath);
						fs.mkdirSync(directoryPath + "/data/");
						var filePath = String.interpolate("/Users/robertcarter/Documents/VIL/%@.notes/%@.tree", argument, argument);
						writeToFile(filePath, this.chart.nodes());
					}
				}.bind(this, directoryPath, argument));
				this.subject = argument;
			}
			else if (this.subject) {
				var directoryPath = String.interpolate("/Users/robertcarter/Documents/VIL/%@.notes/", this.subject);

				// check if the directory exists			
				fs.realpath(directoryPath, function(directoryPath, subject, err, resolvedPath) {
					if (!err) {
						// directory exists; write to it
						var filePath = String.interpolate("/Users/robertcarter/Documents/VIL/%@.notes/%@.tree", subject, subject);
						writeToFile(filePath, this.chart.nodes());
					}
					else {
						// directory nonexistant;  create it first then write to it
						var directoryPath = arguments[0];
						var subject = arguments[1];
						fs.mkdirSync(directoryPath);
						fs.mkdirSync(directoryPath + "/objects/");
						fs.mkdirSync(directoryPath + "/processes/");
						fs.mkdirSync(directoryPath + "/data/");
						var filePath = String.interpolate("/Users/robertcarter/Documents/VIL/%@.notes/%@.tree", subject , subject);
						writeToFile(filePath, this.chart.nodes());
					}
				}.bind(this, directoryPath, this.subject));
			}
			else {
				$(".file").text("NO SUBJECT GIVEN");	
			}
			this.state = State.NORMAL;
			break;
		case "f":
			this.app.globalFind(argument);
			this.state = State.SEARCH_RESULTS;
			break;
	}
}

function writeToFile(file, object) {
	var jsonString = JSON.circularStringify(object);	
	fs.writeFile(file, jsonString);
}

function showMenu() {
	// Generate Footer Template
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Constants.Mode.TREE.toString(),
		options: ["(a)dd node", "(m)ove and make child to", "(r)ename", "(d)etach node",  "(D)elete node"]
	};
	$("footer").html(footerTemplate(footerData));
	$("#mode-menu-container").show();
	$("#mode-menu").css("visibility", "visible");
}

function hideMenuPrompt() {
	$("#mode-menu-container").hide();
}

function showCommandPrompt() {
	$("#command-prompt").attr("disabled", false);
	$("#command-prompt").focus();
}

function hideCommandPrompt() {
	$("#command-prompt").val("");
	$("#command-prompt").attr("disabled", true);
}

function showMenuPrompt(hint, operation) {
	$("#menu-prompt-hint").text(hint);
	$("#mode-menu").css("visibility", "hidden");
	$("#menu-prompt").addClass(operation);
	$("#menu-prompt").prop("disabled", false);
	$("#menu-prompt").focus();
	$("#menu-prompt").attr("value", "");
}

function showYellowSelector() {
	$(".quicklink-container").remove();	

	// Reattach quicklinks
	var nodes = d3.selectAll(".node");
		nodes.append("foreignObject")
			.attr("class", "quicklink-container")
			.attr("x", -10)
			.attr("y", -12)	
			.attr("width", 40)
			.attr("height",18)
			.append("xhtml:a")
				.attr("class", function(d, i) {
					// TODO clean this shit up, do I really need to insert html here?  Can't an SVG elements be used instead?
					return "quicklink " + i + " " + Utilities.stringNumberToHintString(i);
				})
				.text(function (d, i) {
					return Utilities.stringNumberToHintString(i);
				});

	// Highlight any possible orphans
	var orphanIndex = nodes[0].length;	
	var orphans = $(".orphan").toArray();

	for (var i = orphanIndex; i < orphans.length + orphanIndex; i++) {
		var quicklink = window.document.createElement("A");
		var hint = Utilities.stringNumberToHintString(i);
		quicklink.innerHTML = hint;
		// TODO Add link hint as part of anchor name too
		quicklink.className = "quicklink orphan " + hint;
		$(orphans[i - orphanIndex]).prepend(quicklink);
	}
}

function removeYellowSelector() {
	d3.selectAll(".quicklink").classed({"hide": true});
	$(".quicklink.orphan").remove();
}

function tree() {
	var _chart = {};

	var _width = 1400, _height = 800,
					_margins = {top: 30, left: 120, right: 30, bottom: 30},
					_svg,
					_nodes,
					_i = 0,
					_tree,
					_diagonal,
					_bodyG;

	function renderBody(svg) {
			_bodyG = svg.append("g")
			.attr("class", "body")
			.attr("transform", function (d) {
				return "translate(" + _margins.left 
					+ "," + _margins.top + ")";
			});

			_tree = d3.layout.tree()
							.size([
				(_height - _margins.top - _margins.bottom), 
				(_width - _margins.left - _margins.right)
			]);

			_diagonal = d3.svg.diagonal()
							.projection(function (d) {
									return [d.y, d.x];
							});

			_nodes.x0 = (_height - _margins.top - _margins.bottom) / 2;
			_nodes.y0 = 0;

			render(_nodes);
	}

	function render(source) {
			var nodes = _tree.nodes(_nodes).reverse();

			renderNodes(nodes, source);

			renderLinks(nodes, source);
	}

	function renderNodes(nodes, source) {
			nodes.forEach(function (d) {
					d.y = d.depth * 180;
			});

			var node = _bodyG.selectAll("g.node")
							.data(nodes, function (d) {
									return d.id || (d.id = ++_i);
							});

			var nodeEnter = node.enter().append("svg:g")
							.attr("class", function(d,i) {
								var num = i + 1;
								if (d.id)
									return "node " + d.id;
								return "node " + num;
							})
							.attr("transform", function (d) {
									return "translate(" + source.y0 + "," + source.x0 + ")";
							})
							.on("click", function (d) {
									toggle(d);
									render(d);
							});

			nodeEnter.append("svg:circle")
							.attr("r", 1e-6)
							.style("fill", function (d) {
									return d._children ? "lightsteelblue" : "#fff";
							});

			var nodeUpdate = node.transition()
							.attr("transform", function (d) {
									return "translate(" + d.y + "," + d.x + ")";
							});

			nodeUpdate.select("circle")
							.attr("r", 4.5)
							.style("fill", function (d) {
									return d._children ? "darkgreen" : "#fff";
							});

			var nodeExit = node.exit().transition()
							.attr("transform", function (d) {
									return "translate(" + source.y + "," + source.x + ")";
							})
							.remove();

			nodeExit.select("circle")
							.attr("r", 1e-6);

			renderLabels(nodeEnter, nodeUpdate, nodeExit);

			nodes.forEach(function (d) {
					d.x0 = d.x;
					d.y0 = d.y;
			});
	}

	function renderLabels(nodeEnter, nodeUpdate, nodeExit) {
			nodeEnter.append("svg:text")
							.attr("x", function (d) {
									return d.children || d._children ? -10 : 10;
							})
							.attr("dy", ".35em")
							.attr("text-anchor", function (d) {
									return d.children || d._children ? "end" : "start";
							})
							.text(function (d) {
									return d.name;
							})
							.style("fill-opacity", 1e-6);

			nodeUpdate.select("text")
							.style("fill-opacity", 1);

			nodeExit.select("text")
							.style("fill-opacity", 1e-6);
	}

	function renderLinks(nodes, source) {
			var link = _bodyG.selectAll("path.link")
							.data(_tree.links(nodes), function (d) {
									return d.target.id;
							});

			link.enter().insert("svg:path", "g")
							.attr("class", "link")
							.attr("d", function (d) {
									var o = {x: source.x0, y: source.y0};
									return _diagonal({source: o, target: o});
							});

			link.transition()
							.attr("d", _diagonal);

			link.exit().transition()
							.attr("d", function (d) {
									var o = {x: source.x, y: source.y};
									return _diagonal({source: o, target: o});
							})
							.remove();
	}

	function toggle(d) {
			if (d.children) {
					d._children = d.children;
					d.children = null;
			} else {
					d.children = d._children;
					d._children = null;
			}
	}

	function toggleAll(d) {
			if (d.children) {
					d.children.forEach(toggleAll);
					toggle(d);
			}
	}

	function update(source) {
		// Taken from:  http://stackoverflow.com/questions/11589308/d3-js-how-to-dynamically-add-nodes-to-a-tree

		var duration = d3.event && d3.event.altKey ? 5000 : 500;		

		// New tree layout ( _tree is a d3 layout object)
		var nodes = _tree.nodes(_nodes).reverse();	

		// Normalize for fixed-depth ?
		nodes.forEach(function(d) { d.y = d.depth * 180; });

		var node = _bodyG.selectAll("g.node")
					.data(nodes, function (d) {
							return d.id || (d.id = ++_i);
					});

		var nodeEnter = node.enter().append("svg:g")
							.attr("class", function(d,i) {
								var num = i + 1;
									if (d.id)
										return "node " + d.id;
								return "node " + num;
							})
							.attr("transform", function (d) {
									return "translate(" + source.y0 + "," + source.x0 + ")";
							})
							.on("click", function (d) {
									toggle(d);
									render(d);
									//update(d);	
							});

		nodeEnter.append("svg:circle")
							.attr("r", 1e-6)
							.style("fill", function (d) {
									return d._children ? "lightsteelblue" : "#fff";
							});

		nodeEnter.append("svg:text")
						.attr("x", function(d) { return d.children || d._children ? -10 : 10; })
						.attr("dy", ".35em")
						.attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
						.text(function(d) { return d.name; })
						.style("fill-opacity", 1e-6);

		// Transition nodes to their new position.
		var nodeUpdate = node.transition()
					.duration(duration)
					.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

		nodeUpdate.select("circle")
						.attr("r", 4.5)
						.style("fill", function (d) {
								return d._children ? "lightsteelblue" : "#fff";
						});

	  // Transition exiting nodes to the parent's new position.
		var nodeExit = node.exit().transition()
				.duration(duration)
				.attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
				.remove();

		nodeExit.select("circle")
				.attr("r", 1e-6);

		nodeExit.select("text")
				.style("fill-opacity", 1e-6);

		var diagonal = d3.svg.diagonal()
				.projection(function(d) { return [d.y, d.x]; });

		// Update the links…
		var link = d3.select(".body").selectAll("path.link")
				.data(_tree.links(nodes), function(d) { return d.target.id; });

		// Enter any new links at the parent's previous position.
		link.enter().insert("svg:path", "g")
				.attr("class", "link")
				.attr("d", function(d) {
					var o = {x: source.x0, y: source.y0};
					return diagonal({source: o, target: o});
				})
			.transition()
				.duration(duration)
				.attr("d", diagonal);

		// Transition links to their new position.
		link.transition()
				.duration(duration)
				.attr("d", diagonal);

		// Transition exiting nodes to the parent's new position.
		link.exit().transition()
				.duration(duration)
				.attr("d", function(d) {
					var o = {x: source.x, y: source.y};
					return diagonal({source: o, target: o});
				})
				.remove();

		// Stash the old positions for transition.
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
	}

	_chart.render = function () {
			_svg = d3.select("#mode-container").append("svg")
										.attr("height", _height)
										.attr("width", _width);
			renderBody(_svg);
	};

	_chart.width = function (w) {
			if (!arguments.length) return _width;
			_width = w;
			return _chart;
	};

	_chart.height = function (h) {
			if (!arguments.length) return _height;
			_height = h;
			return _chart;
	};

	_chart.margins = function (m) {
			if (!arguments.length) return _margins;
			_margins = m;
			return _chart;
	};

	_chart.nodes = function (n) {
			if (!arguments.length) return _nodes;
			_nodes = n;
			return _chart;
	};

	_chart.update = function(source) {
		update(source);
	}

	return _chart;
}

module.exports = TreeController;
