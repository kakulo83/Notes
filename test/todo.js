(function() {
	var TreeControllerTODO = "";
	_.each(Object.keys(TreeController.prototype), function(key) {
		TreeControllerTODO += TreeController.prototype[key].toString().match(/\/\/\s*TODO\s\b\w.*/);
	});
	TreeControllerTODO = TreeControllerTODO.replace(/null/g, "").split("\n");
	TreeControllerTODO = $.grep(TreeControllerTODO, function(n) { return (n) });

	console.log(TreeControllerTODO);

	_.each(TreeControllerTODO, function(todo) {
		var li = this.document.createElement("LI");
		$(li).text(todo);
		$("#todo").append(li);
	},this);

})();
