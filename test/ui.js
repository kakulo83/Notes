/*
assert.fail(actual, expected, message, operator)
assert(value[, message]), assert.ok(value[, message])
assert.equal(actual, expected[, message])
assert.notEqual(actual, expected[, message])
assert.deepEqual(actual, expected[, message])
assert.notDeepEqual(actual, expected[, message])
assert.strictEqual(actual, expected[, message])
assert.notStrictEqual(actual, expected[, message])
assert.throws(block[, error][, message])
assert.doesNotThrow(block[, message])
assert.ifError(value)
*/


var assert = require("assert")

describe("Array", function() {
	describe("#indexOf()", function() {
		it("should return -1 when the value is not present", function() {
			assert.equal(-1, [1,2,3].indexOf(5));
			assert.equal(-1, [1,2,3].indexOf(0));
		})
	})
})
