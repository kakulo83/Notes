//var Constants = require("./constants.js");

var State = { 
	NORMAL: 0,
	MENU: 1,
	QUICKLINK: 2,
	COMMANDPROMPT: 3,
	SCROLL: 4  // TODO Add a scroll mode where I can scroll the entire tree if it gets too big
};

var TreeController = function(app, subject) {
	this.app = app;
	this.chart = tree();
	this.state = State.NORMAL;
	this.file = null;
	this.subject = subject || ""; 
	this.keyStrokeStack = [];
	this.currentNode = null;
	this.getTreeData(subject);
};

TreeController.prototype.makeActive = function() {

}

TreeController.prototype.getTreeData = function(subject) {
	if (subject) {
		this.subject = subject;
		var file = String.interpolate("%@%@.notes/%@.tree", PATH, subject, subject); 
		d3.json(file, this.processData.bind(this));
	}
	else {
		// create the tree json in memory with New_Subject as the root node
		var root = { "name": "New Subject", "children": [] };
		this.file = null;
		this.chart.nodes(root);
		this.renderView();
	}
}

TreeController.prototype.processData = function(error, nodes) {
	if (nodes) {
		// file and data exists
		this.file = String.interpolate("%@%@.notes/%@.json", PATH, this.subject, this.subject); 
		this.chart.nodes(nodes);
		this.renderView();	
	}
	else {
		// file/data not exist.  create the tree json in memory
		var root = { "name": this.subject , "children": [] };
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

	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Mode.TREE.toString(),
		options: ["(n)ew tree", "(a)dd node", "(m)ove node", "(d)elete node", "(c)opy node"]
	};
	$("footer").html(footerTemplate(footerData));
}

