var assert = require("assert")

if (window.currentTest === "tree") {
	describe("Tree Interface", function() {
		var svg = $("svg");	

		it("SVG Tree exists in the DOM", function() {
			expect(svg).to.not.equal(null);	
		});
	})
}
