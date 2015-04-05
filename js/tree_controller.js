/* The value of Tree Mode is primarily from two scenarios.  The first is in information discovery.  When learning a new domain, new building blocks are discovered.
 * Capturing their existance is the first value.  Simply what is there.  Assembling their hierarchical relationship leads to the second value.  After a domain has
 * been forgotten in part or whole, rediscovering building blocks is easier when a logical path can be traced
 */

var TreeController = function(app) {
	this.app = app;
	this.chart = tree();
	this.state = State.NORMAL;	
	this.keyStrokeStack = [];
	this.currentNode = null;
};

var State = { 
	NORMAL: 0,
	MENU: 1,
	QUICKLINK: 2
};

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
									return d._children ? "lightsteelblue" : "#fff";
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

	return _chart;
}

TreeController.prototype.renderView = function(subject) {
	// Generate Mode Template
	var modeTemplate = Handlebars.templates.tree;
	var mainData = {
	};

	$("#mode-container").html(modeTemplate(mainData));

	// Generate Footer Template
	var footerTemplate = Handlebars.templates.footer;
	var footerData = {
		mode: Mode.TREE.toString(),
		options: ["(a)dd node", "(m)ove node", "(d)elete node", "(c)opy node"]
	};
	$("footer").html(footerTemplate(footerData));

	if (subject) {
		d3.json("./data/simple-flare.json", function (nodes) {
			this.chart.nodes(nodes).render();
		}.bind(this));
	}
	else {
		d3.json("./data/simple-flare.json", function (nodes) {
			this.chart.nodes(nodes).render();
	  }.bind(this))
	}

	// TODO replace this shitty solution with either a proper render complete callback or add promises 
	// TODO 	
	console.log("Setting root as current node");	
	setTimeout(function() {   //calls click event after a certain time
		this.currentNode = this.chart.nodes();
		var query = String.interpolate(".node.%@", this.chart.nodes().id);
		var rootNodeSVG = $(query);
		d3.select(rootNodeSVG[0]).select("circle")
			.attr("class", "current");
	}.bind(this), 500);	
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
				console.log("Moving to left (parent) node");

				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				if (this.currentNode.parent)
					this.setCurrentNodeFromDataStructureSelect(this.currentNode.parent);

				break;
			case KeyEvent.DOM_VK_I:
				// Insert node
				break;
			case KeyEvent.DOM_VK_J:
				// Move down node		
				console.log("Moving down one (sibling) node");
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				var parent = this.currentNode.parent;
				var childPosition = $.inArray(this.currentNode, parent.children);
				if (childPosition < parent.children.length - 1)
					this.setCurrentNodeFromDataStructureSelect(parent.children[childPosition + 1]);			 

				// TODO handle case where jumping from set of siblings to next set of siblings (cousins to the current set of siblings)

				break;
			case KeyEvent.DOM_VK_K:
				// Move up node
				console.log("Moving up one (sibling) node");
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				var parent = this.currentNode.parent;
				var childPosition = $.inArray(this.currentNode, parent.children);
				if (childPosition > 0)
					this.setCurrentNodeFromDataStructureSelect(parent.children[childPosition - 1]);
				
				// TODO handle case where jumping from set of siblings to next set of siblings (cousins to the current set of siblings)

				break;
			case KeyEvent.DOM_VK_L:
				// Move to right node
				console.log("Moving to right (child) node");
				// navigation here is based on this.currentNode, which is relative to the application tree datastructure and NOT the gui representation 
				
				// if the current node has children, move to the right and top (first child) and set as the new current node
				if (this.currentNode.children)				
					this.setCurrentNodeFromDataStructureSelect(this.currentNode.children[0]);		
				// if the current node does not have children, find the next sibling that does and move to the top most of its children
				else {
					
				}

				break;
			case KeyEvent.DOM_VK_M:
				this.state = State.MENU;
				this.app.toggleMenu();
				// (Secondary) fold one level 
				break;	
			case KeyEvent.DOM_VK_O:
				this.app.changeMode(Mode.OBJECT);
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
				d3.select(this.currentNode[0]).on("click")(d3.select(this.currentNode[0]).data()[0]);
				break;
			default:
				console.log(String.interpolate("No handler for %@", charCode));
		}
	}
	else if (this.state === State.MENU) {
		switch(charCode) {
			case KeyEvent.DOM_VK_A:
				// Add new node
				break;
			case KeyEvent.DOM_VK_C:
				// Copy node
				break;
			case KeyEvent.DOM_VK_D:
				// Delete node
				break;
			case KeyEvent.DOM_VK_ESCAPE:
				this.state = State.NORMAL;
				this.app.toggleMenu();	
				break;
			default:
				console.log(String.interpolate("No handler for %@", charCode));
		}
	}
}

TreeController.prototype.getNodeFromSVG = function(svgNode) {
	// map the svgNode to the actual JSON node in chart().nodes()
	
	return svgNode;	
}

TreeController.prototype.setCurrentNodeFromDataStructureSelect = function(newCurrentNode) {
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


//module.exports = TreeController;