TreeController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;
	if (this.state === State.QUICKLINK) {
		// is keystroke ESCAPE ?
		if (charCode === KeyEvent.DOM_VK_ESCAPE) {
			this.state = State.NORMAL;
			this.keyStrokeStack = [];
			removeYellowSelector();
		}
		// is keystroke part of the quicklink characterSet ?
		else if (_.contains([ KeyEvent.DOM_VK_A, KeyEvent.DOM_VK_C, KeyEvent.DOM_VK_D, KeyEvent.DOM_VK_E, KeyEvent.DOM_VK_F, KeyEvent.DOM_VK_G, KeyEvent.DOM_VK_H, KeyEvent.DOM_VK_J, KeyEvent.DOM_VK_K, KeyEvent.DOM_VK_L, KeyEvent.DOM_VK_M, KeyEvent.DOM_VK_P, KeyEvent.DOM_VK_S, KeyEvent.DOM_VK_W ], charCode)) {
			var newChar = String.fromCharCode(charCode);
			this.keyStrokeStack.push(newChar);
			// Attempt to select node	
			var linkLetters = this.keyStrokeStack.join("").toLowerCase();
			var query = String.interpolate(".quicklink.%@", linkLetters);
			var quicklink = $(query);

			// If selection exists grab
			if ($(quicklink).length) {
				this.state = State.NORMAL;
				var node = $(quicklink).parent().parent();
				this.keyStrokeStack = [];
				this.setCurrentNodeFromQuickLinkSelect(node);	
				this.state = State.NORMAL;
				removeYellowSelector();
			}
		}
		else {
			this.state = State.NORMAL;
			this.keyStrokeStack = [];
			removeYellowSelector();
		}
	}
	else if (this.state === State.NORMAL) {
		switch(charCode) {
			case KeyEvent.DOM_VK_F:
				this.state = State.QUICKLINK;
				showYellowSelector();
				break;
			case KeyEvent.DOM_VK_H:
				// Move to left node
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				if (this.currentNode.parent)
					this.setCurrentNodeFromDataStructureSelect(this.currentNode.parent);
				break;
			case KeyEvent.DOM_VK_I:
				// Insert node
				break;
			case KeyEvent.DOM_VK_J:
				// Move down node		
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				var parent = this.currentNode.parent;
				if (!parent)
					return;
				var childPosition = $.inArray(this.currentNode, parent.children);
				if (childPosition < parent.children.length - 1)
					this.setCurrentNodeFromDataStructureSelect(parent.children[childPosition + 1]);			 

				// TODO handle case where jumping from set of siblings to next set of siblings (cousins to the current set of siblings)

				break;
			case KeyEvent.DOM_VK_K:
				// Move up node
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				var parent = this.currentNode.parent;
				var childPosition = $.inArray(this.currentNode, parent.children);
				if (childPosition > 0)
					this.setCurrentNodeFromDataStructureSelect(parent.children[childPosition - 1]);
				// TODO handle case where jumping from set of siblings to next set of siblings (cousins to the current set of siblings)
				break;
			case KeyEvent.DOM_VK_L:
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
			case KeyEvent.DOM_VK_M:
				this.state = State.MENU;
				debugger
				showMenu();	
				// (Secondary) fold one level 
				break;	
			case KeyEvent.DOM_VK_O:
				if (this.subject === "")
					throw new Error("Subject not saved!");
				var selection = { "subject": this.subject, "object": this.currentNode.name };
				this.app.changeMode(Mode.OBJECT, selection);
				break;
			case KeyEvent.DOM_VK_P:
				this.app.changeMode(Mode.PROCESS);
				break;
			case KeyEvent.DOM_VK_R:
				// Unfold one level
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
			case KeyEvent.DOM_VK_ESCAPE:
				break;
			case KeyEvent.DOM_VK_RETURN: 
				// toggles children nodes
				var svgNode = this.getSVGFromNode(this.currentNode);
				d3.select(svgNode[0]).on("click")(d3.select(svgNode[0]).data()[0]);
				break;
			case KeyEvent.DOM_VK_COLON:
				this.state = State.COMMANDPROMPT;
				showCommandPrompt();
				break;
			default:
				console.log(String.interpolate("No handler for %@", charCode));
		}
	}
	else if (this.state === State.COMMANDPROMPT) {
		switch(charCode) {
			case KeyEvent.DOM_VK_ESCAPE:
				hideCommandPrompt();	
				this.state = State.NORMAL;
				break;
			case KeyEvent.DOM_VK_RETURN: 
				try {	
					this.processCommandPrompt();	
					hideCommandPrompt();
				}
				catch (error) { 
					console.log(error);
				}
				this.state = State.NORMAL;
				break;
			default:
		}
	}
	else if (this.state === State.MENU) {
		switch(charCode) {
			case KeyEvent.DOM_VK_A:
				showMenuPrompt("Enter node name");
				break;
			case KeyEvent.DOM_VK_C:
				// Copy node
				break;
			case KeyEvent.DOM_VK_D:
				// Delete node
				break;
			case KeyEvent.DOM_VK_N:
				showMenuPrompt("Enter Tree name");	
				break;	
			case KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;
				hideMenu();	
				break;
			case KeyEvent.DOM_VK_RETURN:
				var name = $("#menu-prompt").val();		
				this.addNewNode(name)
				hideMenu();	
				break;
			default:
				console.log(String.interpolate("No handler for %@", charCode));
		}
	}
}

TreeController.prototype.addNewNode = function(name) {
	if (name === "") {
		this.state = State.NORMAL;
		return;
	}
	this.state = State.NORMAL;

	var id = d3.selectAll(".node")[0].length + 1;
	var newNode = { name: name, depth: this.currentNode.depth+1, parent: this.currentNode, children: [] };
	// If current node has no array for it's children, give it one
	if (!this.currentNode.children)
		this.currentNode.children = [];
	this.currentNode.children.push(newNode);
	this.chart.update(this.chart.nodes());
}

TreeController.prototype.getSVGFromNode = function(node) {
	return $(String.interpolate(".node.%@", node.id));	
}

