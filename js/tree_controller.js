var TreeController = function(app) {
	this.app = app;
	this.chart = tree();
	this.state = State.NORMAL;	
	this.keyStrokeStack = [];
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
			/*
			if (!_bodyG) {
					_bodyG = svg.append("g")
			.attr("class", "body")
			.attr("transform", function (d) {
				return "translate(" + _margins.left 
					+ "," + _margins.top + ")";
			});
			}
			*/

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
							.attr("class", "node")
							.attr("transform", function (d) {
									return "translate(" + source.y0 
					+ "," + source.x0 + ")";
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
									return "translate(" + source.y 
					+ "," + source.x + ")";
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
			/*
			if (!_svg) {
					_svg = d3.select("body").append("svg")
									.attr("height", _height)
									.attr("width", _width);
			}
			*/
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
		}.bind(this));
	}
}

TreeController.prototype.handleKeyPress = function(e) {
	var charCode = (typeof e.which == "number") ? e.which : e.keyCode;

	if (this.state === State.QUICKLINK) {
		debugger
		// is keystroke ESCAPE ?
		if (charCode === KeyEvent.DOM_VK_ESCAPE) {
			this.state = State.NORMAL;
			removeYellowSelector();
		}
		// is keystroke part of the characterSet ?
		else if (_.contains([KeyEvent.DOM_VK_S, KeyEvent.DOM_VK_D, KeyEvent.DOM_VK_F, KeyEvent.DOM_VK_J, KeyEvent.DOM_VK_K, KeyEvent.DOM_VK_L, KeyEvent.DOM_VK_E, KeyEvent.DOM_VK_W, KeyEvent.DOM_VK_CC, KeyEvent.DOM_VK_M, KeyEvent.DOM_VK_P, KeyEvent.DOM_VK_G, KeyEvent.DOM_VK_H ], charCode)) {
			var newChar = String.fromCharCode(charCode);
			this.keyStrokeStack.push(newChar);
			// Attempt to select node	
			debugger							
			if ( $(".quicklink[ ]") ) {
				// If selection exists grab
				var node = d3.select( );
				makeSelectedNodeActive(node);	
			}
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
				break;
			case KeyEvent.DOM_VK_I:
				// Insert node
				break;
			case KeyEvent.DOM_VK_J:
				// Move down node		
				break;
			case KeyEvent.DOM_VK_K:
				// Move up node
				break;
			case KeyEvent.DOM_VK_L:
				// Move to right node
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

function showYellowSelector() {
	var links = d3.selectAll(".quicklink");

	if ( ! links.empty() ) {
		$(".quicklink").removeClass("hide");
	}
	else {
		var nodes = d3.selectAll(".node");
		nodes.append("foreignObject")
			.attr("x", -10)
			.attr("y", -12)	
			.attr("width", 40)
			.attr("height",18)
			.append("xhtml:a")
				.attr("class", function(d, i) {
					return "quicklink " + i;
				})
				.text(function (d, i) {
					return stringNumberToHintString(i);
				});
	}
}

function removeYellowSelector() {
	d3.selectAll(".quicklink").classed({"hide": true});
}

function makeSelectedNodeActive() {
	d3.select(selected).select("circle").style("stroke", "red");	
}

//module.exports = TreeController;
