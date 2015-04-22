var assert = require("assert")

if (window.curentTest === "object") {
	describe("Object Interface", function() {

		var content = $(".content");
		
		it("There should be at least one content", function() {
			expect(content).to.not.equal(null);
		});
	})
}