TreeController.prototype.getNodeFromSVG = function(svgNode) {
	// perform breath first search
	var id = parseInt( $(svgNode).attr("class").split(" ")[1] );
	var nodes = this.chart.nodes();
	var queue = [nodes];
	queue = queue.concat(nodes.children);

	while (queue.length > 0) {
		// check if node matches
		var node = queue.shift();
		if (node.id === id)
			return node;
		else {
			// if not and node has children, push them onto the queue 
			if (node.children)
				queue = queue.concat(node.children);
		}
	}
								
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
	
	// remove class "current" on current graphical representation of a node
	$("circle.current").attr("class", "");

	// add class "current" on the new current graphical representation of the node
	d3.select(svgNode[0]).select("circle")
				.attr("class", "current");
}

TreeController.prototype.processCommandPrompt = function() {
	// options 'w' write, 'x' write and close
	var commandArray = $("#command-prompt").val().split(" ");
	var option = commandArray[0].toLowerCase();
	var subjectFromCommandPrompt = commandArray[1] || "";
	var directory  = "";
	var file = "";

	if (!subjectFromCommandPrompt && !this.subject) {
		throw new Error("No file name");
	}

	var directory = subjectFromCommandPrompt ?  (PATH + subjectFromCommandPrompt + ".notes/") : (PATH + this.subject + ".notes/");
	var file = subjectFromCommandPrompt ? (directory + subjectFromCommandPrompt + ".json") : (directory + this.subject + ".json");

	// If app was called with subject, check this.file
	switch(option) {
		case "w":
			// 'w' was invoked with a subject, need to check if directory exists or has to be created 
			if (subjectFromCommandPrompt !== "") {
				this.subject = subjectFromCommandPrompt;
				// check if subject.notes directory exists
				if (fs.existsSync(directory)) {
					// directory exists, writing/overwriting to subject file
					writeToFile(file, this.chart.nodes());
				} else {
					// directory does not exist.  Creating directory then writing to file
					fs.mkdirSync(directory);
					writeToFile(file, this.chart.nodes());
				}	
			}
			else {
				// 'w' without subject but app was invoked with a subject that is a real file
				if (this.file !== null)	{
					writeToFile(file, this.chart.nodes() );
				} 
				// 'w' without subject but app was invoked with a subject that is yet to be written
			  else if (this.subject !== "") {
					if (fs.existsSync(directory)) {
						// directory exists, writing new file
						writeToFile(file, this.chart.nodes());
					} else {	
						// directory does not exist.  Creating directory then writing new file
						fs.mkdirSync(directory);		
						writeToFile(file, this.chart.nodes());
					}
				}
				else {
					throw new Error("No file name");
				}
			}
			break;
		case "x":
			if (subjectFromCommandPrompt !== "") {
				var file = PATH	+ subject + ".notes" + subject + ".json";
				writeToFile(file, this.chart.nodes());
				gui.App.quit();
			}
			else {
				if (this.file !== "") {
					writeToFile(file, this.chart.nodes());
					gui.App.quit();	
				}
				else
					throw new Error("No file name");
			}
			break;
		default:
			throw new Error("Unknown command");
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
		mode: Mode.TREE.toString(),
		options: ["(N)ew Tree", "(a)dd node", "(m)ove node", "(d)elete node", "(c)opy node"]
	};
	$("footer").html(footerTemplate(footerData));
	$("#mode-menu-container").show();
	$("#mode-menu").css("visibility", "visible");
}

function hideMenu() {
	$("#mode-menu-container").hide();
}

function showCommandPrompt() {
	$("#command-prompt").attr("disabled", false);
	$("#command-prompt").focus();
}

function hideCommandPrompt() {
	$("#command-prompt").text("");
	$("#command-prompt").attr("disabled", true);
}

function showMenuPrompt(prompt) {
	$("#mode-menu").css("visibility", "hidden");
	$("#menu-prompt").prop("disabled", false);
	$("#menu-prompt").attr("placeholder", "");
	$("#menu-prompt").focus();
}

function showYellowSelector() {
	// Clear all quicklinks
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
					// TODO clean this shit up, do I really need to insert html here?  Can't SVG elements be used instead?
					return "quicklink " + i + " " + stringNumberToHintString(i);
				})
				.text(function (d, i) {
					return stringNumberToHintString(i);
				});
 }

function removeYellowSelector() {
	d3.selectAll(".quicklink").classed({"hide": true});
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


//module.exports = TreeController;
